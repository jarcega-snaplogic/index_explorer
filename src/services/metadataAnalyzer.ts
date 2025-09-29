// Metadata analyzer service for comprehensive data profiling
// Because Jean-Claude delivers enterprise-grade analytics

import { DataTypeDetector, DataTypeAnalysis } from '../utils/dataTypeDetector';
import pineconeService from './pineconeService';

export interface MetadataKeyProfile {
  keyName: string;
  presence: number; // Percentage of documents containing this key
  dataTypeAnalysis: DataTypeAnalysis;
  sampleValues: any[];
  mostCommonValues: Array<{ value: any; count: number; percentage: number }>;
  uniqueValueCount: number;
  documentIds: string[]; // IDs of documents containing this key
}

export interface MetadataProfile {
  indexName: string;
  namespace: string;
  totalDocuments: number;
  analyzedDocuments: number;
  keyProfiles: MetadataKeyProfile[];
  generatedAt: string;
  analysisMetrics: {
    avgKeysPerDocument: number;
    minKeysPerDocument: number;
    maxKeysPerDocument: number;
    totalUniqueKeys: number;
    dataQualityScore: number;
  };
}

export class MetadataAnalyzer {

  async analyzeNamespaceMetadata(indexName: string, namespace: string = '', maxDocuments: number = 100): Promise<MetadataProfile> {
    console.log(`Starting metadata analysis for ${indexName}:${namespace || 'default'}`);

    // Fetch documents from the namespace
    const documents = await pineconeService.queryDocuments(indexName, {
      namespace,
      topK: maxDocuments, // Use the requested sample size
      includeMetadata: true,
      random: false // Get comprehensive sample, not random
    });

    console.log(`Analyzing metadata for ${documents.length} documents`);

    if (documents.length === 0) {
      throw new Error(`No documents found in namespace "${namespace}"`);
    }

    // Collect all metadata keys and their values
    const keyValueMap = new Map<string, Array<{ value: any; docId: string }>>();
    const documentKeyCounts = new Map<string, number>();

    documents.forEach(doc => {
      const metadata = doc.metadata || {};
      const docKeys = Object.keys(metadata);

      // Track keys per document for average calculation
      documentKeyCounts.set(doc.id, docKeys.length);

      docKeys.forEach(key => {
        if (!keyValueMap.has(key)) {
          keyValueMap.set(key, []);
        }
        keyValueMap.get(key)!.push({
          value: metadata[key],
          docId: doc.id
        });
      });
    });

    // Analyze each key
    const keyProfiles: MetadataKeyProfile[] = [];

    for (const [keyName, valueEntries] of keyValueMap.entries()) {
      console.log(`Analyzing key: ${keyName} (${valueEntries.length} values)`);

      const values = valueEntries.map(entry => entry.value);
      const documentIds = valueEntries.map(entry => entry.docId);

      // Calculate presence percentage
      const presence = (valueEntries.length / documents.length) * 100;

      // Analyze data type and statistics
      const dataTypeAnalysis = DataTypeDetector.analyzeValues(values);

      // Get sample values (random 10)
      const sampleValues = this.getSampleValues(values, 10);

      // Calculate most common values
      const mostCommonValues = this.getMostCommonValues(values, 10);

      const keyProfile: MetadataKeyProfile = {
        keyName,
        presence,
        dataTypeAnalysis,
        sampleValues,
        mostCommonValues,
        uniqueValueCount: new Set(values).size,
        documentIds
      };

      keyProfiles.push(keyProfile);
    }

    // Sort by presence (most common keys first)
    keyProfiles.sort((a, b) => b.presence - a.presence);

    // Calculate analysis metrics
    const totalKeyCounts = Array.from(documentKeyCounts.values());
    const avgKeysPerDocument = totalKeyCounts.reduce((sum, count) => sum + count, 0) / totalKeyCounts.length;
    const minKeysPerDocument = totalKeyCounts.length > 0 ? Math.min(...totalKeyCounts) : 0;
    const maxKeysPerDocument = totalKeyCounts.length > 0 ? Math.max(...totalKeyCounts) : 0;
    const totalUniqueKeys = keyValueMap.size;

    // Data quality score based on completeness and consistency
    const avgCompleteness = keyProfiles.reduce((sum, key) => sum + key.dataTypeAnalysis.statistics.completeness, 0) / keyProfiles.length;
    const avgConfidence = keyProfiles.reduce((sum, key) => sum + key.dataTypeAnalysis.confidence, 0) / keyProfiles.length;
    const dataQualityScore = (avgCompleteness + avgConfidence) / 2;

    const profile: MetadataProfile = {
      indexName,
      namespace: namespace || 'default',
      totalDocuments: documents.length,
      analyzedDocuments: documents.length,
      keyProfiles,
      generatedAt: new Date().toISOString(),
      analysisMetrics: {
        avgKeysPerDocument: Math.round(avgKeysPerDocument * 100) / 100,
        minKeysPerDocument,
        maxKeysPerDocument,
        totalUniqueKeys,
        dataQualityScore: Math.round(dataQualityScore * 100) / 100
      }
    };

    console.log(`Metadata analysis complete: ${totalUniqueKeys} unique keys, ${dataQualityScore}% quality score`);
    return profile;
  }

  private getSampleValues(values: any[], count: number): any[] {
    const shuffled = [...values].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private getMostCommonValues(values: any[], count: number): Array<{ value: any; count: number; percentage: number }> {
    const valueFrequency = new Map<any, number>();

    values.forEach(value => {
      const key = typeof value === 'object' ? JSON.stringify(value) : value;
      valueFrequency.set(key, (valueFrequency.get(key) || 0) + 1);
    });

    const sorted = Array.from(valueFrequency.entries())
      .map(([value, count]) => ({
        value: value,
        count,
        percentage: Math.round((count / values.length) * 10000) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);

    return sorted;
  }

  // Get documents that contain a specific metadata key
  async getDocumentsWithKey(indexName: string, namespace: string, keyName: string): Promise<string[]> {
    const documents = await pineconeService.queryDocuments(indexName, {
      namespace,
      topK: 100, // Limited sample to find docs with this key
      includeMetadata: true,
      random: false
    });

    return documents
      .filter(doc => doc.metadata && keyName in doc.metadata)
      .map(doc => doc.id);
  }

  // Delete all documents that contain a specific metadata key
  async deleteDocumentsWithKey(indexName: string, namespace: string, keyName: string): Promise<{ success: boolean; deletedCount: number }> {
    console.log(`Finding documents with key "${keyName}" for deletion...`);

    const documentIds = await this.getDocumentsWithKey(indexName, namespace, keyName);

    if (documentIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    console.log(`Deleting ${documentIds.length} documents with key "${keyName}"`);

    try {
      await pineconeService.deleteMany(indexName, documentIds, namespace);
      return { success: true, deletedCount: documentIds.length };
    } catch (error) {
      console.error('Failed to delete documents:', error);
      throw new Error(`Failed to delete documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default new MetadataAnalyzer();