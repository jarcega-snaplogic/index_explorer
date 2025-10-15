import pinecone from '../utils/pineconeClient';
import { Index, RecordMetadata } from '@pinecone-database/pinecone';

// The service that actually does the work while others take credit
export class PineconeService {
  private indexCache: Map<string, Index<RecordMetadata>> = new Map();

  async listIndexes() {
    try {
      const indexes = await pinecone.listIndexes();
      console.log(`Found ${indexes.indexes?.length || 0} indexes. More than expected honestly.`);
      return indexes;
    } catch (error) {
      console.error('Failed to list indexes:', error);
      throw new Error('Cannot list indexes. Pinecone is probably having a moment.');
    }
  }

  async getIndex(indexName: string): Promise<Index<RecordMetadata>> {
    if (!this.indexCache.has(indexName)) {
      const index = pinecone.index(indexName);
      this.indexCache.set(indexName, index);
    }
    return this.indexCache.get(indexName)!;
  }

  async getIndexStats(indexName: string) {
    try {
      const index = await this.getIndex(indexName);
      const stats = await index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error(`Failed to get stats for index ${indexName}:`, error);
      throw new Error(`Cannot get stats. Index "${indexName}" is being difficult.`);
    }
  }

  async queryDocuments(indexName: string, options: {
    namespace?: string;
    topK?: number;
    includeMetadata?: boolean;
    includeValues?: boolean;
    filter?: any;
    random?: boolean;
  } = {}) {
    try {
      const index = await this.getIndex(indexName);
      const limit = options.topK || 5; // Default to 5 documents
      const useRandom = options.random !== false; // Default to random sampling

      console.log(`Using proper listPaginated API for serverless index: ${indexName}`);

      // Use the proper listPaginated API for serverless indexes
      const namespace = options.namespace || '';
      const indexNamespace = index.namespace(namespace);

      // Pinecone listPaginated API has a hard limit of 100 per call
      // For larger requests, we need to make multiple API calls
      const maxPerCall = 100;
      const targetLimit = Math.min(limit, 10000); // Cap at 10k for performance
      let allVectorObjects: any[] = [];
      let paginationToken: string | undefined;

      // Make multiple API calls to get the requested number of documents
      while (allVectorObjects.length < targetLimit) {
        const remaining = targetLimit - allVectorObjects.length;
        const batchSize = Math.min(remaining, maxPerCall);

        const listResult = await indexNamespace.listPaginated({
          limit: batchSize,
          paginationToken
        });

        const batchVectors = listResult.vectors || [];
        allVectorObjects.push(...batchVectors);

        paginationToken = listResult.pagination?.next;

        // Break if no more results available
        if (!paginationToken || batchVectors.length === 0) {
          break;
        }
      }

      const vectorObjects = allVectorObjects;

      if (vectorObjects.length === 0) {
        console.log(`No vector IDs found in ${indexName} ${options.namespace ? `namespace: ${options.namespace}` : '(no namespace)'}`);
        return [];
      }

      // Extract just the ID strings from the vector objects
      let vectorIds = vectorObjects.map((vector: any) => vector.id);

      // If random sampling is enabled and we have more IDs than needed
      if (useRandom && vectorIds.length > limit) {
        // Randomly shuffle and pick the requested number
        const shuffled = vectorIds.sort(() => Math.random() - 0.5);
        vectorIds = shuffled.slice(0, limit);
        console.log(`Randomly selected ${limit} documents from ${vectorObjects.length} available`);
      } else {
        vectorIds = vectorIds.slice(0, limit);
      }

      console.log(`Fetching metadata for ${vectorIds.length} documents...`);

      // Fetch metadata in batches to avoid "URI too long" errors
      // The Pinecone fetch API has URL length limits when fetching many IDs
      const batchSize = 50; // Conservative batch size to avoid URL length issues
      let allVectors: { [key: string]: any } = {};

      for (let i = 0; i < vectorIds.length; i += batchSize) {
        const batch = vectorIds.slice(i, i + batchSize);
        const batchResult = await indexNamespace.fetch(batch);
        const batchVectors = batchResult.records || {};

        // Merge results
        allVectors = { ...allVectors, ...batchVectors };
      }

      const vectors = allVectors;

      // Convert to the same format as query results for compatibility
      const results = Object.entries(vectors).map(([id, vector]: [string, any]) => ({
        id: id,
        score: 1.0, // Not applicable for list/fetch, but keeping for compatibility
        metadata: vector.metadata || {},
        values: options.includeValues ? vector.values : []
      }));

      console.log(`Successfully fetched ${results.length} documents from ${indexName}`);
      return results;

    } catch (error: any) {
      console.error(`Failed to list documents in ${indexName}:`, error);
      throw new Error(`Cannot list documents. The list API is having trouble: ${error.message}`);
    }
  }


  async deleteDocument(indexName: string, id: string, namespace?: string) {
    try {
      const index = await this.getIndex(indexName);
      await index.namespace(namespace || '').deleteOne(id);
      console.log(`Deleted document ${id}. It's gone. Forever. Hope that was intentional.`);
      return { success: true, deletedId: id };
    } catch (error) {
      console.error(`Failed to delete document ${id}:`, error);
      throw new Error('Delete failed. The document is fighting back.');
    }
  }

  async deleteMany(indexName: string, ids: string[], namespace?: string) {
    try {
      const index = await this.getIndex(indexName);
      await index.namespace(namespace || '').deleteMany(ids);
      console.log(`Deleted ${ids.length} documents. Mass destruction complete.`);
      return { success: true, deletedCount: ids.length };
    } catch (error) {
      console.error('Failed to delete multiple documents:', error);
      throw error;
    }
  }

  async updateMetadata(indexName: string, id: string, metadata: RecordMetadata, namespace?: string) {
    try {
      const index = await this.getIndex(indexName);

      // Pinecone requires we fetch the vector first, then update with it
      // Because of course it does...
      const fetchResult = await index.namespace(namespace || '').fetch([id]);
      const record = fetchResult.records[id];

      if (!record) {
        throw new Error(`Document ${id} not found. Can't update what doesn't exist.`);
      }

      await index.namespace(namespace || '').update({
        id: id,
        metadata: metadata
      });

      console.log(`Updated metadata for ${id}. It's slightly less wrong now.`);
      return { success: true, updatedId: id };
    } catch (error) {
      console.error(`Failed to update metadata for ${id}:`, error);
      throw error;
    }
  }

  async findDuplicates(indexName: string, _threshold: number = 0.99, namespace?: string) {
    try {
      // This is a simplified duplicate detection
      // In production, you'd want to do this in batches with proper vector comparison
      const documents = await this.queryDocuments(indexName, {
        namespace,
        topK: 1000,
        includeMetadata: true
      });

      const duplicates: Array<{ids: string[], metadata: any}> = [];
      const processed = new Set<string>();

      // Group by metadata similarity (simplified)
      for (const doc of documents) {
        if (processed.has(doc.id)) continue;

        const similar = documents.filter(d =>
          d.id !== doc.id &&
          !processed.has(d.id) &&
          JSON.stringify(d.metadata) === JSON.stringify(doc.metadata)
        );

        if (similar.length > 0) {
          duplicates.push({
            ids: [doc.id, ...similar.map(s => s.id)],
            metadata: doc.metadata
          });
          processed.add(doc.id);
          similar.forEach(s => processed.add(s.id));
        }
      }

      console.log(`Found ${duplicates.length} duplicate groups. Spring cleaning time!`);
      return duplicates;
    } catch (error) {
      console.error('Failed to find duplicates:', error);
      throw error;
    }
  }
}

export default new PineconeService();