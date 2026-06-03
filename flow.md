

```markdown
# Kurakani – Complete Documentation

# Product Requirements Document (PRD) – Kurakani

## 1.1 Overview
**Product Name:** Kurakani (कुराकानी – “conversation” in Nepali)  
**Description:** A real‑time chat application built with the MERN stack. Supports one‑to‑one and group conversations, media uploads, and live presence indicators.  
**Target Audience:** Nepali youth, diaspora, and small communities wanting a fast, informal chat tool.  
**Platforms:** Web (desktop + mobile responsive), with PWA capabilities planned.

## 1.2 Core Objectives (MVP)
- Secure authentication via email/password and Google OAuth.
- Real‑time messaging with typing indicators and online/offline status.
- One‑to‑one and group chats.
- Group admin controls (rename, add/remove members).
- Image and file sharing through Cloudinary.
- Chat list with latest message preview and unread count.
- Light/dark theme toggle.

## 1.3 User Stories
| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US‑1 | Visitor | Register with email or Google account | I can start using the app |
| US‑2 | User | Log in securely with my credentials | I access my conversations |
| US‑3 | User | Search for other users | I can start a private chat |
| US‑4 | User | Send text messages in real time | I communicate instantly |
| US‑5 | User | See when the other person is typing | I know they are responding |
| US‑6 | User | Create a group chat | I can talk with multiple friends |
| US‑7 | Group admin | Rename the group and manage members | I control the group |
| US‑8 | User | Share images/files within a chat | I share media easily |
| US‑9 | User | See online/offline status of contacts | I know who is available |
| US‑10 | User | Switch between light and dark mode | I have a comfortable viewing experience |

## 1.4 Out of Scope (MVP)
- Voice/video calling.
- Message replies/threads.
- Read receipts (only “delivered” via socket ACK, no “read”).
- Push notifications (service worker / web push).
- Message editing/deletion.
- Multi‑language support.
- End‑to‑end encryption.

## 1.5 Success Metrics
- Message delivery latency ≤ 200 ms.
- First contentful paint ≤ 1.5 seconds.
- 99.5 % socket connection success rate.
- Weekly active user retention ≥ 30%.

---

# Technical Requirements Document (TRD) – Kurakani

## 2.1 Technology Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, React Router v6, Axios, Socket.io‑client, Headless UI |
| **Backend** | Node.js, Express, Socket.io, Mongoose, jsonwebtoken, bcryptjs, multer (temporary), cloudinary |
| **Database** | MongoDB (via Mongoose), no Redis yet |
| **Auth** | JWT access token (15 min) + refresh token (7 d) stored in httpOnly cookie |
| **Storage** | Cloudinary (images, documents) |
| **Hosting** | Frontend on Vercel / Netlify; Backend on Railway / Render / AWS EC2 |
| **CI/CD** | Git‑based (no automated tests or pipelines yet) |

## 2.2 System Architecture
Browser (React + Socket.io client)
    │
    ├── REST (HTTPS) ────── Express API ──── MongoDB (Atlas)
    │
    └── WebSocket (WSS) ─── Socket.io Server ──┐
                                               ├── In‑memory user/socket map (no Redis adapter)
                                               └── Cloudinary (upload via backend)

## 2.3 API Design (REST)

### Authentication
- `POST /api/auth/register` – create account (email, password, username)
- `POST /api/auth/login` – returns access token in body, refresh token in cookie
- `POST /api/auth/refresh` – uses cookie to issue new access token
- `POST /api/auth/logout` – clears refresh cookie
- `GET /api/auth/google` / callback – Passport.js Google OAuth

### Users
- `GET /api/users?search=query` – search by username or email (requires auth)
- `GET /api/users/:id` – get user profile

### Chats
- `POST /api/chats` – create or fetch 1‑to‑1 chat (body: `{ userId }`)
- `GET /api/chats` – fetch all chats for logged‑in user (populated with latest message)
- `POST /api/chats/group` – create group chat (body: `{ name, users }`)
- `PUT /api/chats/:id` – update group (rename, add/remove members)
- `DELETE /api/chats/:id` – leave group / delete chat (admin only to delete)

### Messages
- `GET /api/messages/:chatId` – paginated messages
- `POST /api/messages` – send text message (body: `{ chatId, content }`)
- `POST /api/messages/upload` – upload file (multipart), returns message with attachment

## 2.4 Real‑time Events (Socket.io)
| Event (client → server) | Event (server → client) | Description |
|--------------------------|--------------------------|-------------|
| `setup` (userId) | `connected` | Register user socket |
| `join chat` (chatId) | – | Join a chat room |
| `new message` (msg) | `message received` (msg) | Broadcast message to chat room |
| `typing` (chatId) | `typing` (userId) | Broadcast typing indicator |
| `stop typing` (chatId) | `stop typing` (userId) | Remove typing indicator |
| `disconnect` | `user offline` (userId) | Mark user offline |

## 2.5 Non‑functional Requirements
- **Performance:** REST API responses < 100 ms (p95). Socket event acknowledgement < 50 ms.
- **Security:** Helmet.js, CORS (strict origin), rate‑limiting on auth routes, input sanitization (express‑mongo‑sanitize, xss‑clean), bcrypt for passwords.
- **Scalability:** Socket.io should use Redis adapter to sync across multiple instances; currently only single‑instance.
- **Accessibility:** All interactive elements keyboard accessible, ARIA labels, color contrast ≥ 4.5:1.
- **Reliability:** Graceful error handling on client (retry socket connection, fallback UI).

---

# Application Flow – Kurakani

## 3.1 Onboarding & Authentication
1. User lands on **Login** page (default route `/` unauthenticated).
2. Toggle to **Register** → fills in name, email, password.
3. On success, tokens saved → redirect to **Chats** page.
4. Google OAuth: click “Sign in with Google” → redirect to consent screen → callback → auto‑login.

## 3.2 Chat List Screen
- Sidebar (desktop) or full screen (mobile) displays list of chats.
- Each chat item shows: avatar, chat name / username, last message snippet, time, unread badge.
- Search bar at top: starts a new chat by searching for a user.
- **Create Group** button opens modal → name + multi‑select users → creates group.

## 3.3 Active Chat Screen
- Header: back button, participant avatar, name, online status dot.
- Message area: scrollable list, auto‑scroll to bottom on new message.
- Typing indicator: “User is typing…” animated.
- Input bar: text field, attach file button, emoji picker (future), send button.
- Sending a message: immediate optimistic UI update, revert on error.

## 3.4 Real‑time Interaction
- On login, socket emits `setup`.
- When opening a chat, client emits `join chat`.
- Incoming `message received` updates chat list preview and message area if chat is active.
- Typing events show/hide indicator in active chat.
- User presence: online dot updates when `user online`/`user offline` events fire.

## 3.5 Group Management
- From chat header, click group info → opens **Group Info** modal/side panel.
- Displays members list, group name (editable by admin), and buttons to add/remove members.
- Leave group option for non‑admins.

---

# UI/UX Brief – Kurakani

## 4.1 Design Language
- **Color Palette:** Primary: crimson `#DC143C` (inspired by Nepali flag), secondary: deep blue `#003893`, background: light gray `#F3F4F6` / dark `#1F2937`.
- **Typography:** Inter (clean, legible), system font fallback.
- **Shapes:** Soft rounded corners (16px for cards), subtle shadows for depth.
- **Icons:** Lucide React (consistent, open‑source).

