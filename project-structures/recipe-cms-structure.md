# Recipe-cms Project Structure

## Technology Stack
- **Framework:** Next.js 14+ (App Router)
- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Database:** PostgreSQL 16+
- **Search:** Elasticsearch 8+ / OpenSearch 2+
- **Authentication:** NextAuth.js 5+
- **API:** REST + GraphQL (Code-first with Nexus)
- **Storage:** AWS S3 / CloudFlare R2
- **CDN:** CloudFlare / Vercel Edge
- **Testing:** Jest + Playwright

## Directory Structure

```
recipe-cms/
├── apps/
│   ├── api/                   # Next.js API routes
│   │   ├── recipes/           # Recipe CRUD endpoints
│   │   │   ├── route.ts
│   │   │   ├── GET list.ts
│   │   │   ├── GET [id].ts
│   │   │   ├── POST create.ts
│   │   │   ├── PATCH [id].ts
│   │   │   └── DELETE [id].ts
│   │   ├── videos/            # Video CRUD endpoints
│   │   ├── blog-posts/        # Blog post CRUD endpoints
│   │   ├── users/             # User management
│   │   ├── webhooks/          # Webhook endpoints
│   │   └── analytics/         # Usage analytics
│   └── web/                 # Next.js web app
│       ├── app/              # App router pages
│       ├── components/         # Reusable components
│       │   ├── RecipeEditor.tsx
│       │   ├── MarkdownEditor.tsx
│       │   ├── MediaManager.tsx
│       │   ├── ContentList.tsx
│       │   └── Dashboard.tsx
│       ├── hooks/             # Custom React hooks
│       │   ├── useAuth.ts
│       │   ├── useContent.ts
│       │   └── useWebhooks.ts
│       ├── lib/               # Utility functions
│       │   ├── markdown.ts
│       │   └── api.ts
│       └── styles/            # Global styles
├── packages/
│   ├── db/                   # Database package
│   │   ├── migrations/        # Migration files
│   │   ├── models/            # Prisma models
│   │   │   ├── User.ts
│   │   │   ├── ContentItem.ts
│   │   │   ├── Recipe.ts
│   │   │   ├── Video.ts
│   │   │   └── BlogPost.ts
│   │   ├── repositories/       # Repository pattern
│   │   │   ├── userRepository.ts
│   │   │   ├── contentRepository.ts
│   │   │   └── tagRepository.ts
│   │   └── seed.ts           # Database seed data
│   ├── api/                  # Shared API package
│   │   ├── middleware/        # API middleware
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   ├── errorHandling.ts
│   │   │   └── validation.ts
│   │   ├── routes/           # Route handlers
│   │   └── schemas/           # API schemas
│   ├── storage/              # Storage package
│   │   ├── s3.ts
│   │   ├── cdn.ts
│   │   └── localCache.ts
│   ├── auth/                 # Authentication package
│   │   ├── providers/        # Auth providers
│   │   │   ├── credentials.ts
│   │   │   ├── google.ts
│   │   │   └── github.ts
│   │   └── strategies/        # Auth strategies
│   │       ├── jwt.ts
│   │       └── session.ts
│   └── shared/               # Shared utilities
│       ├── types/            # TypeScript types
│       ├── utils/            # Utility functions
│       └── constants/         # Constants
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Migration files
│   └── seed.ts              # Seed data
├── scripts/
│   ├── dev.sh                # Development server
│   ├── build.sh              # Production build
│   ├── db-migrate.sh         # Database migration
│   ├── db-seed.sh           # Database seeding
│   └── test.sh              # Run tests
├── __tests__/
│   ├── api/                  # API route tests
│   ├── repositories/           # Repository tests
│   └── e2e/                 # E2E tests
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── jest.config.js
└── playwright.config.ts
```

## Phase 1 Implementation Order

### Sprint 1: Core Infrastructure (Week 1-2)
1. **Database Setup**
   - [ ] Configure Prisma ORM
   - [ ] Create all tables from schema
   - [ ] Implement migration system
   - [ ] Add foreign key constraints
   - [ ] Create database indexes
   - [ ] Set up seed data

2. **API Framework**
   - [ ] Set up Next.js App Router
   - [ ] Configure API route structure
   - [ ] Implement error handling
   - [ ] Add request logging
   - [ ] Create API response format

3. **Authentication**
   - [ ] Configure NextAuth.js
   - [ ] Implement credentials provider
   - [ ] Add Google OAuth
   - [ ] Add GitHub OAuth
   - [ ] JWT session management
   - [ ] Role-based access control

### Sprint 2: Core Content Types (Week 3-4)
1. **Recipe Content Type**
   - [ ] CRUD endpoints
   - [ ] Recipe metadata endpoint
   - [ ] Ingredients endpoint
   - [ ] Instructions endpoint
   - [ ] Recipe-recipes relationship
   - [ ] Version tracking

2. **Video Content Type**
   - [ ] CRUD endpoints
   - [ ] Video metadata endpoint
   - [ ] Subtitle upload
   - [ ] Transcript support
   - [ ] Video processing (transcoding)

3. **Blog Post Content Type**
   - [ ] CRUD endpoints
   - [ ] Blog post metadata endpoint
   - [ ] Word count calculation
   - [ ] Read time estimation
   - [ ] SEO meta tags

### Sprint 3: API Features (Week 5-6)
1. **Markdown-Based Content**
   - [ ] Markdown editor
   - [ ] Real-time preview
   - [ ] Markdown to HTML converter
   - [ ] Syntax highlighting
   - [ ] Save and auto-save

2. **Collections & Tags**
   - [ ] Collection CRUD
   - [ ] Tag management
   - [ ] Content-tag associations
   - [ ] Tag-based filtering
   - [ ] Collection visibility

3. **Version Control (Git Integration)**
   - [ ] Version tracking
   - [ ] Branch management
   - [ ] Commit history
   - [ ] Merge conflict resolution
   - [ ] Rollback support

## Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "next": "^14.1.0",
    "@prisma/client": "^5.15.0",
    "@prisma/client": "^5.15.0",
    "next-auth": "^5.0.0-beta.13",
    "marked": "^11.1.0",
    "react-markdown": "^9.0.0",
    "elastic/elasticsearch": "^8.11.0",
    "@aws-sdk/client-s3": "^3.550.0",
    "zod": "^3.22.0"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "@types/node": "^20.10.0",
    "prisma": "^5.15.0",
    "ts-node": "^10.9.1",
    "tsx": "^4.7.0",
    "jest": "^29.7.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0"
  }
}
```

## Key Implementation Notes

### Headless CMS Architecture
1. API-first design (web + mobile)
2. Database schema separate from business logic
3. Markdown-based content (not WYSIWYG)
4. Git version control (not just timestamps)

### Performance Targets
- API response: <200ms P95
- Database query: <100ms
- Markdown rendering: <50ms
- Search: <300ms (Elasticsearch)

### Testing Strategy
- Unit tests: 80% coverage minimum
- Integration tests: API endpoints
- E2E tests: Critical user journeys
- Load testing: 100 concurrent users

---

**Version:** 1.0
**Last Updated:** 2026-03-16
**Status:** Ready for Sprint 1
