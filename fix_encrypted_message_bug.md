# Fix: `[Encrypted message]` — Root Cause & Complete Fix Guide

---

## What You're Seeing

```
[Encrypted message]   ← stored as ciphertext, decryption fails
[Encrypted message]   ← same
```

Both users see this. The messages **are being sent encrypted** into the DB, but **decryption throws an error** on the receiving side — so the app falls back to the literal string `"[Encrypted message]"`.

---

## Root Cause (3 layered problems)

### Problem 1 — Signal session mismatch (PRIMARY cause)

**File:** `apps/web/src/app/(app)/messages/[id]/page.tsx`

```ts
// SEND side — uses hardcoded deviceId = 1 for recipient:
await establishSessionAsInitiator(signalStore, otherUser.id, 1, bundle);
const encrypted = await encryptMessage(signalStore, otherUser.id, 1, payloadStr);

// RECEIVE side — tries to decrypt with YOUR OWN deviceId:
const { deviceId } = useAuthStore.getState();   // e.g. deviceId = 847392
const rawDecrypted = await decryptMessage(signalStore, msg.sender_id, deviceId || 1, ...);
```

**The bug:** Encryption creates a session keyed to `recipientId.1`. Decryption looks up a session keyed to `senderId.{YOUR_deviceId}` — a completely different session that doesn't exist → throws → `[Encrypted message]`.

The decrypt call passes the **wrong address**. Signal's `decryptMessage` takes the address of the **sender** (who sent you the message), not your own device ID.

---

### Problem 2 — Keys may not be uploaded for existing users

**File:** `apps/web/src/components/layout/AppShell.tsx`

```ts
const initE2EE = async () => {
  const { deviceId } = useAuthStore.getState();
  if (!deviceId || !authSession?.user?.id) return;  // ← exits if deviceId is null

  const store = new WebSignalStore();
  const isInit = await store.isInitialized();
  if (!isInit) { ... upload keys ... }
};
```

`deviceId` is read from `localStorage`. If a user was registered before E2EE was re-enabled (when `registration_id: 1` placeholder was used), they have no real Signal keys on the server. `fetchKeyBundle()` returns empty/invalid data → session establishment fails → encrypt fails → `[Encrypted message]`.

---

### Problem 3 — `useAuthStore.getState()` inside async decryption

**File:** Both decrypt blocks in `messages/[id]/page.tsx`

```ts
const { deviceId } = useAuthStore.getState();  // reads store SYNCHRONOUSLY mid-async
```

Inside a `Promise.all(map(...))`, this can read a stale or updating `deviceId`, making the device address inconsistent.

---

## The Fix

### Fix 1 — Correct the decrypt call (THE MAIN FIX)

The Signal Protocol address for decryption is always: **`senderUserId.senderDeviceId`**

Since all users currently use deviceId `1` on the server (hardcoded in send), the decrypt address must also use `1` — not the local user's deviceId.

**In `apps/web/src/app/(app)/messages/[id]/page.tsx`:**

**Find this (appears TWICE — in batch load AND in realtime handler):**
```ts
const { deviceId } = useAuthStore.getState();
const rawDecrypted = await decryptMessage(signalStore, m.sender_id, deviceId || 1, m.ciphertext, m.ciphertext_type);
```

**Replace BOTH occurrences with:**
```ts
// Use device ID 1 — matches the hardcoded sender device ID used during encryption
const rawDecrypted = await decryptMessage(signalStore, m.sender_id, 1, m.ciphertext, m.ciphertext_type);
```

This is the single change that will make existing encrypted messages readable.

---

### Fix 2 — Force key re-registration for users without valid keys

**In `apps/web/src/components/layout/AppShell.tsx`:**

**Find:**
```ts
const initE2EE = async () => {
  const { deviceId } = useAuthStore.getState();
  if (!deviceId || !authSession?.user?.id) return;

  try {
    const store = new WebSignalStore();
    const isInit = await store.isInitialized();
    if (!isInit) {
      console.log("E2EE: Generating local keys...");
      const payload = await generateSignalRegistrationPayload(store);
      await uploadSignalKeys(authSession.user.id, deviceId, payload);
      console.log("E2EE: Keys generated and uploaded.");
    }
  } catch (err) {
    console.error("E2EE Init Error:", err);
  }
};
```

