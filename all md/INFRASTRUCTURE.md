# 🏗️ Infrastructure Setup Guide
## Docker Compose + All Backend Services

> Agent: Use this file to set up local development infrastructure.  
> Run `docker-compose up -d` from the root to start all services.

---

## `docker-compose.yml` (Root of monorepo)

```yaml
version: '3.9'

services:
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
  coturn_data:
```

---

## Environment Variables (`.env.example`)

Copy this to `.env` and fill in values:

```env
# ========== Supabase ==========
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ========== TURN Server ==========
TURN_SERVER_HOST=localhost
TURN_SERVER_PORT=3478
TURN_SECRET=your_turn_secret_here

# ========== App ==========
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000

# ========== Security ==========
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PHONE_HASH_PEPPER=CHANGE_ME_random_string_for_phone_hashing

# ========== Push Notifications (Optional) ==========
FCM_SERVER_KEY=
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_KEY_PATH=
```

---

## Service URLs (Local Dev)

| Service | URL | Credentials |
|---------|-----|-------------|
| TURN Server | localhost:3478 | HMAC time-limited |
| Web App | https://localhost:3000 | — |

---

## Quick Start Commands

```bash
# 1. Start TURN server (optional, usually Supabase takes care of basics)
docker-compose up -d coturn

# 2. Start Supabase (requires Supabase CLI)
supabase start

# 3. Start web app
cd apps/web && npm run dev
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
