# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pinecone Index Manager** - An enterprise-grade web application for managing Pinecone vector database indexes with advanced search, filtering, metadata analysis, and deduplication capabilities.

**Architecture**: TypeScript/Express.js backend + Vanilla JavaScript frontend (single HTML file)

## Development Commands

### Backend Development
```bash
npm run dev          # Start development server with hot reload (nodemon + ts-node)
npm run build        # Compile TypeScript to dist/
npm start           # Run compiled version from dist/
npm test            # Run Jest tests
npm run lint        # ESLint on TypeScript files
```

### Environment Setup
Required `.env` file:
```bash
PINECONE_API_KEY=your_api_key_here
PINECONE_ENVIRONMENT=development  # or production
PORT=3001                        # Optional, defaults to 3001
```

### Running the Application
1. **Backend**: `npm run dev` starts Express server on port 3001
2. **Frontend**: Open `simple-frontend.html` in browser (served via Express or directly)
3. **Health Check**: `curl http://localhost:3001/health`

## Architecture & Code Structure

### Service Layer Pattern
The codebase follows a clean **MVC + Service Layer** architecture:

```
src/
├── index.ts                    # Express app setup, middleware, routing
├── routes/
│   └── indexRoutes.ts         # Route definitions (maps endpoints to controllers)
├── controllers/               # Request/response handling
│   ├── indexController.ts     # Index and document operations
│   ├── metadataController.ts  # Metadata profiling endpoints
│   └── deduplicationController.ts  # Duplicate detection/deletion
├── services/                  # Business logic layer
│   ├── pineconeService.ts     # Core Pinecone SDK operations
│   ├── metadataAnalyzer.ts    # Statistical metadata analysis
│   └── deduplicationService.ts # Fuzzy matching & similarity algorithms
└── utils/
    ├── pineconeClient.ts      # Pinecone SDK initialization
    └── dataTypeDetector.ts    # Type inference for metadata fields
```

**Key Architectural Principles**:
- **Controllers**: Thin layer - request validation, response formatting only
- **Services**: Fat layer - all business logic, data processing, Pinecone interactions
- **Service Singleton Pattern**: All services export singleton instances (`export default new Service()`)
- **Index Caching**: `PineconeService` caches Pinecone index instances to avoid re-initialization

### Pinecone API Integration

**Critical Implementation Details**:

1. **Serverless Index Handling**: Uses `listPaginated()` API (not `query()`) for document retrieval
   - Serverless indexes don't support traditional query without vectors
   - `listPaginated()` has a 100-document limit per call
   - Multiple API calls are batched for larger requests (see `queryDocuments()` in `pineconeService.ts:38-138`)

2. **Batching Strategy**:
   ```typescript
   // Fetch metadata in 50-document batches to avoid URL length limits
   const batchSize = 50;
   for (let i = 0; i < vectorIds.length; i += batchSize) {
     const batch = vectorIds.slice(i, i + batchSize);
     const batchResult = await indexNamespace.fetch(batch);
   }
   ```

3. **Namespace Handling**: Always provide empty string `''` for default namespace (not `undefined`)

### Deduplication System

**Location**: `src/services/deduplicationService.ts`

**Sophisticated Fuzzy Matching**:
- **Exact matching**: JSON string comparison (100% similarity)
- **Fuzzy matching**: Field-by-field similarity scoring with:
  - Levenshtein distance for strings
  - Percentage difference for numbers
  - Special handling for URLs (ignore query params), dates, filenames
- **Configurable thresholds**: 85% default for fuzzy matches
- **Deletion strategies**: `keep-first`, `keep-newest`, `manual-review`

**Key Methods**:
- `findMetadataDuplicates()`: Analyze namespace for duplicate groups
- `deleteDuplicates()`: Execute deletions with audit trail
- `calculateMetadataSimilarity()`: Core fuzzy matching algorithm

### Frontend Architecture

**Single HTML File Design**: `simple-frontend.html` (~3500+ lines)

**Why not React/Vue?**
- Maximum compatibility (runs anywhere)
- Zero build step required
- Deployed instantly (just copy HTML file)
- All logic self-contained

**Key Frontend Features**:
- **Real-time search**: 300ms debounced global search across all metadata fields
- **Advanced filtering**: Dynamic filter generation based on metadata data types
- **Client-side processing**: Search/filter/sort operates on full dataset (1000+ docs)
- **Professional modal system**: Replaced all browser `alert()` calls with custom modals
- **Excel-like console**: Column resizing, fullscreen mode, pagination

**Frontend API Communication**:
```javascript
// All API calls use fetch() with base URL detection
const apiBase = window.location.pathname.includes('/sl/pinecone-manager')
  ? '/sl/pinecone-manager/api'
  : '/api';
```

## OpenRun Compatibility

The app supports **dual-path routing** for OpenRun deployment:

**Routes**:
- Root path: `/api/*` and `/`
- OpenRun path: `/sl/pinecone-manager/api/*` and `/sl/pinecone-manager/`

