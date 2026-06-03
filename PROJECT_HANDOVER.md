# 📦 Kurakani / Signal Clone - Deep Technical Handover

> [!NOTE]
> This document provides an exhaustive technical analysis and handover for the Signal Clone application. It details the precise internal mechanics of the architecture, recent stabilization fixes, and a highly specific roadmap for the remaining engineering phases.

## 🏗️ Core Architecture & Codebase Deep Dive

The project is structured as a **Turborepo monorepo** with three primary applications (`web`, `server`, `mobile`) and several shared packages (`@signal/db`, `@signal/crypto`, `@signal/types`).

### 1. Database Schema (Migrated to Supabase)
The database has been fully migrated to **Supabase** (Postgres 15+). The old `drizzle` schemas have been ported into raw SQL migrations located in `supabase/migrations/`:
- **`20260602000000_signal_init.sql`**: Contains `users`, `conversations`, `conversation_members`, and `messages`. All tables are secured with strict **Row Level Security (RLS)** to enforce E2EE privacy boundaries.
- **`20260602000001_signal_crypto.sql`**: Contains `identity_keys`, `signed_pre_keys`, and `one_time_pre_keys` for the WebCrypto X3DH key agreement protocol.
- **`20260602000002_signal_storage.sql`**: Initializes the public `attachments` S3 bucket used for encrypted attachment uploads.

### 2. Real-Time WebRTC & Signaling (Transitioning to Supabase Realtime)
The custom Socket.IO server (`apps/server`) and Redis adapter are being **decommissioned**. 
WebRTC signaling and presence are being transitioned to **Supabase Realtime**:
- **Presence**: Supabase Presence channels will track online status.
- **Broadcast**: Supabase Broadcast channels (`signal-webrtc`) will route `webrtc-offer` and `ice-candidate` messages directly between clients, eliminating the need for an intermediate Node.js server.

### 3. State Management & Frontend (`apps/web/src/store/`)
The Next.js 14 Web client uses **Zustand** for modular global state:
- **`authStore.ts`**: Manages JWTs and user data. *Critical Fix Applied*: It now synchronously persists tokens to `idb-keyval` (IndexedDB) to prevent race conditions during SSR and client hydration.
- **`messageStore.ts`**: Handles client-side message caching, decryption queues, and optimistic UI updates for chat threads.
- **`chatStore.ts`**: Manages active conversation IDs and typing indicators.
- **`uiStore.ts`**: Controls slide-overs, modals, and theme settings.

### 4. End-to-End Encryption (`packages/crypto/src/`)
A custom implementation of the Signal Protocol using the Native Web Crypto API:
- **`session.ts`**: Handles the Double Ratchet and X3DH key agreements.
- **`hkdf.ts`**: HMAC-based Extract-and-Expand Key Derivation Function used to derive ephemeral message keys.
- **`sealed-sender.ts`**: Implements Sealed Sender technology to hide the sender's identity from the server.
- **`attachments.ts`**: AES-GCM encryption for binary streams before they are uploaded to S3.

---

## 🛠️ Resolved Technical Debt & Hardening

During the stabilization sprint, the following structural issues were completely eradicated:

1. **The 401 "Red Screen of Death"**: Turbopack/Next.js was surfacing unhandled 401 API rejections during SSR/hydration. `apps/web/src/lib/api.ts` was patched to silently catch 401s, clear IndexedDB tokens (`clearTokens()`), and force a `window.location.href` redirect to `/login` without crashing the React tree.
2. **IndexedDB vs localStorage Sync**: `authStore` was heavily refactored to enforce single-source-of-truth in `idb-keyval`, ensuring multi-tab syncing and resolving random logouts.
3. **Supabase ➔ S3 Presigned URL Migration**: Replaced legacy, slow Supabase SDK calls with standard AWS SDK v3. Attachments now request a presigned POST URL via `/api/attachments/upload-url` and upload directly from the browser to MinIO/S3, eliminating Node.js memory bottlenecks.
4. **Postgres & Cron Hard Crashes**: Fixed the `.env` default connection string (`signal_user` failure) and repaired the `node-cron` job in the Express server that was crashing due to the `postgres-js` driver returning an array instead of a `.count` property when deleting ephemeral messages.
5. **Next.js Turbopack Module Resolutions**: 
   - Cleaned up illegal inline `require()` statements in the backend server.
   - Fixed broken relative paths for `SocketProvider`.
   - Corrected API endpoint strings (`/api/conversations` ➔ `/api/messages/conversations`).
   - Added missing Firebase SDKs (`firebase/app`, `firebase/messaging`) to the web workspace to resolve turbopack module compilation failures.

