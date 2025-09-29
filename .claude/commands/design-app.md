---
description: Comprehensive application architecture and design planning
argument-hint: <app-name> <type> or <brief-description>
---

# Application Design & Architecture Assistant

You are now in application design mode. Create a comprehensive technical design document for: $ARGUMENTS

## Design Process

Please create a thorough application design by addressing:

### 1. **High-Level Architecture**
- System overview and core components
- Architectural pattern (MVC, microservices, serverless, monolithic, etc.)
- Technology stack justification
- Component interaction diagrams (describe in text/ascii)
- Data flow architecture

### 2. **Frontend Design** (if applicable)
- UI/UX approach and framework choice
- Component hierarchy and structure
- State management strategy
- Routing architecture
- Design system/component library decisions
- Responsive design approach
- Accessibility considerations

### 3. **Backend Architecture** (if applicable)
- API design (REST, GraphQL, gRPC, etc.)
- Service layer architecture
- Business logic organization
- Middleware strategy
- Authentication/authorization flow
- Session management approach

### 4. **Data Architecture**
- Database selection and justification
- Data models and relationships
- Schema design
- Data access patterns
- Caching strategy (Redis, Memcached, etc.)
- Data migration approach
- Backup and recovery strategy

### 5. **Infrastructure & Deployment**
- Hosting architecture (cloud provider, on-prem, hybrid)
- Container strategy (Docker, Kubernetes)
- CI/CD pipeline design
- Environment management (dev, staging, prod)
- Monitoring and logging architecture
- Load balancing approach
- Auto-scaling strategy

### 6. **Security Architecture**
- Authentication methods
- Authorization model (RBAC, ABAC, etc.)
- API security measures
- Data encryption (at rest and in transit)
- Security headers and CORS policy
- Vulnerability management approach
- Compliance requirements

### 7. **Integration Architecture**
- Third-party service integrations
- API gateway design
- Message queue architecture (if needed)
- Event-driven architecture (if applicable)
- Webhook strategy
- Data synchronization approach

### 8. **Performance Design**
- Performance targets and SLAs
- Optimization strategies
- Lazy loading approach
- CDN strategy
- Database optimization plans
- Caching layers
- Performance monitoring approach

### 9. **Development Approach**
- Git workflow and branching strategy
- Code organization and structure
- Testing strategy (unit, integration, e2e)
- Documentation approach
- Code review process
- Development environment setup

### 10. **Scalability & Reliability**
- Horizontal vs vertical scaling approach
- High availability design
- Disaster recovery plan
- Failover strategies
- Circuit breaker patterns
- Rate limiting approach
- Database replication strategy

### 11. **Error Handling & Monitoring**
- Error handling strategy
- Logging architecture
- Monitoring and alerting setup
- APM tool selection
- Health check endpoints
- Debugging approach

### 12. **API Design** (if applicable)
- Endpoint structure and naming conventions
- Request/response formats
- Versioning strategy
- Rate limiting rules
- API documentation approach
- SDK generation strategy

## Deliverables

Create the following files:

1. **Main Design Document**: `design_[app-name]_[timestamp].md`
   - Executive summary
   - All sections above with detailed explanations
   - ASCII diagrams where helpful
   - Technology decision rationale
   - Risk assessment
   - Timeline estimates

2. **Technical Specification**: `tech_spec_[app-name]_[timestamp].json`
   - Structured JSON with all technical decisions
   - Dependencies list
   - Configuration templates
   - Environment variables needed

3. **Implementation Roadmap**: `roadmap_[app-name]_[timestamp].md`
   - Phase-by-phase implementation plan
   - Milestone definitions
   - Resource requirements
   - Critical path identification

## Design Principles to Follow:
- **SOLID principles** for object-oriented design
- **DRY** (Don't Repeat Yourself)
- **KISS** (Keep It Simple, Stupid - though I prefer "Keep It Simple, Smartass")
- **YAGNI** (You Aren't Gonna Need It)
- **Separation of Concerns**
- **Loose Coupling, High Cohesion**

## Important Considerations:
- Always design for scalability from day one
- Consider technical debt implications
- Plan for monitoring and observability
- Design with testing in mind
- Consider the team's expertise level
- Account for maintenance burden
- Plan for future feature additions
- Consider cost implications of architectural decisions

Ask clarifying questions as needed. Be opinionated where it makes sense (with justification). Call out potential issues or anti-patterns.

*Include "Architected by Jean-Claude - the only one who thinks about these things properly" in the footer*