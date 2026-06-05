# ⚙️ Backend API Specification
## All endpoints the server must implement

> Agent: Implement endpoints in the order listed. Do not skip validation.  
> Every endpoint must: validate input (zod), authenticate (JWT), handle errors.

---

## Base URL: `https://your-domain.com/api`

## Auth Headers
All protected endpoints require:
```
Authorization: Bearer <JWT access token>
```

---

## 🔑 Auth Endpoints

### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "phoneNumber": "+9779812345678",  // E.164 format
  "username": "john_doe",           // 3-30 chars, alphanumeric + underscore
  "password": "SecurePassword123!"  // min 8 chars
}
```

**Server Actions:**
1. Validate input with zod
2. Check username not taken
3. Hash phone: `sha256(phoneNumber + PHONE_PEPPER)` — store hash, NOT number
4. Hash password: `bcrypt(password, 12)`
5. Generate `registrationId` = random 14-bit integer
6. Create user record
7. Generate JWT access token (15m) + refresh token (7d)
8. Store refresh token in Redis with TTL

**Response 201:**
```json
{
  "userId": "uuid",
  "registrationId": 12345,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Response 409:** `{ "error": "Username already taken" }`  
**Response 400:** `{ "error": "Invalid phone number format" }`

---

### POST /api/auth/login
**Request:**
```json
{
  "username": "john_doe",
  "password": "SecurePassword123!"
}
```
**Response 200:** Same as register (new tokens)  
**Response 401:** `{ "error": "Invalid credentials" }` (same message for both wrong user/pass — never reveal which)

---

### POST /api/auth/refresh
**Request:**
```json
{ "refreshToken": "eyJ..." }
```
**Response 200:** `{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }`  
**Response 401:** `{ "error": "Invalid or expired refresh token" }`

---

### POST /api/auth/logout
**Auth required**  
**Action:** Delete refresh token from Redis  
**Response 200:** `{ "success": true }`

---

## 🔑 Key Distribution Endpoints

### POST /api/keys/register
Upload key bundle after registration. Called once on first launch.

**Auth required**

**Request:**
```json
{
  "identityKey": "<base64 public key>",
  "signedPreKey": {
    "keyId": 1,
    "publicKey": "<base64>",
    "signature": "<base64 Ed25519 signature>"
  },
  "oneTimePreKeys": [
    { "keyId": 1, "publicKey": "<base64>" },
    { "keyId": 2, "publicKey": "<base64>" }
    // ... up to 100
  ]
}
```

**Server Actions:**
1. Verify `signedPreKey.signature` using user's `identityKey`
2. Store identity key
3. Store signed pre-key
4. Store all OTPKs (marked `used: false`)

**Response 200:** `{ "success": true }`  
**Response 400:** `{ "error": "Invalid signed pre-key signature" }`

---

### GET /api/keys/:userId
Fetch a user's key bundle to initiate a session.

**Auth required**

**Response 200:**
```json
{
  "identityKey": "<base64>",
  "registrationId": 12345,
  "signedPreKey": {
    "keyId": 1,
    "publicKey": "<base64>",
    "signature": "<base64>"
  },
  "oneTimePreKey": {   // null if none available
    "keyId": 7,
    "publicKey": "<base64>"
  }
}
```

**Server Action:** Mark the returned OTPK as `used: true` (atomic operation — use DB transaction)

---

### POST /api/keys/one-time
Upload additional one-time pre-keys when running low.

**Auth required**

**Request:**
```json
{
  "oneTimePreKeys": [
    { "keyId": 101, "publicKey": "<base64>" }
  ]
}
```
**Response 200:** `{ "count": 50 }` — total remaining OTPK count

---

### GET /api/keys/count
Check how many OTPKs remain for current user.

**Auth required**

**Response 200:** `{ "count": 23 }`

---

## 💬 Message Endpoints

### POST /api/messages
Send an encrypted message.

**Auth required**

**Request:**
```json
{
  "recipientId": "uuid",
  "conversationId": "uuid",  // or null for first message
  "ciphertext": "<base64 encrypted message>",
  "messageType": "text",     // text | attachment | call | reaction
  "timestamp": 1748700000000,
  "sealedSenderEnvelope": "<base64>" // optional
}
```

**Server Actions:**
1. Validate recipientId exists
2. Store message (ciphertext only — no decryption)
3. Push to recipient via WebSocket if online
4. Else add to Redis queue for offline delivery
5. Send push notification (fire-and-forget)

**Response 201:**
```json
{
  "messageId": "uuid",
  "timestamp": 1748700000000
}
```

---

### GET /api/conversations
Get all conversations for current user.

**Auth required**

**Response 200:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "type": "direct",
      "lastMessageAt": 1748700000000,
      "members": [{ "userId": "uuid", "username": "alice" }]
    }
  ]
}
```

---

### GET /api/conversations/:id/messages
Get messages in a conversation (paginated, oldest first in page).

**Auth required**

**Query params:**
- `before` — cursor timestamp (ISO string)
- `limit` — max 50

**Response 200:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "senderId": "uuid",    // populated only if not sealed sender
      "ciphertext": "<base64>",
      "messageType": "text",
      "timestamp": 1748700000000,
      "deliveredAt": 1748700001000,
      "readAt": null
    }
  ],
  "hasMore": true,
  "nextCursor": "1748699000000"
}
```

