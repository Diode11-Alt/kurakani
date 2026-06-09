

### Database Schema & RLS Logical Errors (1-20)

1. **Plaintext Storage**: The `messages.content` column stores text in plaintext, violating the app's fundamental E2EE promises.
2. **Nullable Ciphertext**: The `ciphertext` column was made nullable via `20260603000007_remove_e2ee.sql`, completely breaking the cryptographic storage design.
3. **Exposed Attachment Keys**: `attachment_key` is stored openly in the `messages` table on the server, nullifying attachment encryption.
4. **Exposed Attachment IVs**: `attachment_iv` is also stored server-side, granting the server full capability to decrypt all media.
5. **Open Storage Bucket**: The Supabase storage bucket for attachments is fully readable by any authenticated user, regardless of conversation membership.
6. **Pre-Key Harvesting**: The `one_time_pre_keys` table allows an open `SELECT` for any authenticated user, permitting malicious key harvesting.
7. **Exposed Phone Hashes**: The `users` table exposes `phone_hash` globally to all authenticated users via an over-permissive RLS policy.
8. **Exposed Profile Keys**: The `profile_key` within the `users` table is globally readable, risking impersonation or key manipulation.
9. **Fake Audit Logs**: The `audit_logs` table has a `WITH CHECK (true)` policy, letting any authenticated user inject fake logs.
10. **Bypassed Block Lists**: `conversation_members` RLS allows any member to add any other user, effectively bypassing block lists.
11. **Broken Message Hierarchy**: `reply_to_message_id` does not validate if the parent message actually belongs to the same conversation.
12. **Zombie Group Policies**: Group messaging is disabled via DB triggers, but RLS read/write policies for group conversations are still active.
13. **Hardcoded Plaintext in Views**: The `conversation_summaries` VIEW reads `content` directly instead of computing off `ciphertext`, baking plaintext dependency into the UI layer.
14. **Residual Plaintext Risks**: The `messages_search_vector` was dropped to stop plaintext indexing, but the actual plaintext content remains fully accessible.
15. **Missing Rate Limits**: There are no server-side rate limits on `messages` `INSERT` operations, leaving the database vulnerable to write spam.
16. **Unique Constraint Flaws**: The `UNIQUE(message_id, user_id, emoji)` constraint on message reactions allows users to spam the DB with hundreds of different emojis.
17. **Call Log Metadata Leaks**: The system inserts identical plaintext and ciphertext records for call duration logs.
18. **Visible Active Status**: The `is_active` flag in the `users` table is publicly readable by all authenticated accounts.
19. **Reaction Read Bloat**: Reactions are fetched via secondary round-trip queries instead of efficient Supabase nested joins.
20. **Unchecked Conversation Generation**: Missing RLS rate limiting on how many `conversations` a user can create concurrently.

### Cryptography & E2EE Implementation Flaws (21-40)

21. **Decryption Address Bug**: Web decrypts messages using the local user's `deviceId` instead of the sender's `deviceId`, causing fatal `[Encrypted Message]` errors.
22. **Silent Key Failures**: E2EE key re-registration fails silently for legacy users migrating into the new architecture.
23. **Synchronous State Reads in Async Maps**: `useAuthStore.getState()` is invoked synchronously inside async decryption loops, causing race conditions with the `deviceId`.
24. **Orphaned Encryption Hook**: The `encryptAttachment()` function exists in the crypto package but is never called by the web uploader hook.
25. **Missing Key Verification (No Safety Numbers)**: Trust-on-First-Use (TOFU) is implemented without a UI to verify Safety Numbers, leaving users vulnerable to MITM attacks.
26. **Orphaned Sealed Sender**: Sealed Sender code is implemented in the crypto package but never wired into the actual message transport.
27. **Non-Standard KDF**: The Sealed Sender key derivation function uses a simple hash instead of the Signal-standard X3DH + HKDF.
28. **Broken HKDF Fallback**: The HKDF fallback uses a truncated SHA-512 rather than proper HMAC extract-and-expand routines.
29. **Binary Corruption via atob**: `atob` and `btoa` are incorrectly used for Base64 manipulation, which corrupts binary crypto strings exceeding 127 bytes.
30. **Mobile Architecture Flaw**: The mobile app uses static symmetric shared keys instead of the Signal Double Ratchet.
31. **No Forward Secrecy on Mobile**: Static mobile keys mean zero forward secrecy; one leaked key exposes all past messages.
32. **No Break-in Recovery**: The lack of ratcheting on mobile means there is no break-in recovery post-compromise.
33. **Ghost Stores**: `WebSignalStore` is fully modeled and initialized but never actively hooked into the chat rendering process.
34. **Disabled Type Safety**: Type safety is completely stripped in crypto files via `// @ts-nocheck` comments.
35. **Missing Responder Logic**: `establishSessionAsResponder` is missing from the cryptographic wrappers, making 2-way session instantiation impossible.
36. **Incomplete Multi-Device Support**: Multi-device routing is modeled in the DB but excluded from session management logic.
37. **Untested Persistence**: Session ratchet persistence lacks any test coverage to ensure keys survive an app restart.
38. **Hardcoded Device Identifiers**: The encryption step hardcodes `deviceId: 1`, assuming a rigid single-device landscape.
39. **Decrypted Previews Failed**: Quoted reply previews fetch the plaintext `content` column rather than decrypting the original ciphertext locally.
40. **Hard Crashes on Decryption**: Decryption failures throw hard exceptions rendering a scary generic string instead of failing gracefully for media or placeholders.

