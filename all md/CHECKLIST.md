# ✅ Implementation Verification Checklist
## Run this checklist BEFORE assuming anything is implemented

> Agent: For each item, open the actual file and verify the code exists.  
> Mark ✅ only after reading the file. Never mark ✅ based on assumption.

---

## 🔐 Cryptography (`packages/crypto`)

### X3DH Key Agreement
- [ ] `x3dh.ts` exists
- [ ] `generateIdentityKeyPair()` returns `{ publicKey: Uint8Array, secretKey: Uint8Array }` using `nacl.box.keyPair()`
- [ ] `generateSignedPreKey(identitySecretKey)` returns signed pre-key with Ed25519 signature
- [ ] `generateOneTimePreKeys(count)` returns array of `count` key pairs
- [ ] `x3dhSenderCalculate(senderIdentity, recipientBundle)` returns `{ sharedSecret: Uint8Array, ephemeralPublicKey: Uint8Array }`
- [ ] `x3dhReceiverCalculate(recipientIdentity, senderEphemeralKey, senderIdentityKey)` returns same shared secret
- [ ] NO placeholder returns like `return new Uint8Array(32).fill(0)`

### Symmetric Encryption
- [ ] `encrypt(plaintext: Uint8Array, key: Uint8Array)` exists
- [ ] Uses `nacl.secretbox()` with random 24-byte nonce OR WebCrypto AES-GCM with random 12-byte IV
- [ ] Returns `{ ciphertext: Uint8Array, nonce/iv: Uint8Array }` or combined buffer
- [ ] `decrypt(ciphertext: Uint8Array, key: Uint8Array, nonce: Uint8Array)` exists
- [ ] Returns `Uint8Array | null` (null on decryption failure, never throws plainly)

### Key Serialization
- [ ] `keyToBase64(key: Uint8Array): string` exists
- [ ] `base64ToKey(b64: string): Uint8Array` exists
- [ ] Keys stored as base64 strings in DB (not raw binary)

---

## 🗄️ Database (`packages/db`)

### Schema Tables
- [ ] `users` table exists with: `id`, `username`, `phone_hash`, `registration_id`, `created_at`
- [ ] `identity_keys` table: `user_id`, `public_key` (base64), `device_id`
- [ ] `signed_pre_keys` table: `user_id`, `key_id`, `public_key`, `signature`
- [ ] `one_time_pre_keys` table: `id`, `user_id`, `key_id`, `public_key`, `used` (boolean)
- [ ] `messages` table: `id`, `recipient_id`, `ciphertext`, `sealed_sender`, `timestamp`, `delivered_at`
- [ ] `conversations` table with `type` field
- [ ] `conversation_members` table
- [ ] `attachments` table with `media_url` and encrypted blobs
- [ ] `call_records` table
- [ ] `devices` table with `push_token`

### Drizzle Config
- [ ] `drizzle.config.ts` exists with correct DB URL
- [ ] Migrations folder exists with at least one migration file
- [ ] `db.ts` exports a drizzle DB instance

---

## ⚙️ Supabase Backend

### Authentication
- [ ] Use Supabase Auth for login/register
- [ ] Row Level Security (RLS) protects user data

### Key Distribution
- [ ] Keys stored in `identity_keys`, `signed_pre_keys`, and `one_time_pre_keys` tables
- [ ] One-time pre-key is marked as `used` after being fetched (prevents reuse)

### Messaging
- [ ] Messages inserted directly via Supabase client
- [ ] Ciphertext stored as-is (no server-side decryption attempt)
- [ ] Supabase Realtime channel for message receive
- [ ] Conversations queried via Supabase

### TURN Server
- [ ] `GET /api/turn` Next.js API route exists
- [ ] Returns HMAC time-limited credentials (not static credentials)
- [ ] Uses `process.env.TURN_SECRET` for HMAC

---

## 📱 Web App (`apps/web`)

### Crypto Integration
- [ ] `packages/crypto` imported (not reimplemented in web)
- [ ] Key generation called on first registration
- [ ] Keys stored in IndexedDB (not localStorage — localStorage is not secure enough)
- [ ] Keys never sent to server in plaintext

### State Management
- [ ] Zustand store exists for: `auth`, `conversations`, `messages`, `keys`
- [ ] Message decryption happens in the store/hook, not in the component

### UI Completeness
- [ ] Login/Register screen
- [ ] Conversation list screen
- [ ] Chat screen (send/receive)
- [ ] Settings screen (see Phase 7 in ROADMAP)
- [ ] Call screen

---

## 📱 Mobile App (`apps/mobile`)

### Same crypto as web
- [ ] Imports from `packages/crypto` (same library, not re-implemented)
- [ ] Uses `react-native-encrypted-storage` or `expo-secure-store` for key storage (not AsyncStorage)

### Screens
- [ ] Login/Register
- [ ] Conversation list
- [ ] ChatScreen (currently open per description)
- [ ] Settings
- [ ] Call screen

---

## 🚨 Red Flags — If Agent Finds These, Report Immediately

- ❌ Any file that returns hardcoded/zeroed Uint8Array from crypto functions
- ❌ Any file that logs `password`, `secretKey`, `privateKey`, or `accessToken` to console
- ❌ Any message stored as plaintext in the database
- ❌ JWT secret as a hardcoded string like `"secret"` or `"your-secret-key"`
- ❌ CORS set to `*` (allow all origins) in production config
- ❌ SQL queries built with string concatenation (SQL injection risk)
- ❌ Missing input validation on any POST/PUT endpoint
- ❌ Error responses that include stack traces or internal paths
