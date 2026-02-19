# FinePrint - TOS Analyzer

AI-powered Terms of Service analyzer. Paste or upload any legal document, get a plain-language risk analysis with severity scores, clause-by-clause breakdown, and actionable takeaways.

**Live at [fine-print.org](https://fine-print.org)**

## Features

- **Gemini 2.5 Pro Analysis**: Clause-by-clause risk assessment across 7 categories (Privacy, Liability, Rights, Changes, Termination, Payment, AI & Data Use)
- **Company Auto-Detection**: Identifies the company from document content with confidence scoring
- **Document Validation**: Rejects non-legal content before wasting API calls
- **Smart Caching**: Redis + PostgreSQL deduplication via SHA-256 hashing
- **PDF Upload**: Extract and analyze PDF documents
- **Public Library**: Community collection of analyzed TOS documents
- **Shareable Links**: Share analysis results with view tracking
- **Rate Limiting**: Nginx + Redis dual-layer protection with atomic Lua scripts
- **Budget Protection**: Daily Gemini token cap prevents runaway costs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **AI** | Google Gemini 2.5 Pro |
| **Database** | PostgreSQL (Prisma ORM) |
| **Cache** | Redis (ioredis) |
| **Validation** | Zod |
| **PDF** | pdf-parse |
| **Deployment** | Docker Compose |

## Quick Start

### Docker (Recommended)

```bash
cp .env.example .env
# Edit .env with your Gemini API key and database credentials

docker compose up -d
```

The app will be available at `http://localhost:8101`.

### API Endpoints

#### Analyze TOS
```
POST /api/analyze
Content-Type: application/json

{
  "text": "Terms of Service content...",
  "source_type": "paste",
  "company_name": "Acme Corp",
  "add_to_library": false
}

Response: {
  "success": true,
  "data": {
    "id": "uuid",
    "analysis": { summary, categories, detected_company, document_validation },
    "creator_token": "hex-string",
    "is_public": false
  }
}
```

The `creator_token` is returned once at creation. Save it to publish the analysis later.

#### Publish to Library
```
POST /api/analysis/{id}/publish
Content-Type: application/json

{
  "company_name": "Acme Corp",
  "add_to_library": true,
  "creator_token": "hex-string-from-creation"
}
```

#### Other Endpoints
```
GET  /api/analysis/{id}       # View shared analysis
GET  /api/library              # Browse public library (?search=&sort=&filter=&limit=)
GET  /api/export/{id}          # Export analysis data
POST /api/upload               # Upload PDF (multipart/form-data)
GET  /api/health               # Health check
```

## Security

- **Prompt injection defense**: Gemini `systemInstruction` API separates system prompt from user content; XML document delimiters; post-processing quote verification
- **Rate limiting**: Nginx zones (analyze 5r/m, upload 3r/m, read 30r/m) + Redis per-IP limits with atomic Lua scripts
- **Budget cap**: Daily token limit (default 5M) prevents cost abuse
- **Ownership model**: Creator token (HMAC-SHA256) required to publish analyses
- **Input sanitization**: Zod schemas, HTML stripping on company names, safe-char allowlist
- **Privacy by default**: `isPublic` defaults to `false`; analyses are private unless explicitly published
- **Infrastructure**: Docker port binding on 127.0.0.1, .env at mode 600, no exposed database ports

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `SESSION_SALT` | Yes | - | HMAC salt for tokens and session hashing |
| `DAILY_TOKEN_BUDGET` | No | `5000000` | Max Gemini tokens per day (~$10-15) |
| `RATE_LIMIT_PER_MINUTE` | No | `10` | Write endpoint rate limit |
| `PORT` | No | `8101` | Server port |
| `NODE_ENV` | No | `production` | Environment |

## Database Schema

- **analyses**: TOS analysis results with 30-day retention, ownership tokens
- **shares**: Shareable link views and metadata
- **analytics_events**: Privacy-focused event tracking (no PII)
- **daily_summaries**: Aggregated usage statistics

## Constraints

- Maximum text length: 500,000 characters / 50,000 words
- Maximum file upload: 10MB (PDF only)
- Analysis retention: 30 days
- Cache TTL: 7 days (analysis), 30 days (shares)
- Daily token budget: 5M tokens (configurable)

## License

MIT
