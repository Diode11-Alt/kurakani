# AGENT PRIME DIRECTIVE
## You are a coding agent for a Signal-like E2EE Messaging Platform

---

## ⚠️ CRITICAL RULES — READ BEFORE EVERY TASK

1. **NEVER assume something is implemented.** Always read the actual file before editing it.
2. **NEVER delete working code.** Only append, fix, or replace broken sections.
3. **NEVER skip error handling.** Every async function must have try/catch.
4. **NEVER hardcode secrets.** All secrets go in `.env`. Never commit `.env`.
5. **ALWAYS verify imports exist** before using them.
6. **ALWAYS run the app after changes** to confirm it doesn't crash.
7. **NEVER mock crypto.** Never replace real encryption with fake/placeholder logic.
8. **ONE TASK AT A TIME.** Complete and verify each step before moving to the next.

---

## 📁 Monorepo Structure

```
/
├── apps/
│   ├── web/             ← Next.js 16 frontend
│   └── mobile/          ← React Native app
├── packages/
│   ├── crypto/          ← X3DH, AES-GCM, key management
│   └── db/              ← Drizzle ORM + PostgreSQL schema
├── docs/                ← All .md documentation (this folder)
├── .env.example         ← Template for environment variables
└── docker-compose.yml   ← Local dev infrastructure
```

---

## 🔑 Environment Variables Required

The agent must ALWAYS ensure these exist in `.env` before running anything:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# TURN Server (Coturn)
TURN_SERVER_URL=turn:localhost:3478
TURN_USERNAME=turnuser
TURN_PASSWORD=<random string>
TURN_SECRET=<random string>

# App
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000

# Push Notifications (optional)
FCM_SERVER_KEY=
APNS_KEY_ID=
APNS_TEAM_ID=
```

---

## 🚫 Things The Agent Must NEVER Do

- Never write `console.log(password)` or log any sensitive data
- Never return plaintext passwords in API responses
- Never skip input validation on any endpoint
- Never use `eval()` or `Function()` constructor
- Never use `Math.random()` for cryptographic purposes (use `crypto.getRandomValues`)
- Never store plaintext messages in the database
- Never expose internal error stack traces to API clients
- Never use `SELECT *` without a specific reason
- Never disable SSL/TLS verification in production code

---

## ✅ Definition of "Done" for Any Feature

A feature is only DONE when:
- [ ] Core logic implemented
- [ ] Input validation added (zod schema)
- [ ] Error handling added (try/catch + proper HTTP status)
- [ ] Database migration created (if schema changed)
- [ ] Basic test written
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] Relevant `.md` documentation updated

---

## 📋 Task Execution Template

When given a task, follow this exact pattern:

```
TASK: [task name]
1. READ: Read all relevant existing files first
2. PLAN: List exactly what files will be created/modified
3. IMPLEMENT: Make changes one file at a time
4. VERIFY: Check for TypeScript errors, imports, logic
5. TEST: Run or describe how to test the change
6. DOCUMENT: Update relevant .md if needed
```

---

## 🗺️ Current Roadmap

See `ROADMAP.md` for the full prioritized task list.
See `CHECKLIST.md` for implementation verification.
See individual feature files in `docs/` for detailed specs.
