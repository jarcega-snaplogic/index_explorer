import { Request, Response } from 'express';
import pineconeService from '../services/pineconeService';

export class IndexController {
  async listIndexes(_req: Request, res: Response) {
    try {
      const indexes = await pineconeService.listIndexes();
      res.json({
        success: true,
        data: indexes,
        message: 'Found some indexes. Miracle.'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list indexes'
      });
    }
  }

  async getIndexStats(req: Request, res: Response) {
    try {
      const { indexName } = req.params;
      const stats = await pineconeService.getIndexStats(indexName);
      res.json({
        success: true,
        data: stats,
        message: `Stats for ${indexName}. Fascinating stuff.`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get index stats'
      });
    }
  }

  async queryDocuments(req: Request, res: Response) {
    try {
      const { indexName } = req.params;
      const { namespace, topK, filter } = req.query;

      const documents = await pineconeService.queryDocuments(indexName, {
        namespace: namespace as string,
        topK: topK ? parseInt(topK as string) : 100,
        includeMetadata: true,
        filter: filter ? JSON.parse(filter as string) : undefined
      });

      res.json({
        success: true,
        data: documents,
        total: documents.length,
        message: `Found ${documents.length} documents. Some might even be useful.`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to query documents'
      });
    }
  }

  async deleteDocument(req: Request, res: Response) {
    try {
      const { indexName, documentId } = req.params;
      const { namespace } = req.query;

      const result = await pineconeService.deleteDocument(
        indexName,
        documentId,
        namespace as string
      );

      res.json({
        success: true,
        data: result,
        message: 'Document deleted. Hope that was the right one.'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete document'
      });
    }
  }

  async deleteMany(req: Request, res: Response) {
    try {
      const { indexName } = req.params;
      const { ids, namespace } = req.body;

      if (!ids || !Array.isArray(ids)) {
        res.status(400).json({
          success: false,
          error: 'ids must be an array'
        });
        return;
      }

      const result = await pineconeService.deleteMany(indexName, ids, namespace);

      res.json({
        success: true,
        data: result,
        message: `Deleted ${ids.length} documents. Mass destruction achieved.`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete documents'
      });
    }
  }

  async updateMetadata(req: Request, res: Response) {
    try {
      const { indexName, documentId } = req.params;
      const { metadata, namespace } = req.body;

      if (!metadata) {
        res.status(400).json({
          success: false,
          error: 'metadata is required'
        });
        return;
      }

      const result = await pineconeService.updateMetadata(
        indexName,
        documentId,
        metadata,
        namespace
      );

      res.json({
        success: true,
        data: result,
        message: 'Metadata updated. It\'s slightly less wrong now.'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update metadata'
      });
    }
  }

  async findDuplicates(req: Request, res: Response) {
    try {
      const { indexName } = req.params;
      const { namespace, threshold } = req.query;

      const duplicates = await pineconeService.findDuplicates(
        indexName,
        threshold ? parseFloat(threshold as string) : 0.99,
        namespace as string
      );

      res.json({
        success: true,
        data: duplicates,
        total: duplicates.length,
        message: `Found ${duplicates.length} duplicate groups. Time for spring cleaning!`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to find duplicates'
      });
    }
  }
}

export default new IndexController();