**Implementation** (see `src/index.ts:61-79`):
```typescript
const basePaths = ['', '/sl/pinecone-manager'];
basePaths.forEach(basePath => {
  app.use(basePath + '/api', indexRoutes);
  app.get(basePath + route, (req, res) => { /* serve HTML */ });
});
```

**Helmet CSP Configuration**: Allows inline scripts/styles for the standalone HTML frontend (required for `onclick` handlers and `<style>` tags).

## API Endpoints Reference

### Index Operations
- `GET /api/indexes` - List all Pinecone indexes
- `GET /api/indexes/:name/stats` - Get index statistics and namespaces
- `GET /api/indexes/:name/documents?namespace=X&topK=100` - Query documents

### Document Operations
- `DELETE /api/indexes/:name/documents/:id` - Delete single document
- `POST /api/indexes/:name/documents/delete-many` - Bulk delete (body: `{ids: [], namespace: ''}`)
- `PUT /api/indexes/:name/documents/:id/metadata` - Update document metadata

### Metadata Analysis
- `GET /api/indexes/:name/metadata-profile?namespace=X` - Analyze metadata structure
- `GET /api/indexes/:name/metadata/:key/samples` - Get sample values for a key
- `GET /api/indexes/:name/metadata/:key/stats` - Get statistics for a key
- `DELETE /api/indexes/:name/metadata/:key/documents` - Delete all docs with this key

### Deduplication
- `GET /api/indexes/:name/duplicates/analyze?namespace=X` - Find duplicate groups
- `GET /api/indexes/:name/duplicates/preview?similarity=exact|fuzzy` - Preview duplicates
- `POST /api/indexes/:name/duplicates/delete` - Delete duplicates (body: `{duplicateGroups: [], namespace: ''}`)
- `GET /api/indexes/:name/duplicates/report` - Get deduplication audit report

## Important Implementation Notes

### TypeScript Configuration
- **Target**: ES2020 with CommonJS modules
- **Strict mode**: Enabled (except `noUnusedLocals`/`noUnusedParameters` disabled)
- **Output**: Compiled to `dist/` directory
- **Source maps**: Enabled for debugging

### Pinecone SDK Quirks
1. **Index initialization**: Must call `.index(name)` then `.namespace(ns)` - cannot chain directly
2. **Metadata updates**: Requires fetching the document first (cannot update metadata without vector check)
3. **Delete operations**: `deleteOne(id)` for single, `deleteMany([ids])` for bulk (NOT `delete()`)
4. **Pagination tokens**: `listPaginated()` returns `pagination.next` token - check for undefined to detect end

### Search Performance Optimization
- **Debouncing**: 300ms delay on search input prevents excessive API calls
- **Client-side filtering**: Once documents are loaded, all filters run in-browser (instant results)
- **Pagination**: Virtual scrolling not used - standard pagination with 25/50/100 per page
- **Data caching**: Frontend caches full document set until namespace/index changes

### Error Handling Philosophy
- **Controllers**: Catch all errors, return JSON with `{success: false, error: message}`
- **Services**: Throw descriptive errors - let controllers handle HTTP responses
- **Frontend**: Modal dialogs for all errors (professional UX, no browser alerts)
- **Logging**: Console logs extensively (development-focused, production would use Winston)

## Common Development Tasks

### Adding a New API Endpoint
1. Define route in `src/routes/indexRoutes.ts`
2. Create controller method in appropriate controller file
3. Implement business logic in service layer
4. Update frontend to call new endpoint

### Adding a New Metadata Analysis Feature
1. Extend `MetadataAnalyzer` service with new analysis method
2. Add controller endpoint in `metadataController.ts`
3. Wire up route in `indexRoutes.ts`
4. Update frontend UI to display results

### Testing Pinecone Operations
```bash
# Quick test connection
ts-node src/test-connection.ts

# Test via API
curl http://localhost:3001/api/indexes
curl http://localhost:3001/api/indexes/YOUR_INDEX/stats
```

## Deployment Considerations

### Production Checklist
- [ ] Set `PINECONE_ENVIRONMENT=production` in `.env`
- [ ] Remove `.env` file from version control (already in `.gitignore`)
- [ ] Review Helmet CSP settings for production security requirements
- [ ] Consider Winston logger for structured logging (already in dependencies)
- [ ] Set up rate limiting (express-rate-limit already in dependencies)

### OpenRun Deployment
The app is designed for OpenRun deployment with:
- Base path support (`/sl/pinecone-manager`)
- Static file serving via Express
- No separate static file server needed

### Docker Support
A `Dockerfile` is included for containerized deployment.

## Known Architecture Decisions

### Why No Authentication?
- Designed for internal tools / trusted environments
- JWT/bcrypt dependencies present but not implemented
- Easy to add: middleware exists in `src/middleware/` (currently unused)

### Why Vanilla JavaScript Frontend?
- Simplicity and portability over framework complexity
- Single file deployment (critical for OpenRun)
- No build pipeline = no build failures
- Faster iteration for business users who want to customize

### Why Service Layer Instead of Repository Pattern?
- Pinecone SDK already provides data access layer
- Service layer focuses on business logic (deduplication, analysis)
- Avoids over-engineering for a tool of this scope