### Backend API & Service Integrations (41-55)

41. **Hardcoded TURN Secrets**: The `TURN_SECRET` falls back to `your_super_secret_turn_key_here` in production environments.
42. **Exposed Credentials**: Hardcoded TURN server credentials (`guffuser`/`guffpass`) are visible directly inside `VideoCall.tsx`.
43. **Public URL Generation**: `useFileUpload` generates public storage URLs instead of securely signed, time-limited URLs for attachments.
44. **No Server File Validation**: The backend does not validate file MIME types or sizes, strictly relying on easily-bypassed client-side HTML checks.
45. **Server-Side ILIKE Searches**: Full-text message search relies on `ilike` querying on the `content` column, which inherently breaks the E2EE privacy model.
46. **SQL Injection Risks**: Message search uses unescaped user input, risking partial SQL injection and malformed query crashing.
47. **Server Endpoint Mismatch**: The mobile app points via Socket.io to a missing legacy Node server, whereas the Web app uses Supabase Realtime.
48. **Platform Isolation**: Due to the backend mismatch, mobile and web users are physically incapable of communicating with one another.
49. **Dangerous Hook Exports**: `useFileUpload` manually exports the raw `setUploading` state, allowing components to accidentally freeze the UI indefinitely.
50. **Insecure Docker Configs**: The `docker-compose.yml` uses weak default passwords like `minioadmin123`.
51. **SSR XSS Vulnerability**: `sanitizeMessage()` bypasses DOMPurify completely during Server-Side Rendering (SSR).
52. **Missing CSP**: There is no Content Security Policy (CSP) in the Next.js configurations to prevent XSS payloads from extracting Dexie data.
53. **Missing Push Payloads**: `expo-notifications` is required on mobile but no push initialization token flow reaches the backend.
54. **Blind Data Fetches**: Real-time read/delivered indicators blindly invoke `loadMessages()` without passing the required arguments.
55. **High JWT TTL**: The `.env.template` provisions an insecure `30d` expiry time for standard JWT access tokens.

### Web Client Messaging Logic & State Bugs (56-75)

56. **Insecure Auth Storage**: `deviceId` is stored insecurely in `localStorage`, making it an easy target for XSS extraction.
57. **Plaintext Local DB**: The local browser cache for messages (Dexie IndexedDB) stores data entirely in plaintext.
58. **Array Mutations**: Search results rely on `searchResults.reverse()`, mutating the React state array directly in place instead of creating a copy.
59. **Stale Reply Contexts**: Quoted replies display "Replied to a message" if the parent message was paginated away and is currently unloaded.
60. **Stubbed Forwarding**: The "Forward" message feature fails silently, triggering a generic placeholder toast.
61. **Stubbed Deletions**: The "Delete for Everyone" feature throws placeholder errors instead of actually deleting payloads.
62. **CSS Overflows**: The context menu relies on hardcoded pixel heights, overflowing and clipping off the screen on small viewports.
63. **Ignored Parameters**: The `loadMessages(other.id)` initialization passes an ID, but the function signature doesn't actually accept or use it.
64. **Duplicate Message Risks**: Refocusing the browser tab refetches the list, disrupting and duplicating any active optimistic UI messages.
65. **Unstable References**: Missing `useCallback` on pagination routines causes unnecessary widespread re-renders.
66. **Any Type Proliferation**: Widespread use of `any` disables TS compiler safety in the heavy `messages/[id]/page.tsx` view.
67. **DB Over-fetching**: The chat UI lazily fetches `select("*")`, dragging heavy (and unused) `ciphertext` blobs across the network.
68. **Missing Error Boundaries**: There are no React error boundaries encapsulating individual message rows, so one corrupt message crashes the chat thread.
69. **Audio Hook Leaks**: The audio recorder hook leaves open streams and leaks memory if the component is unmounted mid-record.
70. **Sanitization Bypasses**: `sanitizeMessage()` is never called when rendering legacy or plain text messages in the chat view.
71. **Stale Typing Indicators**: The Supabase Broadcast for typing leaves a stale "typing..." state permanently if network disconnection occurs midway.
72. **Absence of Heartbeats**: The online presence indicator relies on naive enter/leave broadcasts with no periodic heartbeat.
73. **Sync File Chunking**: File upload doesn't debounce or throttle file chunks.
74. **Image Compression Blocking**: Browser image compression occasionally blocks the main UI thread during heavy photo uploads.
75. **Emoji Picker Overlap**: The inline emoji picker completely overlaps the text input field on narrow mobile-web viewports.