## 4.2 Key Screen Layouts
- **Auth Pages:** Centered card, logo at top, form fields with floating labels, social login button.
- **Chat List (Sidebar):** Fixed left column (320px), scrollable list, each row with avatar + text + time.
- **Chat Window:** Flex layout: header fixed top, messages flex‑1 overflow‑auto, input bar fixed bottom.
- **Group Info / New Chat Modals:** Overlay with slide‑up (mobile) or centered dialog (desktop).

## 4.3 Interaction Details
- **Message bubbles:** Sent messages right‑aligned, blue background; received messages left‑aligned, white/dark background.
- **Typing indicator:** Three bouncing dots within the chat bubble area.
- **Unread badge:** Red circle with count on chat list items.
- **Dark mode:** Toggle in profile/settings, smoothly transitions all colors.
- **Loading states:** Skeleton loaders for chat list, spinner for messages fetch.

## 4.4 Mobile‑first Design
- On screens < 768px: sidebar collapses, chat list takes full width; when entering a chat, chat window becomes the sole view with back button.
- Bottom navigation (mobile) not implemented yet, but planned.

## 4.5 Accessibility
- Focus indicators visible on all interactive elements.
- Proper heading hierarchy (h1‑h3).
- ARIA roles: `navigation`, `main`, `complementary`, `list`, `listitem`.
- Alt text for all images (avatars, attached files).

