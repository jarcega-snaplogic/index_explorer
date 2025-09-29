// Metadata analysis API controller
// Jean-Claude's enterprise-grade metadata profiling endpoints

import { Request, Response } from 'express';
import metadataAnalyzer from '../services/metadataAnalyzer';
import pineconeService from '../services/pineconeService';

export const analyzeMetadata = async (req: Request, res: Response) => {
  try {
    const { indexName } = req.params;
    const { namespace, maxDocuments } = req.query;

    console.log(`📊 Metadata analysis request for ${indexName}:${namespace || 'default'}`);

    const profile = await metadataAnalyzer.analyzeNamespaceMetadata(
      indexName,
      namespace as string || '',
      parseInt(maxDocuments as string) || 100
    );

    res.json({
      success: true,
      data: profile,
      message: `Analyzed ${profile.analysisMetrics.totalUniqueKeys} metadata keys across ${profile.analyzedDocuments} documents`
    });

  } catch (error: any) {
    console.error('Metadata analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Metadata analysis failed. Jean-Claude is investigating...'
    });
  }
};

export const getSampleValues = async (req: Request, res: Response) => {
  try {
    const { indexName, keyName } = req.params;
    const { namespace, count = '10', type = 'random', maxDocuments = '100' } = req.query;

    console.log(`🔍 Getting ${type} sample values for key "${keyName}"`);

    // Get all documents with this key
    const documents = await pineconeService.queryDocuments(indexName, {
      namespace: namespace as string || '',
      topK: parseInt(maxDocuments as string),
      includeMetadata: true,
      random: false
    });

    const valuesWithDocs = documents
      .filter(doc => doc.metadata && keyName in doc.metadata)
      .map(doc => ({
        value: doc.metadata[keyName],
        documentId: doc.id
      }));

    if (valuesWithDocs.length === 0) {
      res.json({
        success: true,
        data: [],
        message: `No documents found with metadata key "${keyName}"`
      });
      return;
    }

    let result;
    const requestedCount = Math.min(parseInt(count as string), 100);

    if (type === 'random') {
      // Random sampling
      const shuffled = valuesWithDocs.sort(() => Math.random() - 0.5);
      result = shuffled.slice(0, requestedCount);
    } else if (type === 'common') {
      // Most common values
      const valueFrequency = new Map();
      valuesWithDocs.forEach(item => {
        const key = typeof item.value === 'object' ? JSON.stringify(item.value) : item.value;
        if (!valueFrequency.has(key)) {
          valueFrequency.set(key, { count: 0, examples: [] });
        }
        const entry = valueFrequency.get(key);
        entry.count++;
        if (entry.examples.length < 3) { // Keep a few examples for each value
          entry.examples.push(item);
        }
      });

      const sorted = Array.from(valueFrequency.entries())
        .map(([value, data]: [any, any]) => ({
          value,
          count: data.count,
          percentage: Math.round((data.count / valuesWithDocs.length) * 10000) / 100,
          examples: data.examples
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, requestedCount);

      result = sorted;
    } else {
      // All values (limited)
      result = valuesWithDocs.slice(0, requestedCount);
    }

    res.json({
      success: true,
      data: {
        keyName,
        type,
        totalFound: valuesWithDocs.length,
        returned: result.length,
        values: result
      },
      message: `Found ${valuesWithDocs.length} values for key "${keyName}"`
    });
    return;

  } catch (error: any) {
    console.error('Sample values fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch sample values'
    });
    return;
  }
};

export const deleteDocumentsWithKey = async (req: Request, res: Response) => {
  try {
    const { indexName, keyName } = req.params;
    const { namespace } = req.query;

    console.log(`🗑️ Deleting all documents with metadata key "${keyName}"`);

    const result = await metadataAnalyzer.deleteDocumentsWithKey(
      indexName,
      keyName,
      namespace as string || ''
    );

    res.json({
      success: true,
      data: result,
      message: `Deleted ${result.deletedCount} documents containing metadata key "${keyName}"`
    });

  } catch (error: any) {
    console.error('Document deletion failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to delete documents'
    });
  }
};

export const getMetadataKeyStats = async (req: Request, res: Response) => {
  try {
    const { indexName, keyName } = req.params;
    const { namespace, maxDocuments = '100' } = req.query;

    console.log(`📈 Getting detailed stats for metadata key "${keyName}"`);

    // Get all documents with this key for detailed analysis
    const documents = await pineconeService.queryDocuments(indexName, {
      namespace: namespace as string || '',
      topK: parseInt(maxDocuments as string),
      includeMetadata: true,
      random: false
    });

    const values = documents
      .filter(doc => doc.metadata && keyName in doc.metadata)
      .map(doc => doc.metadata[keyName]);

    if (values.length === 0) {
      res.json({
        success: true,
        data: { keyName, totalDocuments: 0, values: [] },
        message: `No documents found with metadata key "${keyName}"`
      });
      return;
    }

    // Import DataTypeDetector for analysis
    const { DataTypeDetector } = await import('../utils/dataTypeDetector');
    const analysis = DataTypeDetector.analyzeValues(values);

    // Calculate value distribution
    const valueFrequency = new Map();
    values.forEach(value => {
      const key = typeof value === 'object' ? JSON.stringify(value) : value;
      valueFrequency.set(key, (valueFrequency.get(key) || 0) + 1);
    });

    const distribution = Array.from(valueFrequency.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / values.length) * 10000) / 100
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        keyName,
        totalDocuments: documents.length,
        documentsWithKey: values.length,
        presence: Math.round((values.length / documents.length) * 10000) / 100,
        dataTypeAnalysis: analysis,
        valueDistribution: distribution.slice(0, 20), // Top 20 values
        uniqueValues: distribution.length
      },
      message: `Analyzed ${values.length} values for key "${keyName}"`
    });
    return;

  } catch (error: any) {
    console.error('Metadata key stats failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get metadata key statistics'
    });
    return;
  }
};