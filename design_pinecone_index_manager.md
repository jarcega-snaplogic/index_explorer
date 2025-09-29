# Application Design: Pinecone Index Manager
*Generated: 2024-12-27*
*Architected by Jean-Claude - the only one who thinks about these things properly*

## Executive Summary

Pinecone Index Manager (PIM) is a web-based tool for managing Pinecone vector database indexes. It provides business users with an intuitive interface to review, filter, modify, and maintain document indexes without needing to understand vector embeddings or write code.

## 1. High-Level Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (SPA)                     │
│                  Material-UI Components                     │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express.js API Gateway                    │
│                    JWT Authentication                       │
└─────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                      ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│    Service Layer        │    │      Redis Cache        │
│  - PineconeService      │───▶│   - Index metadata      │
│  - AuditService         │    │   - Query results       │
│  - ExportService        │    └─────────────────────────┘
└─────────────────────────┘
         │         │
         ▼         ▼
┌──────────┐  ┌──────────┐
│ Pinecone │  │PostgreSQL│
│   API    │  │  (Audit) │
└──────────┘  └──────────┘
```

### Architectural Pattern
- **Frontend**: Component-based SPA with Redux state management
- **Backend**: RESTful API with service layer pattern
- **Database**: PostgreSQL for persistence, Redis for caching
- **External**: Pinecone vector database

## 2. Frontend Design

### Technology Stack
- React 18 with TypeScript
- Material-UI v5 for components
- Redux Toolkit for state management
- React Query for API data fetching
- Recharts for data visualization
- AG-Grid for data tables

### Component Architecture
```
src/
├── components/
│   ├── DocumentExplorer/
│   │   ├── DocumentGrid.tsx
│   │   ├── DocumentCard.tsx
│   │   └── Pagination.tsx
│   ├── FilterPanel/
│   │   ├── DateRangeFilter.tsx
│   │   ├── MetadataFilter.tsx
│   │   └── SearchBar.tsx
│   ├── MetadataEditor/
│   │   ├── InlineEditor.tsx
│   │   ├── BulkEditor.tsx
│   │   └── KeyNormalizer.tsx
│   ├── Operations/
│   │   ├── DuplicateFinder.tsx
│   │   ├── BulkDelete.tsx
│   │   └── ExportManager.tsx
│   └── Dashboard/
│       ├── IndexStats.tsx
│       ├── CostTracker.tsx
│       └── ActivityFeed.tsx
├── store/
│   ├── slices/
│   │   ├── documentsSlice.ts
│   │   ├── filtersSlice.ts
│   │   └── uiSlice.ts
│   └── store.ts
├── services/
│   └── api.ts
└── utils/
    ├── validators.ts
    └── exporters.ts
```

### Key Features
- **Real-time search** with debouncing
- **Infinite scroll** for large datasets
- **Inline editing** with optimistic updates
- **Drag-and-drop** for bulk operations
- **Dark mode** support

## 3. Backend Architecture

### Technology Stack
- Node.js 20 LTS
- Express.js with TypeScript
- Pinecone Node.js SDK
- PostgreSQL with Prisma ORM
- Redis for caching
- JWT for authentication
- Winston for logging

### API Structure
```
src/
├── controllers/
│   ├── indexController.ts
│   ├── documentController.ts
│   ├── operationsController.ts
│   └── authController.ts
├── services/
│   ├── pineconeService.ts
│   ├── auditService.ts
│   ├── cacheService.ts
│   └── exportService.ts
├── middleware/
│   ├── auth.ts
│   ├── rateLimiter.ts
│   ├── validator.ts
│   └── errorHandler.ts
├── models/
│   ├── User.ts
│   ├── AuditLog.ts
│   └── Operation.ts
└── utils/
    ├── pineconeClient.ts
    └── logger.ts
```

### API Endpoints

#### Indexes
- `GET /api/indexes` - List all indexes
- `GET /api/indexes/:name` - Get index details
- `GET /api/indexes/:name/stats` - Get index statistics

#### Documents
- `GET /api/indexes/:name/documents` - List documents (paginated)
- `GET /api/documents/:id` - Get single document
- `DELETE /api/documents/:id` - Delete document
- `PUT /api/documents/:id/metadata` - Update metadata
- `POST /api/documents/query` - Similarity search

#### Operations
- `POST /api/operations/find-duplicates` - Find duplicate vectors
- `DELETE /api/operations/remove-duplicates` - Remove duplicates
- `POST /api/operations/normalize-metadata` - Rename metadata keys
- `POST /api/operations/bulk-delete` - Delete multiple documents
- `POST /api/operations/export` - Export to CSV/Excel

#### Admin
- `GET /api/audit-logs` - Get audit trail
- `GET /api/stats/usage` - API usage statistics
- `GET /api/health` - Health check

## 4. Data Architecture

### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved filters
CREATE TABLE saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    filter_config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled operations
CREATE TABLE scheduled_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    operation_type VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    schedule_cron VARCHAR(100),
    next_run TIMESTAMP,
    last_run TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Redis Cache Strategy

```javascript
// Cache keys structure
{
  "index:{indexName}:stats": { /* index statistics */ },
  "index:{indexName}:metadata": { /* index metadata */ },
  "query:{queryHash}": { /* cached query results */ },
  "user:{userId}:preferences": { /* user preferences */ },
  "operations:duplicates:{indexName}": { /* duplicate analysis */ }
}