---

# Backend Schema – Kurakani

## 5.1 Users Collection
```javascript
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: function() { return !this.googleId; } },
  avatar: { type: String, default: '' },   // Cloudinary URL
  googleId: { type: String, default: null },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

```

## 5.2 Chats Collection

```javascript
const chatSchema = new mongoose.Schema({
  chatName: { type: String, trim: true },
  isGroupChat: { type: Boolean, default: false },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

```

## 5.3 Messages Collection

```javascript
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  attachments: [{
    url: { type: String },
    public_id: { type: String },
    resource_type: { type: String, enum: ['image', 'raw'] }
  }],
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

```

## 5.4 Refresh Tokens (currently not persisted)

Currently the refresh token is a signed JWT stored only in an httpOnly cookie. For better security, hashed tokens should be stored in a separate collection (or a `refreshTokens` array on the user document) to allow revocation.

---

# Implementation Plan – Kurakani

## Phase 0 – Foundation (Already Implemented)

* ✅ Project scaffolding (Vite React + Express)
* ✅ MongoDB connection & Mongoose models
* ✅ Basic auth (register/login with JWT)
* ✅ Private & group chat creation APIs
* ✅ Real‑time messaging via Socket.io (single instance)
* ✅ File upload to Cloudinary
* ✅ Basic frontend: login, chat list, chat window
* ✅ Light/dark mode toggle

## Phase 1 – Stability & Core UX Improvements (2‑3 weeks)

1. **Authentication Enhancements**
* Refresh token rotation with reuse detection.
* Store hashed refresh tokens in DB for revocation.


2. **Error Handling & Feedback**
* Unified error responses `{ success: false, message, errors }`.
* Client toast notifications for success/failure.
* Offline detection and auto‑reconnect UI.


3. **State Management Cleanup**
* Separate Zustand stores for auth, chat, messages, UI.
* Avoid prop drilling; use store selectors.


4. **Optimistic UI & Message Status**
* Show “sending / sent / failed” status on message bubbles.
* Implement real read receipts (update `isRead` when user opens chat).


5. **Typing Indicator Throttle**
* Throttle socket events to once per 2 seconds.


6. **Pagination for Messages**
* Infinite scroll upward to load older messages.



## Phase 2 – Collaboration Features & Scale (3‑4 weeks)

1. **Socket.io Scalability**
* Integrate Redis adapter (`socket.io-redis`).
* Maintain user‑socket map in Redis.


2. **File Upload Improvements**
* Client‑side image resizing before upload.
* Support paste from clipboard.
* Progress bar for uploads.


3. **Group Chat Admin Controls**
* Transfer admin role.
* Group invite link (with expiry).
* View group message history even after leaving.


4. **Push Notifications (Web)**
* Service worker registration, Firebase Cloud Messaging (FCM).
* Notification click opens the correct chat.


5. **Emoji Picker**
* Integrate emoji‑mart or similar picker in the input area.



## Phase 3 – Advanced Features & Polish (4‑6 weeks)

1. **Message Actions**
* Edit & delete messages (with “edited” tag).
* Reply/thread support.
* Forward message.


2. **Search**
* Full‑text search within a chat.
* Global search across all chats (ElasticSearch optional).


3. **Media Gallery**
* View all shared media in a chat (tabs: images, files).


4. **Voice Messages**
* Record and send short voice notes (Web Audio API).


5. **End‑to‑End Encryption (Optional)**
* Signal protocol (libsignal) for private chats.


6. **Offline Mode / PWA**
* Cache chat list, messages for offline reading (IndexedDB).
* Enable PWA manifest, install prompt.



## Phase 4 – DevOps & Monitoring (ongoing)

* CI/CD pipeline (GitHub Actions) for linting, testing, build.
* Integration tests for socket events and REST endpoints (Jest, supertest).
* Application monitoring with Sentry (errors) and Logtail.
* Performance monitoring (Lighthouse CI, Web Vitals).
* Database backup strategy (MongoDB Atlas automated).

