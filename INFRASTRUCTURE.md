# 🏗️ Infrastructure Setup Guide
## Docker Compose + All Backend Services

> Agent: Use this file to set up local development infrastructure.  
> Run `docker-compose up -d` from the root to start all services.

---

## `docker-compose.yml` (Root of monorepo)

```yaml
version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: signal_postgres
    environment:
      POSTGRES_USER: signal_user
      POSTGRES_PASSWORD: signal_pass
      POSTGRES_DB: signal_clone
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U signal_user -d signal_clone"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis - Session store, pub/sub, message queue
  redis:
    image: redis:7-alpine
    container_name: signal_redis
    command: redis-server --requirepass redis_dev_password --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_dev_password", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO - S3-compatible object storage for encrypted attachments
  minio:
    image: minio/minio:latest
    container_name: signal_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Web console (http://localhost:9001)
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # MinIO bucket initialization
  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin123;
      mc mb local/signal-attachments --ignore-existing;
      mc anonymous set none local/signal-attachments;
      echo 'MinIO bucket created';
      "

  # Coturn - TURN server for WebRTC calls
  coturn:
    image: coturn/coturn:latest
    container_name: signal_coturn
    network_mode: host  # Required for TURN to work properly
    command: >
      -n
      --log-file=stdout
      --lt-cred-mech
      --fingerprint
      --no-multicast-peers
      --no-cli
      --no-tlsv1
      --no-tlsv1_1
      --realm=signal-clone.local
      --secret=your_turn_secret_here
      --listening-port=3478
      --min-port=49160
      --max-port=49200
    volumes:
      - coturn_data:/var/lib/coturn

volumes:
  postgres_data:
  redis_data:
  minio_data:
  coturn_data:
```

---

## Environment Variables (`.env.example`)

Copy this to `.env` and fill in values:

```env
# ========== Database ==========
DATABASE_URL=postgresql://signal_user:signal_pass@localhost:5432/signal_clone

# ========== JWT ==========
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=CHANGE_ME_64_char_hex_string
JWT_REFRESH_SECRET=CHANGE_ME_different_64_char_hex_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ========== Redis ==========
REDIS_URL=redis://:redis_dev_password@localhost:6379

# ========== MinIO ==========
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_NAME=signal-attachments
MINIO_USE_SSL=false

# ========== TURN Server ==========
TURN_SERVER_HOST=localhost
TURN_SERVER_PORT=3478
TURN_SECRET=your_turn_secret_here

# ========== App ==========
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000

# ========== Security ==========
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PHONE_HASH_PEPPER=CHANGE_ME_random_string_for_phone_hashing

# ========== Rate Limiting ==========
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=10

# ========== Push Notifications (Optional) ==========
FCM_SERVER_KEY=
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_KEY_PATH=

# ========== Monitoring (Optional) ==========
SENTRY_DSN=
```

---

## Service URLs (Local Dev)

| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | localhost:5432 | signal_user / signal_pass |
| Redis | localhost:6379 | password: redis_dev_password |
| MinIO API | http://localhost:9000 | minioadmin / minioadmin123 |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin123 |
| TURN Server | localhost:3478 | HMAC time-limited |
| Backend API | http://localhost:3001 | JWT |
| Web App | https://localhost:3000 | — |

---

## Quick Start Commands

```bash
# 1. Start all infrastructure
docker-compose up -d

# 2. Verify all services are healthy
docker-compose ps

# 3. Run database migrations
cd packages/db && npx drizzle-kit migrate

# 4. Start backend server
cd apps/server && npm run dev

# 5. Start web app
cd apps/web && npm run dev

# 6. View logs
docker-compose logs -f postgres   # DB logs
docker-compose logs -f redis       # Redis logs
docker-compose logs -f minio       # MinIO logs
```

---

## Redis Key Naming Convention

```
# Refresh tokens
refresh_token:{userId}:{tokenHash}  →  TTL: 7 days

# Online presence
presence:{userId}  →  TTL: 30 seconds (refreshed by heartbeat)

# Pending messages (offline delivery queue)
messages:pending:{userId}  →  Redis List, push left / pop right

# OTPK low count alerts (debounce)
keys:alert_sent:{userId}  →  TTL: 1 hour

# Rate limiting (express-rate-limit uses Redis)
rl:{ip}  →  Managed by express-rate-limit
```

---

## MinIO Bucket Policy

The `signal-attachments` bucket should be private (no public access).
All access is via presigned URLs with 1-hour expiry.

```javascript
// Presigned upload URL (expires in 1 hour)
const uploadUrl = await minio.presignedPutObject(
  process.env.MINIO_BUCKET_NAME,
  `attachments/${attachmentId}`,
  3600 // seconds
);

// Presigned download URL (expires in 1 hour)
const downloadUrl = await minio.presignedGetObject(
  process.env.MINIO_BUCKET_NAME,
  `attachments/${attachmentId}`,
  3600
);
```

---

## Production Checklist (Before Deploying)

- [ ] Replace all `CHANGE_ME` values with real secrets
- [ ] Use a managed PostgreSQL (not Docker) for production
- [ ] Use a managed Redis (Redis Cloud, Upstash) for production
- [ ] Use real S3 or managed MinIO for production
- [ ] Set `NODE_ENV=production`
- [ ] Configure TLS/SSL certificates (Let's Encrypt)
- [ ] Set up database backup schedule
- [ ] Configure Coturn on a separate server with public IP
- [ ] Restrict database port to internal network only
- [ ] Enable PostgreSQL SSL: `?ssl=true` in DATABASE_URL
