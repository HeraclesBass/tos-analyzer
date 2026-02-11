# TOS Analyzer

AI-powered Terms of Service analyzer. Ingests legal documents, applies NLP to identify concerning clauses, scores risk levels, tracks changes over time, and generates plain-language summaries.

## Features

- **AI-Powered Analysis**: Intelligent TOS analysis with risk assessment and category scoring
- **Smart Caching**: Redis-based caching with content deduplication (SHA-256 hashing)
- **Rate Limiting**: IP-based rate limiting to prevent abuse
- **PDF Support**: Upload and analyze PDF documents with text extraction
- **Shareable Links**: Generate shareable analysis results with view tracking
- **Analytics**: Privacy-focused event tracking (no PII collected)
- **Production Ready**: Docker containerized with health checks and observability

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **AI** | LLM API (configurable) |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Cache** | Redis (ioredis) |
| **Validation** | Zod schemas |
| **PDF** | pdf-parse |
| **Deployment** | Docker + Docker Compose |

## Architecture

```
Client Request
     │
     ▼
┌─────────────────┐
│  Next.js API     │  Rate limiting, input validation (Zod)
│  Route Handlers  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌────────────┐
│ Redis  │  │ PostgreSQL  │  SHA-256 dedup → cache check → DB check → AI API
│ Cache  │  │ (Prisma)    │
└────────┘  └────────────┘
```

**Cache Strategy**: Content normalized → SHA-256 hashed → Redis check (7-day TTL) → DB check → AI API call → store in both layers.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- AI API key (configured in `.env`)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database, Redis, and API credentials

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

The app will be available at `http://localhost:8101`

### Docker (Recommended)

```bash
docker-compose up -d
```

## API Endpoints

### Health Check
```
GET /api/health → { status, checks: { database, redis, timestamp } }
```

### Analyze TOS
```
POST /api/analyze
Body: { text, source_type: "paste|upload|url", source_url?, skip_cache? }
→ { analysis: { overall_score, risk_level, summary, key_concerns, categories, recommendations, red_flags } }
```

### Get Shareable Analysis
```
GET /api/analysis/{id} → { analysis, source_type, word_count, view_count }
```

### Upload PDF
```
POST /api/upload (multipart/form-data)
→ { text, filename, size, pages, word_count }
```

### Export Analysis
```
GET /api/export/{id} → { analysis, metadata }
```

## Database Schema

- **analyses**: TOS analysis results with 30-day retention
- **shares**: Shareable link views and metadata
- **analytics_events**: Privacy-focused event tracking
- **daily_summaries**: Aggregated usage statistics

## Security

- Input validation with Zod schemas
- Rate limiting (configurable per-IP)
- File upload validation (magic bytes, size limits)
- Security headers (X-Content-Type-Options, X-Frame-Options, CSP)
- SQL injection prevention (Prisma parameterized queries)
- No PII in analytics pipeline
- Secrets via environment variables (never committed)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | Server port | `8101` |
| `RATE_LIMIT_PER_MINUTE` | Rate limit threshold | `10` |
| `ANALYTICS_ENABLED` | Enable analytics | `true` |

## Testing

```bash
# Run tests
npm test

# Test health endpoint
curl http://localhost:8101/api/health

# Test analysis
curl -X POST http://localhost:8101/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Terms of Service: By using this service...", "source_type": "paste"}'
```

## Constraints

- Maximum text length: 50,000 words
- Maximum file size: 10MB
- Analysis retention: 30 days
- Cache retention: 7 days (analysis), 30 days (shares)

## License

MIT