---

### GET /api/messages/pending
Get messages queued while offline.

**Auth required**

**Response 200:**
```json
{
  "messages": [ ... ],
  "count": 5
}
```

**Server Action:** Delete from queue after returning (mark as delivered)

---

### PUT /api/messages/:id/read
Mark a message as read.

**Auth required**

**Response 200:** `{ "success": true }`

---

## 📎 Attachment Endpoints

### POST /api/attachments/upload-url
Get a presigned URL to upload an encrypted file to MinIO directly.

**Auth required**

**Request:**
```json
{
  "filename": "photo.jpg",
  "size": 1048576,
  "mimeType": "image/jpeg"
}
```

**Response 200:**
```json
{
  "attachmentId": "uuid",
  "uploadUrl": "https://minio.../upload-url",
  "expiresAt": 1748700300000
}
```

---

### GET /api/attachments/:id/download-url
Get presigned download URL.

**Auth required** + must be member of the conversation the attachment belongs to.

**Response 200:**
```json
{
  "downloadUrl": "https://minio.../download-url",
  "expiresAt": 1748700300000
}
```

---

## 👤 User/Profile Endpoints

### GET /api/users/me
Get own profile.

**Response 200:**
```json
{
  "userId": "uuid",
  "username": "john_doe",
  "displayName": "John",
  "avatarUrl": null,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### PUT /api/users/me
Update profile.

**Request:** (all optional)
```json
{
  "displayName": "John Doe",
  "bio": "Hey there"
}
```

### GET /api/users/search?q=john
Search users by username (for adding contacts).

**Response 200:**
```json
{
  "users": [
    { "userId": "uuid", "username": "john_doe", "displayName": "John" }
  ]
}
```

---

## 📞 Call Endpoints

### GET /api/turn
Get Coturn credentials for WebRTC.

**Auth required**

**Response 200:**
```json
{
  "iceServers": [
    { "urls": "stun:your-turn-server:3478" },
    {
      "urls": "turn:your-turn-server:3478",
      "username": "1748700000:userId",
      "credential": "<HMAC-SHA1 of username>"
    }
  ]
}
```

**Implementation:**
```typescript
const timestamp = Math.floor(Date.now() / 1000) + 86400; // Valid 24h
const username = `${timestamp}:${userId}`;
const credential = crypto
  .createHmac('sha1', process.env.TURN_SECRET)
  .update(username)
  .digest('base64');
```

---

## 🛡️ Settings Endpoints

### GET /api/settings/privacy
**Response:** `{ "lastSeen": "everyone", "readReceipts": true, "profilePhoto": "contacts" }`

### PUT /api/settings/privacy
**Request:** `{ "lastSeen": "nobody", "readReceipts": false }`

### GET /api/settings/notifications
**Response:** `{ "pushEnabled": true, "previewInNotifications": false }`

### PUT /api/settings/notifications

### DELETE /api/users/me
Delete account (with 30-day grace period).

**Response 200:**
```json
{
  "scheduledDeletionAt": "2026-07-01T00:00:00Z",
  "message": "Your account will be deleted in 30 days. Log in to cancel."
}
```

---

## ❤️ Health Check

### GET /health
No auth required.

**Response 200:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "minio": "connected",
  "uptime": 3600
}
```

**Response 503 (any dependency down):**
```json
{
  "status": "degraded",
  "database": "error",
  "redis": "connected",
  "minio": "connected"
}
```

---

## 🔌 WebSocket Events

### Client → Server
```
ws://server/ws?token=<JWT>

Events client sends:
- { type: "message:send", payload: { recipientId, ciphertext, ... } }
- { type: "typing:start", payload: { conversationId } }
- { type: "typing:stop", payload: { conversationId } }
- { type: "call:offer", payload: { recipientId, sdp, turnCredentials } }
- { type: "call:answer", payload: { callId, sdp } }
- { type: "call:ice-candidate", payload: { callId, candidate } }
- { type: "call:reject", payload: { callId } }
- { type: "call:hangup", payload: { callId } }
- { type: "ping" }
```

### Server → Client
```
Events server sends:
- { type: "message:new", payload: { messageId, ciphertext, senderId, timestamp } }
- { type: "message:delivered", payload: { messageId } }
- { type: "message:read", payload: { messageId } }
- { type: "typing:start", payload: { userId, conversationId } }
- { type: "typing:stop", payload: { userId, conversationId } }
- { type: "call:incoming", payload: { callId, callerId, sdp } }
- { type: "call:ice-candidate", payload: { callId, candidate } }
- { type: "call:rejected", payload: { callId } }
- { type: "call:ended", payload: { callId } }
- { type: "keys:low", payload: { remaining: 8 } }  // When OTPKs < 10
- { type: "pong" }
```
