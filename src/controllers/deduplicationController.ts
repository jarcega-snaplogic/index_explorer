// Deduplication controller - REST API endpoints for duplicate management
// Jean-Claude's comprehensive duplicate elimination endpoints

import { Request, Response } from 'express';
import deduplicationService from '../services/deduplicationService';

// Helper function to normalize namespace ("default" string or empty -> empty string)
const normalizeNamespace = (namespace: any): string => {
  if (!namespace || namespace === 'default') return '';
  return namespace as string;
};

export const analyzeForDuplicates = async (req: Request, res: Response) => {
  try {
    const { indexName } = req.params;
    const {
      namespace,
      similarity = 'fuzzy',
      threshold = 85,
      includeKeys,
      excludeKeys,
      maxDocuments = 1000,
      strategy = 'keep-first'
    } = req.query;

    console.log(`🔍 Duplicate analysis request for ${indexName}:${(normalizeNamespace(namespace) || '(no namespace)')}`);

    // Parse array parameters if provided
    const parseArrayParam = (param: any): string[] | undefined => {
      if (!param) return undefined;
      if (typeof param === 'string') return param.split(',').map(s => s.trim());
      if (Array.isArray(param)) return param;
      return undefined;
    };

    const options = {
      similarity: similarity as 'exact' | 'fuzzy' | 'custom',
      threshold: parseInt(threshold as string),
      includeKeys: parseArrayParam(includeKeys),
      excludeKeys: parseArrayParam(excludeKeys),
      maxDocuments: parseInt(maxDocuments as string),
      strategy: strategy as 'keep-first' | 'keep-newest' | 'manual'
    };

    const analysis = await deduplicationService.findMetadataDuplicates(
      indexName,
      normalizeNamespace(namespace),
      options
    );

    res.json({
      success: true,
      data: analysis,
      message: `Found ${analysis.duplicateGroups.length} duplicate groups in ${analysis.totalDocuments} documents`
    });

  } catch (error: any) {
    console.error('Duplicate analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Duplicate analysis failed. Jean-Claude is investigating the metadata...'
    });
  }
};

export const previewDuplicates = async (req: Request, res: Response) => {
  try {
    const { indexName } = req.params;
    const { namespace, groupId } = req.query;

    console.log(`👀 Duplicate preview request for group ${groupId} in ${indexName}`);

    // This endpoint could be used to get detailed preview of specific duplicate groups
    // For now, we'll return a simple response as the main analysis already provides preview data

    res.json({
      success: true,
      data: {
        message: 'Duplicate preview data is included in the analysis response',
        groupId: groupId || 'all',
        indexName,
        namespace: (normalizeNamespace(namespace) || '(no namespace)')
      },
      message: 'Preview data available in analysis results'
    });

  } catch (error: any) {
    console.error('Duplicate preview failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to preview duplicates'
    });
  }
};

export const deleteDuplicates = async (req: Request, res: Response) => {
  try {
    const { indexName } = req.params;
    const { namespace } = req.query;
    const { duplicateGroups, confirmDeletion } = req.body;

    console.log(`🗑️ Duplicate deletion request for ${indexName}:${(normalizeNamespace(namespace) || '(no namespace)')}`);

    // Safety check - require explicit confirmation
    if (!confirmDeletion) {
      res.status(400).json({
        success: false,
        error: 'Deletion confirmation required',
        message: 'You must explicitly confirm deletion by setting confirmDeletion: true'
      });
      return;
    }

    // Validate duplicate groups data
    if (!duplicateGroups || !Array.isArray(duplicateGroups) || duplicateGroups.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid duplicate groups data',
        message: 'Please provide valid duplicate groups to delete'
      });
      return;
    }

    // Validate that each group has the required structure
    for (const group of duplicateGroups) {
      if (!group.id || !group.documents || !Array.isArray(group.documents)) {
        res.status(400).json({
          success: false,
          error: 'Invalid duplicate group structure',
          message: `Group ${group.id || 'unknown'} is missing required fields`
        });
        return;
      }
    }

    console.log(`Deleting ${duplicateGroups.length} duplicate groups...`);

    const deletionResult = await deduplicationService.deleteDuplicates(
      indexName,
      duplicateGroups,
      normalizeNamespace(namespace)
    );

    res.json({
      success: deletionResult.success,
      data: deletionResult,
      message: deletionResult.success
        ? `Successfully deleted ${deletionResult.deletedDocuments} duplicate documents in ${deletionResult.deletedGroups} groups`
        : `Deletion completed with ${deletionResult.errors.length} errors. ${deletionResult.deletedDocuments} documents deleted.`
    });

  } catch (error: any) {
    console.error('Duplicate deletion failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Duplicate deletion failed. Your data is safe, but Jean-Claude is investigating...'
    });
  }
};

export const getDuplicationReport = async (req: Request, res: Response) => {
  try {
    const { indexName } = req.params;
    const { namespace, format = 'json' } = req.query;

    console.log(`📊 Deduplication report request for ${indexName}:${(normalizeNamespace(namespace) || '(no namespace)')}`);

    // This could be expanded to generate comprehensive reports
    // For now, return basic metrics that could be gathered from previous analyses

    const reportData = {
      indexName,
      namespace: (normalizeNamespace(namespace) || '(no namespace)'),
      reportType: 'deduplication-summary',
      generatedAt: new Date().toISOString(),
      summary: {
        message: 'Use the analyze endpoint to generate detailed duplication analysis',
        supportedFormats: ['json'],
        recommendations: [
          'Run duplicate analysis regularly to maintain data quality',
          'Use exact matching for high-confidence duplicate removal',
          'Preview duplicates before deletion to avoid data loss',
          'Keep audit trails for compliance and debugging'
        ]
      }
    };

    if (format === 'json') {
      res.json({
        success: true,
        data: reportData,
        message: 'Deduplication report generated'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported format',
        message: 'Currently only JSON format is supported'
      });
    }

  } catch (error: any) {
    console.error('Report generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate deduplication report'
    });
  }
};