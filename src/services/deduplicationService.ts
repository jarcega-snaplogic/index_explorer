// Deduplication service for metadata-based duplicate detection
// Jean-Claude's enterprise-grade duplicate elimination system

import { RecordMetadata } from '@pinecone-database/pinecone';
import pineconeService from './pineconeService';

export interface DuplicateGroup {
  id: string;
  similarityScore: number;
  documents: Array<{
    id: string;
    metadata: RecordMetadata;
    lastModified?: string;
  }>;
  recommendedAction: 'keep-first' | 'keep-newest' | 'manual-review';
  reason: string;
  matchingFields: string[];
}

export interface DuplicationAnalysis {
  indexName: string;
  namespace: string;
  totalDocuments: number;
  duplicateGroups: DuplicateGroup[];
  potentialSavings: {
    documentsToDelete: number;
    estimatedStorageSaved: string;
  };
  processingTime: number;
  analysisMetrics: {
    exactMatches: number;
    fuzzyMatches: number;
    uniqueDocuments: number;
  };
}

export interface DeletionResult {
  success: boolean;
  deletedGroups: number;
  deletedDocuments: number;
  errors: string[];
  auditTrail: Array<{
    groupId: string;
    deletedIds: string[];
    keptId: string;
    reason: string;
    timestamp: string;
  }>;
}

export interface DeduplicationOptions {
  similarity: 'exact' | 'fuzzy' | 'custom';
  threshold?: number; // 0-100, default 85 for fuzzy
  includeKeys?: string[]; // Only compare these keys
  excludeKeys?: string[]; // Skip these keys
  maxDocuments?: number; // Limit analysis scope
  strategy: 'keep-first' | 'keep-newest' | 'manual';
}

export class DeduplicationService {

  /**
   * Find metadata duplicates in a namespace
   */
  async findMetadataDuplicates(
    indexName: string,
    namespace: string = '',
    options: DeduplicationOptions
  ): Promise<DuplicationAnalysis> {
    const startTime = Date.now();

    console.log(`🔍 Starting duplicate analysis for ${indexName}:${namespace || 'default'}`);

    // Fetch documents from the namespace
    const documents = await pineconeService.queryDocuments(indexName, {
      namespace,
      topK: options.maxDocuments || 1000,
      includeMetadata: true,
      random: false
    });

    console.log(`Analyzing ${documents.length} documents for duplicates`);

    if (documents.length === 0) {
      throw new Error(`No documents found in namespace "${namespace}"`);
    }

    // Group documents by metadata similarity
    const duplicateGroups = this.identifyDuplicateGroups(documents, options);

    // Calculate metrics
    const exactMatches = duplicateGroups.filter(g => g.similarityScore >= 99.9).length;
    const fuzzyMatches = duplicateGroups.filter(g => g.similarityScore < 99.9).length;
    const documentsInGroups = duplicateGroups.reduce((sum, group) => sum + group.documents.length, 0);
    const documentsToDelete = duplicateGroups.reduce((sum, group) => sum + (group.documents.length - 1), 0);

    const processingTime = Date.now() - startTime;

    const analysis: DuplicationAnalysis = {
      indexName,
      namespace: namespace || 'default',
      totalDocuments: documents.length,
      duplicateGroups,
      potentialSavings: {
        documentsToDelete,
        estimatedStorageSaved: this.estimateStorageSavings(documentsToDelete)
      },
      processingTime,
      analysisMetrics: {
        exactMatches,
        fuzzyMatches,
        uniqueDocuments: documents.length - documentsInGroups
      }
    };

    console.log(`Duplicate analysis complete: ${duplicateGroups.length} duplicate groups found in ${processingTime}ms`);
    return analysis;
  }

  /**
   * Delete duplicates based on strategy
   */
  async deleteDuplicates(
    indexName: string,
    duplicateGroups: DuplicateGroup[],
    namespace: string = ''
  ): Promise<DeletionResult> {
    const auditTrail: DeletionResult['auditTrail'] = [];
    const errors: string[] = [];
    let totalDeleted = 0;

    console.log(`🗑️ Starting deletion of ${duplicateGroups.length} duplicate groups`);

    for (const group of duplicateGroups) {
      try {
        const { toKeep, toDelete } = this.selectDocumentsForDeletion(group);

        if (toDelete.length > 0) {
          // Delete the duplicates
          const deleteResult = await pineconeService.deleteMany(indexName, toDelete, namespace);

          if (deleteResult.success) {
            totalDeleted += toDelete.length;

            auditTrail.push({
              groupId: group.id,
              deletedIds: toDelete,
              keptId: toKeep,
              reason: group.reason,
              timestamp: new Date().toISOString()
            });
          } else {
            errors.push(`Failed to delete group ${group.id}: Delete operation failed`);
          }
        }
      } catch (error: any) {
        errors.push(`Error processing group ${group.id}: ${error.message}`);
      }
    }

    const result: DeletionResult = {
      success: errors.length === 0,
      deletedGroups: auditTrail.length,
      deletedDocuments: totalDeleted,
      errors,
      auditTrail
    };

    console.log(`Deletion complete: ${totalDeleted} documents deleted, ${errors.length} errors`);
    return result;
  }

