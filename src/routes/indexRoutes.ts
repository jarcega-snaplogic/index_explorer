import { Router } from 'express';
import indexController from '../controllers/indexController';
import * as metadataController from '../controllers/metadataController';
import * as deduplicationController from '../controllers/deduplicationController';

const router = Router();

// Index operations
router.get('/indexes', indexController.listIndexes);
router.get('/indexes/:indexName/stats', indexController.getIndexStats);
router.get('/indexes/:indexName/documents', indexController.queryDocuments);

// Document operations
router.delete('/indexes/:indexName/documents/:documentId', indexController.deleteDocument);
router.post('/indexes/:indexName/documents/delete-many', indexController.deleteMany);
router.put('/indexes/:indexName/documents/:documentId/metadata', indexController.updateMetadata);

// Duplicate operations
router.get('/indexes/:indexName/duplicates', indexController.findDuplicates);

// Metadata profiling operations - Jean-Claude's enterprise analytics
router.get('/indexes/:indexName/metadata-profile', metadataController.analyzeMetadata);
router.get('/indexes/:indexName/metadata/:keyName/samples', metadataController.getSampleValues);
router.get('/indexes/:indexName/metadata/:keyName/stats', metadataController.getMetadataKeyStats);
router.delete('/indexes/:indexName/metadata/:keyName/documents', metadataController.deleteDocumentsWithKey);

// Deduplication operations - Jean-Claude's duplicate elimination system
router.get('/indexes/:indexName/duplicates/analyze', deduplicationController.analyzeForDuplicates);
router.get('/indexes/:indexName/duplicates/preview', deduplicationController.previewDuplicates);
router.post('/indexes/:indexName/duplicates/delete', deduplicationController.deleteDuplicates);
router.get('/indexes/:indexName/duplicates/report', deduplicationController.getDuplicationReport);

export default router;