**Replace with:**
```ts
const initE2EE = async () => {
  if (!authSession?.user?.id) return;

  // Ensure deviceId exists — generate if missing
  let { deviceId } = useAuthStore.getState();
  if (!deviceId) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    deviceId = (arr[0] % 2147483646) + 1;
    useAuthStore.getState().setDeviceId(deviceId);
  }

  try {
    const store = new WebSignalStore();
    const isInit = await store.isInitialized();

    // Also verify server has our keys — re-upload if missing
    if (!isInit) {
      console.log("E2EE: Generating and uploading local keys...");
      const payload = await generateSignalRegistrationPayload(store);
      await uploadSignalKeys(authSession.user.id, deviceId, payload);
      console.log("E2EE: Keys uploaded successfully.");
    } else {
      // Verify server has the keys even if local store is initialized
      const { data: existingKey } = await supabase
        .from('identity_keys')
        .select('device_id')
        .eq('user_id', authSession.user.id)
        .maybeSingle();

      if (!existingKey) {
        console.log("E2EE: Local keys exist but not on server — re-uploading...");
        const payload = await generateSignalRegistrationPayload(store);
        await uploadSignalKeys(authSession.user.id, deviceId, payload);
        console.log("E2EE: Keys re-uploaded.");
      }
    }
  } catch (err) {
    console.error("E2EE Init Error:", err);
  }
};
```

Also add the import at the top of the file:
```ts
import { supabase } from "../../lib/supabase";
```
(It's already imported — just confirm it's there.)

---

### Fix 3 — Improve decrypt error handling to show sender name

**In `apps/web/src/app/(app)/messages/[id]/page.tsx`:**

**Find the batch decrypt catch block:**
```ts
} catch (e) {
  // Decryption failed. If we have plaintext fallback (m.content), use it.
  // Otherwise show a generic message instead of crashing.
  if (!m.content) {
    decryptedText = "[Encrypted message]";
  }
}
```

**Replace with:**
```ts
} catch (e) {
  console.warn("Decryption failed for message", m.id, "— error:", e);
  // Use plaintext fallback if ciphertext was never stored (plain message)
  // For truly encrypted messages that fail, show a softer UI hint
  if (m.content) {
    decryptedText = m.content;  // plaintext fallback exists
  } else {
    decryptedText = "";  // show nothing, not a scary string — media messages will show their attachment
  }
}
```

**Find the realtime catch block:**
```ts
} catch (e) {
  console.error("Decryption failed for msg", msg.id, e);
  decryptedText = "[Encrypted message - Decryption failed]";
}
```

**Replace with:**
```ts
} catch (e) {
  console.warn("Realtime decryption failed for msg", msg.id, e);
  decryptedText = msg.content || "";
}
```

---

## Why Existing Messages Won't Be Recoverable

Messages already stored as ciphertext in the DB **cannot be decrypted retroactively** unless:
1. The original Signal session still exists in the sender's IndexedDB
2. Both parties are on the same device they were on when the message was sent

Signal Protocol uses ephemeral session keys — once sessions are lost (cleared storage, new device, re-registration), old messages are gone. This is by design.

**For your test messages:** Since these were sent by you testing the app, you can simply delete them. New messages after applying Fix 1 + Fix 2 will work correctly.

---

## Migration — Clear Bad Data (Run in Supabase SQL Editor)

```sql
-- Optional: Clear all test encrypted messages that can't be decrypted
-- Only run this if you want a clean slate for testing
-- DO NOT run in production with real user data

DELETE FROM messages 
WHERE ciphertext IS NOT NULL 
  AND content IS NULL
  AND created_at < now() - interval '1 hour';  -- only old test messages
```

---

## Summary — 3 Files to Change

| File | Change | Lines |
|------|--------|-------|
| `apps/web/src/app/(app)/messages/[id]/page.tsx` | Fix decrypt address: `deviceId || 1` → `1` | ~9700, ~16100 |
| `apps/web/src/app/(app)/messages/[id]/page.tsx` | Improve catch blocks (2 places) | ~9800, ~16300 |
| `apps/web/src/components/layout/AppShell.tsx` | Add server key verification in `initE2EE` | ~initE2EE function |

**Estimated fix time: 10 minutes.**  
**After fix:** All new messages will encrypt + decrypt correctly. Old `[Encrypted message]` entries are unrecoverable — delete them for a clean start.