```

---

### 2. Critical Analysis of Project & Current Codebase

Your documentation is incredibly thorough and well-thought-out. However, based on the repository structure data provided alongside your prompt, there is a **massive architectural discrepancy** between your planned documentation and the actual codebase.

**Key Findings & Discrepancies:**
*   **Monorepo vs. Single Frontend/Backend:** Your TRD specifies a simple Vite + Express MERN stack. However, your repository is structured as a full monorepo featuring separate `apps/mobile`, `apps/web`, and `apps/server` directories[cite: 1].
*   **Next.js vs. Vite:** The web application in your repository contains a `next.config.ts` file, indicating it is built on Next.js, not Vite as stated in the TRD[cite: 1].
*   **Database Architecture:** The TRD explicitly calls for MongoDB via Mongoose. Conversely, the repository contains a `packages/db` directory featuring a `drizzle.config.ts` file and `supabase-schema.sql` files[cite: 1]. This means your current codebase relies on a PostgreSQL database managed by Drizzle ORM and Supabase[cite: 1].
*   **Mobile App Presence:** The PRD notes that mobile capabilities are planned as a responsive PWA. However, your codebase already includes an `apps/mobile` directory with an `android` folder, `build.gradle` files, and `MainActivity.kt`, revealing an active React Native/Expo mobile application[cite: 1].
*   **End-to-End Encryption (E2EE):** The PRD explicitly marks E2EE as "Out of Scope" for the MVP. Yet, your repository contains a dedicated `packages/crypto` directory with files like `hkdf.ts`, `sealed-sender.ts`, and `session.ts`, strongly implying cryptographic implementations are actively being built[cite: 1].

**My Recommendation:**
You need to align your documentation with your reality. The current codebase represents a significantly more advanced, robust, and scalable architecture (Next.js, Supabase, React Native, Monorepo) than the MERN stack outlined in your text documents. Attempting to force an AI agent to build the MERN stack outlined in the MD files into your current Monorepo will result in broken code and corrupted architectures.

---

### 3. Strict Instructions for an AI Coding Agent

If you choose to proceed with the existing codebase (which I highly recommend), you must provide your AI agent with a prompt that acknowledges the *actual* stack while utilizing the *feature goals* from your PRD. 

Copy and paste the following prompt to your AI agent (Cursor, Copilot, Devin, etc.):

> **System Role:** You are an expert Full-Stack Software Engineer and Architect.
> 
> **Context:** You are working on "Kurakani", a real-time chat application. The provided documentation (PRD, TRD, Schema) was originally written for a MERN stack, but **the repository has evolved into a Monorepo.** 
> 
> **Current Actual Stack (MUST FOLLOW THIS):**
> *   **Structure:** Monorepo (Turborepo/PNPM).
> *   **Web:** Next.js (App Router), Tailwind CSS.
> *   **Mobile:** React Native / Expo.
> *   **Database:** PostgreSQL, Drizzle ORM, Supabase.
> *   **Shared Packages:** Custom `packages/db`, `packages/crypto`, `packages/types`, `packages/ui`.
> 
> **Execution Directives:**
> 1.  **Ignore the TRD's MongoDB/Mongoose guidelines.** You must use Drizzle ORM and Supabase for all database interactions, referencing the schemas located in `packages/db/src/`.
> 2.  **Ignore the TRD's Vite guidelines.** You must implement web frontend features using Next.js in the `apps/web` directory.
> 3.  **Cross-Platform Parity:** When implementing a user story from the PRD, you must implement the UI/UX for both `apps/web` and `apps/mobile` unless explicitly told otherwise.
> 4.  **Feature Parity:** Refer to the User Stories (US-1 through US-10) in the PRD for feature requirements, but adapt their implementation to the current PostgreSQL/Next.js/React Native architecture.
> 5.  **Strict Rule:** Do not install Mongoose, Express (if Next.js API routes are used), or Vite into this project. Respect the existing monorepo package manager (`pnpm-lock.yaml` is present).
> 
> **Task:** Please read the PRD user stories. Review the current state of `apps/web`, `apps/mobile`, and `packages/db`. Provide a step-by-step technical plan to implement the remaining MVP features (Phase 1) using the *actual* tech stack present in the repository.

---

Given the significant differences between your documentation and the existing repository structure, would you like me to rewrite your TRD and Backend Schema documents to match your actual Next.js/Supabase/Monorepo architecture so everything is aligned moving forward?

```