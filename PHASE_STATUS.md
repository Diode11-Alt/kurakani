# Kurakani Project Status

This document tracks the completion of Phase 1 and outlines the plan for Phase 2, keeping in mind the current Monorepo architecture (Next.js, React Native, Node.js Server, PostgreSQL, Drizzle ORM).

## Completed: Phase 1 – Stability & Core UX Improvements

Phase 1 focused on tightening the user experience and ensuring robust connections and message states across the Web and Mobile apps.

✅ **1. Authentication Enhancements**
- Backend handles secure refresh token rotation and hashing.
- Frontends (Web and Mobile) implement Axios interceptors to seamlessly catch `401 Unauthorized` responses and silently refresh the session without logging the user out.

✅ **2. Error Handling & Feedback**
- Centralized error response format `{ success: false, message, errors }` implemented across backend APIs.
- Global Toast notifications integrated (`react-hot-toast` for Web, `react-native-toast-message` for Mobile).
- Offline detection banners actively track network connection drops on both platforms.

✅ **3. State Management Cleanup**
- Zustand stores successfully split into distinct slices (`authStore`, `chatStore`, `messageStore`, `uiStore`) on both Web and Mobile to prevent prop drilling and re-render issues.

✅ **4. Optimistic UI & Message Status**
- Messages immediately render with a `sending` status before receiving confirmation from the server.
- Real read receipts feature: Opening a chat actively marks all previously unread messages as read in the database via the `PUT /api/messages/conversations/:id/read` endpoint, sending a WebSocket confirmation back to the original sender to display double-checkmarks.

✅ **5. Typing Indicator Throttle**
- Typing event emission is throttled to once every 2 seconds, with an automatic stop timer preventing infinite typing animations if the user drops off.

✅ **6. Pagination for Messages**
- Cursor-based infinite scroll cleanly loads older messages without breaking the scroll position (using `onScroll` for Web and `onEndReached` for Mobile FlatList).

---

## Next Up: Phase 2 – Collaboration Features & Scale

Phase 2 will tackle pushing updates to offline devices, polishing real-time media uploads, and expanding group management capabilities.

### 1. Push Notifications (Client & Server)
* **Goal:** Alert users of incoming messages when they are entirely offline or have the app backgrounded.
* **Tasks:**
  - **Server:** Trigger FCM (`firebase-admin`) when a message is queued for offline delivery.
  - **Web:** Set up a Service Worker to receive Firebase Web Push notifications. Request notification permissions from the user.
  - **Mobile:** Integrate Firebase Cloud Messaging into React Native. Handle foreground, background, and quit states, routing the user to the correct `ChatScreen` upon clicking the notification.

### 2. Video Calling Polish
* **Goal:** Finalize the WebRTC Video and Audio calling UI that is currently in scaffolding.
* **Tasks:**
  - Connect the WebRTC signaling logic via existing Socket.io channels.
  - Complete the UI overlay for incoming calls (Ringing Screen).
  - Handle call states (Accepted, Rejected, Missed).

### 3. Group Chat Admin Controls
* **Goal:** Give group admins more control over their spaces.
* **Tasks:**
  - Implement "Transfer Admin Role".
  - Generate Group Invite Links with expiry functionality.
  - Ensure users who leave can still view the chat history up until the point they left.

### 4. File Upload Improvements
* **Goal:** Make sending media faster and more reliable.
* **Tasks:**
  - Client-side image resizing and compression before upload (to save bandwidth).
  - Add a visible progress bar for uploads on both Web and Mobile.
  - Implement paste-from-clipboard support on Web.
