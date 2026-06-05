# 🛡️ Security Audit Checklist
## Run This Before Any Public Release

> Agent: Work through this checklist systematically.  
> Flag every ❌ finding immediately. Do not deploy with any 🔴 Critical items unresolved.

---

## 🔴 CRITICAL — Must Fix Before Launch

### Authentication
- [ ] JWT secret is cryptographically random (64+ chars), not "secret" or "password"
- [ ] JWT tokens expire (access: 15m, refresh: 7d max)
- [ ] Refresh tokens are invalidated on logout
- [ ] Login endpoint does NOT differentiate "wrong username" vs "wrong password" in error message
- [ ] Failed login attempts are rate-limited (max 5/15min per IP)
- [ ] Passwords are hashed with bcrypt (cost ≥ 10) or Argon2
- [ ] No plaintext passwords anywhere in code or logs

### Cryptography
- [ ] All crypto uses established libraries (tweetnacl, libsodium) — no homebrew crypto
- [ ] Random values use `crypto.getRandomValues()` or `nacl.randomBytes()` — never `Math.random()`
- [ ] Each message uses a fresh random nonce/IV — never reused
- [ ] Encryption keys never logged or returned in API responses
- [ ] Server NEVER decrypts messages (ciphertext stored/forwarded as-is)

### Input Validation
- [ ] ALL API endpoints validate input with zod or equivalent
- [ ] File upload: MIME type validated, size limited (e.g., max 100MB)
- [ ] String inputs: length limits enforced
- [ ] UUIDs validated before DB queries
- [ ] SQL queries use parameterized statements (Drizzle ORM handles this, but verify)

### API Security
- [ ] All sensitive endpoints require valid JWT
- [ ] CORS: `allowedOrigins` list is NOT `*`
- [ ] Rate limiting on all endpoints
- [ ] Request body size limited (`express.json({ limit: '10mb' })`)
- [ ] Helmet.js applied (adds security headers)
- [ ] HTTPS enforced in production (HTTP → HTTPS redirect)

### Error Handling
- [ ] Stack traces NOT returned in API error responses
- [ ] Generic error messages for auth failures (no information leakage)
- [ ] Unhandled promise rejections caught globally
- [ ] 500 errors logged server-side but not exposed to client

---

## 🟡 HIGH — Fix Within Sprint

### Session Security
- [ ] WebSocket connections authenticated (JWT validated on connect)
- [ ] Disconnected clients removed from presence map
- [ ] Dead WebSocket connections cleaned up (heartbeat)
- [ ] No sensitive data in WebSocket error messages

### Data Protection
- [ ] Phone numbers stored as hash, not plaintext
- [ ] Avatar images encrypted before storing in MinIO
- [ ] Attachment encryption keys never stored server-side
- [ ] OTPK (one-time pre-keys) deleted/marked used after consumption

### Key Security
- [ ] `GET /api/keys/:userId` requires auth (can't fetch keys anonymously)
- [ ] OTPK consumption is atomic (no race condition allowing key reuse)
- [ ] Signed pre-key signatures are verified server-side on upload
- [ ] Old signed pre-keys are kept for ~30 days (to decrypt old sessions)

---

## 🟢 MEDIUM — Fix Before Scale

### Logging & Monitoring
- [ ] No user-identifiable data in logs (no phone numbers, usernames in log strings)
- [ ] No encryption keys or tokens in logs
- [ ] Access logs exist for security incident investigation
- [ ] Failed auth attempts logged (for security monitoring)
- [ ] Log rotation configured

### Infrastructure
- [ ] Database not exposed to public internet
- [ ] Redis requires password auth
- [ ] MinIO buckets are NOT public
- [ ] Coturn uses time-limited HMAC credentials (not static)
- [ ] All inter-service communication on internal network

### Dependencies
- [ ] Run `npm audit` — fix all CRITICAL and HIGH vulnerabilities
- [ ] Dependencies updated to non-EOL versions
- [ ] Lock file (`package-lock.json` or `yarn.lock`) committed

---

## Security Test Cases

Test these manually before launch:

### Auth Tests
```
1. Register with valid data → should succeed
2. Register same username twice → should fail (409)
3. Login with wrong password → should fail (401, same message as wrong username)
4. Login with non-existent user → should fail (401, same message as above)
5. Call protected endpoint with no token → should fail (401)
6. Call protected endpoint with expired token → should fail (401)
7. Call protected endpoint with tampered token → should fail (401)
8. Refresh with valid refresh token → should get new tokens
9. Refresh with used/invalidated token → should fail
```

### Input Validation Tests
```
1. Send empty JSON body to POST /api/messages → should fail (400)
2. Send message with recipientId = "' OR '1'='1" → should fail validation (400)
3. Upload file of 500MB → should fail (413 or 400)
4. Set username to "<script>alert(1)</script>" → should fail validation
5. Set username to "" (empty string) → should fail validation
```

### Crypto Tests
```
1. Encrypt a message, decrypt with correct key → should return original
2. Encrypt a message, decrypt with wrong key → should return null
3. Tamper with ciphertext, decrypt → should return null (authenticated encryption)
4. Check that two encryptions of same message produce different ciphertext (different nonces)
```

### Rate Limiting Tests
```
1. Send 1001 requests in 15 minutes → 1001st should return 429
2. Send 11 login attempts in 15 minutes → 11th should return 429
```

---

## Common Vulnerabilities to Check

| Vulnerability | Where to Check | How to Test |
|--------------|---------------|-------------|
| SQL Injection | All DB queries | `' OR '1'='1` in inputs |
| XSS | Web frontend | `<script>alert(1)</script>` in display fields |
| CSRF | State-changing endpoints | Request without auth token |
| Insecure Direct Object Reference | `GET /messages/:id`, `GET /attachments/:id` | Access another user's resource ID |
| Broken Access Control | All endpoints | Remove auth header, try with other user's JWT |
| Security Misconfiguration | CORS, Headers | Check response headers |
| Sensitive Data Exposure | API responses | Check for passwords, keys in responses |
| Mass Assignment | PUT /users/me | Send `{ "role": "admin" }` |
