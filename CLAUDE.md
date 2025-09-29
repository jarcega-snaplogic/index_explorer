# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Pinecone Index Manager is a comprehensive tool for managing Pinecone vector database indexes with enterprise-grade metadata profiling capabilities. The project consists of a Node.js/TypeScript backend, a React frontend client, and a standalone HTML frontend for simplified access.

## Development Commands

### Backend Development
```bash
npm run dev          # Start development server with hot reload on port 3001
npm run build        # Compile TypeScript to dist/ directory
npm start           # Run compiled JavaScript from dist/
npm test            # Run Jest tests
npm run lint        # Run ESLint on TypeScript files
```

### React Client Development
```bash
cd client
npm start           # Start React dev server on port 3000
npm run build       # Build for production
npm test            # Run React tests
```

### Frontend Access
- **Simple HTML Frontend**: `http://localhost:8080/simple-frontend.html` (served via python3 -m http.server 8080)
- **React Frontend**: `http://localhost:3000` (when React dev server is running)
- **Backend API**: `http://localhost:3001/api`

## Architecture Overview

### Backend Structure
The backend follows a traditional MVC pattern with Express.js:

- **Entry Point**: `src/index.ts` - Express server setup with middleware, CORS, and error handling
- **Routes**: `src/routes/indexRoutes.ts` - API route definitions mapping to controllers
- **Controllers**: Business logic layer
  - `indexController.ts` - Core Pinecone operations (list, query, delete, duplicates)
  - `metadataController.ts` - Advanced metadata profiling and analysis
- **Services**: Data access layer
  - `pineconeService.ts` - Pinecone SDK wrapper with pagination, batching, and error handling
  - `metadataAnalyzer.ts` - Statistical metadata analysis engine
- **Utils**:
  - `pineconeClient.ts` - Singleton Pinecone client initialization
  - `dataTypeDetector.ts` - Intelligent data type classification and business logic detection

### Key Architectural Patterns

**Service Layer Pattern**: Controllers delegate to services for data operations, maintaining separation of concerns.

**Pagination Strategy**: The system handles Pinecone's API limitations (100 documents per call) through intelligent pagination in `pineconeService.queryDocuments()`. It makes multiple API calls and aggregates results for sample sizes >100.

**Batched Metadata Fetching**: To avoid HTTP 414 "URI Too Long" errors when fetching metadata for large document sets, the system batches fetch requests in groups of 50 documents.

**Singleton Pattern**: Pinecone client is initialized once and reused across the application to avoid connection overhead.

### Frontend Architecture

**Dual Frontend Approach**:
- **Simple HTML Frontend** (`simple-frontend.html`) - Self-contained single file with vanilla JavaScript, suitable for quick access and demonstrations
- **React Frontend** (`client/`) - Full React application for advanced features (currently basic Create React App setup)

**Sample Size Management**: The HTML frontend uses a global `currentSampleSize` variable that's synchronized across all metadata operations (profiling, random samples, common values, detailed stats).

**Loading State Management**: Professional loading overlays with button disabling prevent double-clicks during long-running operations. Loading messages are contextual and show the exact sample size being processed.

## Critical Implementation Details

### Pinecone API Limitations
- **listPaginated API**: Limited to 100 documents per call, requires pagination for larger datasets
- **fetch API**: URL length limitations require batching when fetching metadata for many documents
- **Serverless Indexes**: Some operations behave differently vs. pod-based indexes

### Sample Size Synchronization
The metadata profiling system maintains consistency across operations:
1. User selects sample size (100/1000/10000) in main metadata profile
2. `currentSampleSize` global variable is updated
3. All subsequent operations (Random 10, Most Common 10, Detailed Stats) use this sample size
4. Backend controllers accept `maxDocuments` parameter and pass it through the service layer

### Data Type Detection Engine
The `dataTypeDetector.ts` implements intelligent classification:
- **Primary Types**: string, number, boolean, object, array
- **Business Categories**: identifier, category, asset (based on uniqueness patterns)
- **Statistical Analysis**: completeness, uniqueness, pattern detection
- **Confidence Scoring**: Based on data consistency and pattern strength

### Error Handling Strategy
- **Service Layer**: Wraps Pinecone SDK errors with contextual messages
- **Controller Layer**: Provides user-friendly error responses
- **Frontend**: Loading states ensure UI remains responsive during errors

## Environment Setup

Required environment variables in `.env`:
```
PINECONE_API_KEY=your_api_key_here
PINECONE_ENVIRONMENT=development
```

The Pinecone client uses a singleton pattern and will throw descriptive errors if the API key is missing.

## Testing Strategy

Currently basic Jest setup in place. When adding tests:
- Mock Pinecone SDK in service layer tests
- Test pagination and batching logic in `pineconeService`
- Test data type detection accuracy in `dataTypeDetector`
- Test sample size synchronization across frontend operations

## Performance Considerations

**Sample Size Impact**: Larger sample sizes (1000+) require multiple Pinecone API calls and can take several seconds. The UI warns users and shows loading states.

**Memory Usage**: Large document sets are processed in batches to avoid memory issues.

**Caching**: No caching implemented currently - each operation hits Pinecone directly.

## Security Notes

- API key stored in `.env` file (not committed to git)
- CORS enabled for frontend access
- Helmet.js provides security headers
- Input validation should be added for production use