// TTL Strategy
- Index stats: 5 minutes
- Query results: 1 minute
- User preferences: 1 hour
- Duplicate analysis: 10 minutes
```

## 5. Security Architecture

### Authentication & Authorization
- JWT tokens with 24-hour expiration
- Refresh tokens stored in httpOnly cookies
- Role-based access control (RBAC)
  - **Viewer**: Read-only access
  - **Editor**: CRUD operations
  - **Admin**: All operations + user management

### API Security
- Rate limiting: 100 requests/minute per user
- API key encryption using AES-256
- HTTPS only with HSTS headers
- CORS configuration for specific origins
- Input validation and sanitization
- SQL injection prevention via parameterized queries

### Data Security
- Encryption at rest for sensitive data
- Audit logging for all destructive operations
- Backup before bulk operations
- Soft delete with recovery option (30 days)

## 6. Infrastructure & Deployment

### Container Strategy
```dockerfile
# Frontend Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pim-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pim-backend
  template:
    spec:
      containers:
      - name: backend
        image: pim-backend:latest
        env:
        - name: PINECONE_API_KEY
          valueFrom:
            secretKeyRef:
              name: pinecone-secret
              key: api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 7. Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Virtual scrolling for large lists
- Image lazy loading
- Service Worker for offline capability
- Bundle size optimization (<500KB initial)

### Backend
- Database connection pooling
- Query optimization with indexes
- Batch operations for bulk updates
- Async/await with proper error handling
- Response compression (gzip)

### Caching Strategy
- CDN for static assets
- Redis for API responses
- Browser caching with ETags
- Incremental cache invalidation

## 8. Development Workflow

### Git Strategy
```
main
├── develop
│   ├── feature/document-explorer
│   ├── feature/metadata-editor
│   └── feature/bulk-operations
└── hotfix/critical-bug
```

### CI/CD Pipeline
```yaml
stages:
  - test
  - build
  - deploy

test:
  script:
    - npm test
    - npm run lint
    - npm run type-check

build:
  script:
    - docker build -t pim:$CI_COMMIT_SHA .
    - docker push registry/pim:$CI_COMMIT_SHA

deploy:
  script:
    - kubectl set image deployment/pim pim=registry/pim:$CI_COMMIT_SHA
```

## 9. Monitoring & Observability

### Metrics
- Application Performance Monitoring (APM) with DataDog
- Custom metrics for Pinecone API usage
- User activity tracking
- Error rate monitoring
- Response time percentiles (p50, p95, p99)

### Logging
- Structured logging with Winston
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation with ELK stack
- Correlation IDs for request tracing

### Alerts
- API error rate > 1%
- Response time p95 > 2 seconds
- Pinecone API quota usage > 80%
- Failed authentication attempts > 10/minute

## 10. Testing Strategy

### Unit Testing
- Jest for JavaScript/TypeScript
- 80% code coverage target
- Mock external services

### Integration Testing
- API endpoint testing with Supertest
- Database integration tests
- Redis cache testing

### E2E Testing
- Cypress for critical user flows
- Visual regression testing
- Performance testing with k6

## 11. Disaster Recovery

### Backup Strategy
- PostgreSQL daily backups
- Configuration backups
- Disaster recovery drills quarterly

### Failover Plan
- Multi-region deployment
- Database replication
- Load balancer health checks
- Circuit breaker pattern for external services

## 12. Cost Optimization

### Pinecone API
- Batch operations to reduce API calls
- Cache frequently accessed data
- Implement request debouncing
- Monitor and alert on usage spikes

### Infrastructure
- Auto-scaling based on load
- Spot instances for non-critical workloads
- Reserved instances for baseline capacity
- Regular cost reviews

## Implementation Phases

### Phase 1: MVP (2 weeks)
- Basic document browsing
- Simple filtering
- Delete operations
- Basic authentication

### Phase 2: Enhanced Features (2 weeks)
- Metadata editing
- Duplicate detection
- Export functionality
- Audit logging

### Phase 3: Advanced Features (2 weeks)
- Bulk operations
- Metadata normalization
- Dashboard and analytics
- Advanced search

### Phase 4: Polish & Scale (1 week)
- Performance optimization
- Enhanced UI/UX
- Documentation
- Deployment automation

---
*Architected by Jean-Claude - the only one who thinks about these things properly*