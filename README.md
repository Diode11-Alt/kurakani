# 🌟 Kurakani

Kurakani is an enterprise-grade, zero-knowledge, end-to-end encrypted messaging platform. Designed with a robust cryptographic foundation and scalable infrastructure, it offers secure 1-on-1 and group messaging, as well as WebRTC voice/video calling.

## 🔐 Cryptographic Foundation

Kurakani relies entirely on the industry-standard Double Ratchet Protocol, utilizing `@privacyresearch/libsignal-protocol-typescript`.

- **Perfect Forward Secrecy**: Handled natively by Libsignal's session management.
- **Race-Condition-Free Key Distribution**: Atomic database row-locking (`SELECT ... FOR UPDATE SKIP LOCKED`) ensures One-Time Pre-Keys (OTPKs) are never issued twice.
- **Zero-Knowledge Attachments**: Attachments are encrypted locally on the device via WebCrypto (AES-256-GCM) before being uploaded directly to S3 via temporary presigned URLs.
- **Group Fan-Out (SKDM)**: Group messaging uses Sender Key Distribution to optimize bandwidth and battery life.

*For exact cryptographic operations, refer to [CRYPTO_SPEC.md](./CRYPTO_SPEC.md).*

## 🏗️ Production Architecture & Infrastructure

Kurakani is built to deploy natively across high-availability cloud infrastructure, decoupled from local containers.

### Cloud Dependencies

| Service | Technology | Production Recommendation |
|---------|------------|---------------------------|
| **Database** | PostgreSQL + Drizzle ORM | **AWS RDS** or **Neon** (Requires Active Connection Pooling) |
| **Cache / State / PubSub** | Redis | **Redis Cloud Cluster** or **Upstash** |
| **Object Storage** | S3-compatible | **AWS S3** or **Cloudflare R2** |
| **STUN/TURN** | Coturn | Dedicated **Coturn Cluster** |

### Networking & Routing

- **Real-Time Push**: Powered by `Socket.io` using the `@socket.io/redis-adapter` for flawless multi-device synchronization and cross-instance scaling.
- **Rate Limiting**: Globally enforced at `1000 req/15m` and strictly limited on Authentication endpoints at `5 req/15m`, backed entirely by the Redis cluster (`rate-limit-redis`).
- **Memory Protection**: Hardened `express.json` request size limits (`100kb`) globally to prevent buffer overflow attacks.

## 🚀 Getting Started (Development)

The repository operates as a Turborepo monorepo encompassing the Next.js web application, Node/Express signaling server, Expo mobile app, and shared internal packages.

### Prerequisites
- Node.js (v20+)
- pnpm (v9+)
- Local Postgres Database
- Local Redis Server

### Setup
1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Copy the `.env.example` to `.env` and fill in your local Postgres/Redis URLs.
3. Migrate the database:
   ```bash
   cd packages/db && pnpm run push
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```

---
*Kurakani — Secure, Scalable, Zero-Knowledge Messaging.*