  /**
   * Identify groups of duplicate documents
   */
  private identifyDuplicateGroups(
    documents: Array<{ id: string; metadata: any }>,
    options: DeduplicationOptions
  ): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < documents.length; i++) {
      if (processed.has(documents[i].id)) continue;

      const candidateGroup = [documents[i]];
      processed.add(documents[i].id);

      // Find similar documents
      for (let j = i + 1; j < documents.length; j++) {
        if (processed.has(documents[j].id)) continue;

        const similarity = this.calculateMetadataSimilarity(
          documents[i].metadata,
          documents[j].metadata,
          options
        );

        if (similarity.score >= (options.threshold || 85)) {
          candidateGroup.push(documents[j]);
          processed.add(documents[j].id);
        }
      }

      // Create group if duplicates found
      if (candidateGroup.length > 1) {
        const similarity = this.calculateMetadataSimilarity(
          candidateGroup[0].metadata,
          candidateGroup[1].metadata,
          options
        );

        groups.push({
          id: `group-${groups.length + 1}`,
          similarityScore: similarity.score,
          documents: candidateGroup.map(doc => ({
            id: doc.id,
            metadata: doc.metadata,
            lastModified: doc.metadata.lastModified || doc.metadata.timestamp
          })),
          recommendedAction: this.determineRecommendedAction(candidateGroup, options.strategy),
          reason: similarity.reason,
          matchingFields: similarity.matchingFields
        });
      }
    }

    // Sort by similarity score (highest first)
    return groups.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Calculate similarity between two metadata objects
   */
  private calculateMetadataSimilarity(
    metadata1: any,
    metadata2: any,
    options: DeduplicationOptions
  ): { score: number; reason: string; matchingFields: string[] } {

    // Exact match check
    if (JSON.stringify(metadata1) === JSON.stringify(metadata2)) {
      return {
        score: 100,
        reason: 'Exact metadata match',
        matchingFields: Object.keys(metadata1)
      };
    }

    if (options.similarity === 'exact') {
      return { score: 0, reason: 'No exact match', matchingFields: [] };
    }

    // Fuzzy/custom similarity
    const keys1 = Object.keys(metadata1);
    const keys2 = Object.keys(metadata2);
    const allKeys = new Set([...keys1, ...keys2]);

    // Apply include/exclude filters
    const keysToCompare = Array.from(allKeys).filter(key => {
      if (options.includeKeys && !options.includeKeys.includes(key)) return false;
      if (options.excludeKeys && options.excludeKeys.includes(key)) return false;
      return true;
    });

    if (keysToCompare.length === 0) {
      return { score: 0, reason: 'No comparable fields', matchingFields: [] };
    }

    let totalScore = 0;
    const matchingFields: string[] = [];

    for (const key of keysToCompare) {
      const value1 = metadata1[key];
      const value2 = metadata2[key];

      const fieldScore = this.compareFieldValues(value1, value2, key);
      totalScore += fieldScore;

      if (fieldScore > 80) { // Consider it a match if > 80%
        matchingFields.push(key);
      }
    }

    const averageScore = totalScore / keysToCompare.length;

    return {
      score: Math.round(averageScore * 100) / 100,
      reason: this.generateSimilarityReason(averageScore, matchingFields),
      matchingFields
    };
  }

  /**
   * Compare individual field values
   */
  private compareFieldValues(value1: any, value2: any, fieldName: string): number {
    if (value1 === value2) return 100;
    if (value1 == null || value2 == null) return value1 === value2 ? 100 : 0;

    const type1 = typeof value1;
    const type2 = typeof value2;

    if (type1 !== type2) return 0;

    if (type1 === 'string') {
      return this.compareStrings(value1, value2, fieldName);
    } else if (type1 === 'number') {
      return this.compareNumbers(value1, value2);
    } else if (type1 === 'object') {
      return this.compareObjects(value1, value2);
    }

    return 0;
  }

  /**
   * Smart string comparison with field-specific logic
   */
  private compareStrings(str1: string, str2: string, fieldName: string): number {
    if (str1 === str2) return 100;

    // URL comparison (ignore query parameters for some fields)
    if (fieldName.toLowerCase().includes('url') || fieldName.toLowerCase().includes('link')) {
      const url1 = str1.split('?')[0];
      const url2 = str2.split('?')[0];
      if (url1 === url2) return 95;
    }

    // File name comparison (ignore extensions for some cases)
    if (fieldName.toLowerCase().includes('file') || fieldName.toLowerCase().includes('name')) {
      const name1 = str1.split('.')[0];
      const name2 = str2.split('.')[0];
      if (name1 === name2) return 90;
    }

    // Date string normalization
    if (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('time')) {
      try {
        const date1 = new Date(str1).getTime();
        const date2 = new Date(str2).getTime();
        if (date1 === date2) return 100;
      } catch (e) {
        // Not valid dates, continue with string comparison
      }
    }

    // Basic string similarity (Levenshtein-based)
    return this.calculateStringSimilarity(str1, str2);
  }

  /**
   * Simple string similarity calculation
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 100;

    const distance = this.levenshteinDistance(str1, str2);
    return Math.round(((longer.length - distance) / longer.length) * 100);
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Compare numeric values
   */
  private compareNumbers(num1: number, num2: number): number {
    if (num1 === num2) return 100;

    const diff = Math.abs(num1 - num2);
    const avg = (num1 + num2) / 2;

    if (avg === 0) return diff === 0 ? 100 : 0;

    const percentDiff = (diff / avg) * 100;
    return Math.max(0, 100 - percentDiff);
  }

  /**
   * Compare object values
   */
  private compareObjects(obj1: any, obj2: any): number {
    try {
      return JSON.stringify(obj1) === JSON.stringify(obj2) ? 100 : 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Generate human-readable similarity reason
   */
  private generateSimilarityReason(score: number, matchingFields: string[]): string {
    if (score >= 95) return `Near-exact match on ${matchingFields.length} fields`;
    if (score >= 85) return `High similarity on fields: ${matchingFields.slice(0, 3).join(', ')}`;
    if (score >= 70) return `Moderate similarity on ${matchingFields.length} fields`;
    return `Low similarity detected`;
  }

  /**
   * Determine recommended action for a duplicate group
   */
  private determineRecommendedAction(
    documents: Array<{ id: string; metadata: any }>,
    strategy: string
  ): 'keep-first' | 'keep-newest' | 'manual-review' {
    if (strategy === 'manual') return 'manual-review';
    if (strategy === 'keep-first') return 'keep-first';

    // For keep-newest, check if we have timestamp information
    const hasTimestamps = documents.some(doc =>
      doc.metadata.lastModified || doc.metadata.timestamp || doc.metadata.created
    );

    return hasTimestamps ? 'keep-newest' : 'keep-first';
  }

  /**
   * Select which documents to keep vs delete
   */
  private selectDocumentsForDeletion(group: DuplicateGroup): { toKeep: string; toDelete: string[] } {
    if (group.documents.length <= 1) {
      return { toKeep: group.documents[0].id, toDelete: [] };
    }

    let keepIndex = 0;

    if (group.recommendedAction === 'keep-newest') {
      // Find the newest document
      let newestTime = 0;
      for (let i = 0; i < group.documents.length; i++) {
        const doc = group.documents[i];
        const timestamp = doc.metadata.lastModified || doc.metadata.timestamp || doc.metadata.created;
        if (timestamp && (typeof timestamp === 'string' || typeof timestamp === 'number')) {
          const time = new Date(timestamp).getTime();
          if (time > newestTime) {
            newestTime = time;
            keepIndex = i;
          }
        }
      }
    }
    // For 'keep-first' and 'manual-review', use first document (index 0)

    const toKeep = group.documents[keepIndex].id;
    const toDelete = group.documents
      .filter((_, i) => i !== keepIndex)
      .map(doc => doc.id);

    return { toKeep, toDelete };
  }

  /**
   * Estimate storage savings from deletion
   */
  private estimateStorageSavings(documentsToDelete: number): string {
    // Rough estimate: assume average document size
    const avgDocSizeKB = 2; // Conservative estimate for metadata + vector
    const totalSizeKB = documentsToDelete * avgDocSizeKB;

    if (totalSizeKB < 1024) {
      return `~${totalSizeKB} KB`;
    } else if (totalSizeKB < 1024 * 1024) {
      return `~${Math.round(totalSizeKB / 1024)} MB`;
    } else {
      return `~${Math.round(totalSizeKB / (1024 * 1024))} GB`;
    }
  }
}

export default new DeduplicationService();