### Mobile Client Mismatches & UX/Deployment Flaws (76-100)

76. **Mobile Store Stubs**: `MobileSignalStore` is a committed empty stub lacking all real cryptographic implementations.
77. **React Version Clashes**: Web uses React v19 while Mobile uses React v18, causing internal shared hook discrepancies.
78. **Missing UI Code**: Crucial components like the `FlatList` for mobile chat rendering are absent from the committed codebase.
79. **Broken Imports**: Signal crypto imports use highly fragile relative paths (`file:../../`) instead of the standard Turborepo workspace protocol.
80. **Visual Shells**: High-level mobile screens (`ProfileScreen`, `ExploreScreen`) are non-functional visual shells.
81. **Abandoned Zod Schemas**: The robust `@signal/types` Zod schemas are ignored and not imported into the mobile client.
82. **Endless Socket Loops**: The mobile Socket.io connection endlessly loops and drains battery since its targeted Node server doesn't exist.
83. **Shared UI is Empty**: The `packages/ui` workspace exists but contains absolutely no components, causing UI duplication across Web/Mobile.
84. **False Agent Specs**: `AGENT.md` falsely instructs automated agents to look for an Express server and Drizzle ORM.
85. **Privacy Policy Legal Liability**: The app's privacy documentation claims zero-knowledge E2EE, exposing the developers to legal liability due to plaintext storage.
86. **Infinite Router Loops**: The group messaging guard redirects users to `/messages`, often causing endless client-side loops.
87. **Zero Automated Tests**: There are exactly zero unit, integration, or E2E tests within the entire Turborepo workspace.
88. **Useless CI Pipelines**: GitHub Actions runs a pure `pnpm build`, providing zero automated linting, auditing, or TS type-checking.
89. **Stale Firebase Keys**: Firebase configuration files contain comments regarding stale legacy keys that were pushed previously.
90. **Missing Checklists**: The developer checklist asks maintainers to verify `x3dh.ts`, a file that doesn't exist anywhere in the repo.
91. **Mid-stream Constraint Breaking**: The `remove_e2ee` migration breaks the `NOT NULL` DB constraint mid-stream, threatening the stability of migration rollbacks.
92. **Unvalidated Metadata Inserts**: Malformed metadata and JSON objects can be inserted into messaging rows due to missing DB-level triggers/schemas.
93. **Unsanitized Log Ingestion**: Because of the open audit log insert policy, malicious scripts can inject XSS directly into the admin monitoring dashboard.
94. **No Break-Glass Recovery**: The repository architecture entirely lacks a backend administration or moderation console for managing abuse.
95. **High State Coupling**: Zustand stores intimately mix UI state with Cryptographic states (like `deviceId` overlapping into Auth contexts).
96. **Incomplete Unread Badging**: Unread message counts rely on optimistic UI updates rather than a dedicated aggregate query table, prone to desyncs.
97. **Offline Sync Failures**: Web Dexie DB provides local viewing but lacks a sync queue; messages sent while offline are immediately dropped.
98. **Unencrypted Deep Links**: Mobile deep links (if added) route sensitive tokens without checking URI payloads.
99. **Missing Data Pruning**: The Supabase database contains no cron jobs or triggers to automatically prune expired Stories or legacy logs.
100. **Ghost User States**: Because `users.is_active` is public but not enforced at the Auth level, deactivated users still appear in Search results.