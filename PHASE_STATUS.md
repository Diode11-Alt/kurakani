# Kurakani Project Status

This document tracks the completion of Phase 1 and outlines the comprehensive plan for Phase 2, keeping in mind the current Monorepo architecture (Next.js, React Native, Supabase).

## Completed: Phase 1 – Stability, Core UX & Supabase Migration

Phase 1 focused on tightening the user experience, eliminating legacy Node.js/Express infrastructure, migrating fully to Supabase, and ensuring robust connections and message states across the Web and Mobile apps.

✅ **1. Backend Architecture Migration (Supabase)**
- Completely replaced the legacy Node.js/Axios backend with **Supabase Auth and Realtime WebSockets**.
- Implemented secure Row Level Security (RLS) policies for all tables (`users`, `messages`, `message_reactions`, `conversations`).
- Eliminated all hardcoded `localhost:4000` references in the mobile app, tying networking to `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOCKET_URL` instead.

✅ **2. Authentication Enhancements**
- Backend handles secure JWT sessions via Supabase.
- Seamless session management across Next.js Server-Side Rendering (SSR) and React Native clients.

✅ **3. Secure Storage (Mobile)**
- Migrated the message and token caching in the React Native app from unencrypted `AsyncStorage` to the OS-level secure enclave using `react-native-encrypted-storage`.
- Developed a custom local indexing mechanism to allow asynchronous query of encrypted storage keys.

✅ **4. Optimistic UI & True Message Delivery Status**
- Messages immediately render with a `sending` status before receiving confirmation from the server.
- Global Realtime Listeners now actively subscribe to the `messages` table in the background. Incoming messages are instantly marked as `delivered_at` without the user having to actively open the chat.
- Double-ticks accurately reflect the transition from Sent (Single Tick) -> Delivered (Double Gray Ticks) -> Read (Double Blue Ticks).

✅ **5. State Management Cleanup & Validation**
- Zustand stores successfully split into distinct slices (`authStore`, `chatStore`, `messageStore`, `uiStore`) on both Web and Mobile.
- Added strict client-side limits (4,000 characters for messages, 2,000 characters for posts) to ensure UI integrity and prevent oversized database payloads.

✅ **6. Pagination for Messages**
- Cursor-based infinite scroll cleanly loads older messages without breaking the scroll position (using `onScroll` for Web and `onEndReached` for Mobile FlatList).
- Resolved PostgREST relationship caching bugs on infinite scroll payload fetching.

---

## Next Up: Phase 2 – Collaboration Features & Scale

Phase 2 will tackle pushing updates to offline devices, polishing real-time media uploads, and expanding group management capabilities using our modernized Supabase stack.

### 1. Push Notifications (Client & Supabase Edge Functions)
* **Goal:** Alert users of incoming messages when they are entirely offline or have the app backgrounded.
* **Tasks:**
  - **Server:** Implement Supabase Database Webhooks / Edge Functions to trigger Firebase Cloud Messaging (FCM) when a message is queued for offline delivery.
  - **Web:** Set up a Service Worker to receive Firebase Web Push notifications. Request notification permissions from the user.
  - **Mobile:** Integrate `expo-notifications` or Firebase Cloud Messaging into React Native. Handle foreground, background, and quit states, routing the user to the correct `ChatScreen` upon clicking the notification.

✅ **2. Video Calling Polish**
* **Goal:** Finalize the WebRTC Video and Audio calling UI.
* **Tasks:**
  - Connected the WebRTC signaling logic via existing Supabase Realtime Broadcast channels (`user-global-*`).
  - Completed the UI overlay for incoming calls (Ringing Screen).
  - Handled call states (Accepted, Rejected, Missed) natively on Web and inserted `call_log` messages into Supabase.

### 3. File Upload & Storage Improvements
* **Goal:** Make sending media faster, more reliable, and tied to Supabase Storage.
* **Tasks:**
  - Client-side image resizing and compression before upload (to save bandwidth).
  - Connect message attachments directly to Supabase Storage Buckets.
  - Add a visible progress bar for uploads on both Web and Mobile.
  - Implement paste-from-clipboard support on Web.

### 4. Group Chat Admin Controls
* **Goal:** Give group admins more control over their spaces.
* **Tasks:**
  - Implement "Transfer Admin Role" leveraging Supabase RLS.
  - Generate Group Invite Links with expiry functionality.
  - Ensure users who leave can still view the chat history up until the point they left.