---

## 📋 Actionable Roadmap (What Needs To Be Done)

To fully transition this application to a robust production environment, execution must continue on the following specific tracks:

### 1. Execute Supabase Frontend Migration (Phase 2 & 3)
The backend architecture has successfully shifted to Supabase. The next engineer must complete the frontend rewiring in `apps/web`:
- [ ] **Complete API Replacement**: Refactor the ~900 line `apps/web/src/app/(app)/messages/[id]/page.tsx`. Replace all `fetch()` calls to the Express API with `supabase.from().insert/select` and `supabase.storage.from('attachments').upload()`.
- [ ] **Socket.io ➔ Supabase Realtime**: Rename `SocketProvider.tsx` to `RealtimeProvider.tsx`. Bind `supabase.channel('messages').on('broadcast', { event: 'call-initiate' }, ...)` to handle incoming video calls.
- [ ] **Decommission Old Backend**: Once the frontend is fully pointing at Supabase, delete `apps/server` and `packages/db`.

### 2. Mobile App (React Native `mobile/`)
- [ ] **Crypto Polyfilling**: React Native does not natively support the Web Crypto API. You must configure `react-native-quick-crypto` or similar polyfills so that the `@signal/crypto` package compiles and runs performantly on iOS/Android.
- [ ] **Push Notifications (FCM/APNs)**: Integrate React Native Firebase. The web app currently requests Firebase Web tokens, but the mobile app needs native device token registration routed to the backend `sessions` table.
- [ ] **Background Tasks**: Implement background syncing and decryption queues for when the app wakes up from a push notification payload.

### 3. Frontend / UX Polish
- [ ] **IndexedDB Message Caching**: The frontend decrypts messages on the fly but does not yet persistently cache the *plaintext* locally. Implement a local database (e.g., Dexie.js) to store decrypted threads for instant offline loading.
- [ ] **WebRTC UI**: Build out the incoming call screen (Ringing, Accepted, Rejected states) utilizing the `call-initiate` socket events currently wired up in the backend.
- [ ] **PreKey Exhaustion**: The client uploads 100 One-Time PreKeys on registration. Implement a cron/worker on the client to check `/api/keys/count` and restock PreKeys when the server runs low.

To fully transition this application to a robust production environment, the following areas require attention:

### 1. Database & Infrastructure
- [ ] **Supabase Edge Functions**: If any complex server-side validation is required for the Signal Protocol that cannot be handled by RLS (e.g. generating signed PreKeys via HSM), deploy them as Deno Edge Functions.
- [ ] **Production TURN Servers**: WebRTC voice/video calls will fail on distinct networks without a production TURN server. You can integrate Twilio Network Traversal tokens directly into the frontend or a Supabase Edge Function.

### 2. Frontend / Security
- [ ] **Key Rotation**: The Signal Protocol implementation needs robust handling for PreKey exhaustion and identity key rotation.
- [ ] **HTTPS / WSS enforcement**: Ensure Secure cookies and strict WSS (WebSocket Secure) in production. Turbopack is currently complaining about self-signed certs.
- [ ] **React 19 Peer Dependency Warnings**: Several libraries (e.g., `lucide-react`, `firebase`) throw peer dependency warnings regarding React 19. These are harmless now but should be updated as the ecosystem catches up.

### 3. Mobile App (React Native)
- [ ] **E2E Encryption Integration**: The `@signal/crypto` library needs to be linked and tested within the React Native environment, ensuring the native WebCrypto polyfills perform optimally.
- [ ] **Push Notifications**: Integrate React Native Firebase or Expo Notifications to handle incoming message alerts.

### 4. Features & Polish
- [ ] **Offline Support**: Cache recent messages in IndexedDB so the web app is usable offline (PWA support).
- [ ] **Voice/Video Calling UI**: The signaling layer for WebRTC is present, but the UI for handling incoming/outgoing call rings needs to be polished.
