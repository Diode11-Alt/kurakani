# 🔐 Cryptography Specification
## Signal-Clone E2EE Platform

> Agent: If any crypto code deviates from this spec, rewrite it to match.  
> Do NOT improvise crypto. Implement exactly what is written here.

---

## Overview

This platform implements a subset of the Signal Protocol:
1. **X3DH** (Extended Triple Diffie-Hellman) — initial key agreement
2. **AES-256-GCM** (via NaCl secretbox) — symmetric encryption
3. **Ed25519** — digital signatures for pre-key verification
4. **Curve25519** — Diffie-Hellman key exchange

Library: **`tweetnacl`** (audited, pure JS, works in browser + React Native)

---

## Part 1: Key Types

### Identity Key Pair (IK)
- **Algorithm:** Curve25519 (via `nacl.box.keyPair()`)
- **Lifetime:** Permanent — generated once at registration, never rotated
- **Storage:** Secret key in device secure storage. Public key uploaded to server.

```typescript
import nacl from 'tweetnacl';

export function generateIdentityKeyPair() {
  return nacl.box.keyPair(); // { publicKey: Uint8Array(32), secretKey: Uint8Array(32) }
}
```

### Signed Pre-Key (SPK)
- **Algorithm:** Curve25519 key pair + Ed25519 signature
- **Lifetime:** Rotated weekly (but old ones kept for decryption)
- **Purpose:** Allows session initiation even when IK alone is insufficient

```typescript
import nacl from 'tweetnacl';

export function generateSignedPreKey(identitySecretKey: Uint8Array, keyId: number) {
  const keyPair = nacl.box.keyPair();
  // Sign the public key with identity key (using signing key derived from identity)
  const signingKeyPair = nacl.sign.keyPair.fromSeed(identitySecretKey.slice(0, 32));
  const signature = nacl.sign.detached(keyPair.publicKey, signingKeyPair.secretKey);
  
  return {
    keyId,
    keyPair,
    signature, // Uint8Array(64)
  };
}

export function verifySignedPreKey(
  publicKey: Uint8Array,
  signature: Uint8Array,
  identityPublicKey: Uint8Array
): boolean {
  // Derive Ed25519 verify key from Curve25519 public key
  // NOTE: This requires the identity key to also be an Ed25519 key
  // In practice, use a separate signing key pair at registration
  return nacl.sign.detached.verify(publicKey, signature, identityPublicKey);
}
```

### One-Time Pre-Keys (OTPKs)
- **Algorithm:** Curve25519 key pairs
- **Lifetime:** Single use — deleted from server after one session initiation
- **Count:** Generate 100 at registration, replenish when < 10 remain
- **Purpose:** Perfect Forward Secrecy — past sessions can't be decrypted if IK is compromised

```typescript
export function generateOneTimePreKeys(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    keyId: i,
    keyPair: nacl.box.keyPair(),
  }));
}
```

---

## Part 2: X3DH Session Initiation

### When Alice wants to message Bob for the first time:

**Alice fetches from server:**
```
Bob's key bundle = {
  identityKey: IK_B,        // Bob's permanent public key
  signedPreKey: SPK_B,      // Bob's signed pre-key + signature
  oneTimePreKey: OPK_B,     // One of Bob's one-time pre-keys (or null)
  registrationId: number    // Bob's device registration ID
}
```

**Alice calculates shared secret:**
```typescript
import nacl from 'tweetnacl';

export function x3dhSenderCalculate(
  senderIdentity: { publicKey: Uint8Array; secretKey: Uint8Array },
  recipientBundle: {
    identityKey: Uint8Array;
    signedPreKey: Uint8Array;
    oneTimePreKey: Uint8Array | null;
  }
) {
  // Generate ephemeral key pair (EK_A) — fresh for each session
  const ephemeralKeyPair = nacl.box.keyPair();

  // Calculate DH values
  const dh1 = nacl.scalarMult(senderIdentity.secretKey, recipientBundle.signedPreKey);
  const dh2 = nacl.scalarMult(ephemeralKeyPair.secretKey, recipientBundle.identityKey);
  const dh3 = nacl.scalarMult(ephemeralKeyPair.secretKey, recipientBundle.signedPreKey);

  // Combine DH values
  let dhInput: Uint8Array;
  if (recipientBundle.oneTimePreKey) {
    const dh4 = nacl.scalarMult(ephemeralKeyPair.secretKey, recipientBundle.oneTimePreKey);
    dhInput = concat(dh1, dh2, dh3, dh4);
  } else {
    dhInput = concat(dh1, dh2, dh3);
  }

  // KDF: HKDF with SHA-256 (use hkdf from @noble/hashes or webcrypto)
  const sharedSecret = hkdf(dhInput, 32, 'SignalX3DH'); // 32-byte shared secret

  return {
    sharedSecret,           // Used to derive message keys
    ephemeralPublicKey: ephemeralKeyPair.publicKey, // Sent to Bob in message header
  };
}
```

**Alice sends Bob:**
```json
{
  "header": {
    "ephemeralKey": "<base64 EK_A public key>",
    "registrationId": 12345,
    "oneTimePreKeyId": 7
  },
  "ciphertext": "<base64 encrypted message>"
}
```

**Bob calculates same shared secret:**
```typescript
export function x3dhReceiverCalculate(
  recipientIdentity: { publicKey: Uint8Array; secretKey: Uint8Array },
  signedPreKeySecret: Uint8Array,
  oneTimePreKeySecret: Uint8Array | null,
  senderEphemeralKey: Uint8Array,
  senderIdentityKey: Uint8Array
) {
  const dh1 = nacl.scalarMult(signedPreKeySecret, senderIdentityKey);
  const dh2 = nacl.scalarMult(recipientIdentity.secretKey, senderEphemeralKey);
  const dh3 = nacl.scalarMult(signedPreKeySecret, senderEphemeralKey);

  let dhInput: Uint8Array;
  if (oneTimePreKeySecret) {
    const dh4 = nacl.scalarMult(oneTimePreKeySecret, senderEphemeralKey);
    dhInput = concat(dh1, dh2, dh3, dh4);
  } else {
    dhInput = concat(dh1, dh2, dh3);
  }

  return hkdf(dhInput, 32, 'SignalX3DH'); // Must match sender's shared secret
}
```

---

## Part 3: Message Encryption

### Once shared secret is established:

```typescript
import nacl from 'tweetnacl';

// Encrypt plaintext message
export function encryptMessage(plaintext: string, sharedSecret: Uint8Array): string {
  const nonce = nacl.randomBytes(24); // Always fresh random nonce
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertext = nacl.secretbox(plaintextBytes, nonce, sharedSecret);
  
  if (!ciphertext) throw new Error('Encryption failed');
  
  // Combine nonce + ciphertext for storage/transmission
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);
  
  return Buffer.from(combined).toString('base64');
}

// Decrypt received message
export function decryptMessage(encryptedBase64: string, sharedSecret: Uint8Array): string | null {
  const combined = Buffer.from(encryptedBase64, 'base64');
  const nonce = combined.slice(0, 24);
  const ciphertext = combined.slice(24);
  
  const plaintext = nacl.secretbox.open(ciphertext, nonce, sharedSecret);
  if (!plaintext) return null; // Decryption failed (wrong key or tampered)
  
  return new TextDecoder().decode(plaintext);
}
```

---

## Part 4: File/Attachment Encryption

Files are encrypted separately from messages using a random key:

```typescript
export function encryptAttachment(fileBytes: Uint8Array): {
  encryptedData: Uint8Array;
  key: Uint8Array;
  iv: Uint8Array;
} {
  const key = nacl.randomBytes(32);
  const iv = nacl.randomBytes(24);
  const encrypted = nacl.secretbox(fileBytes, iv, key);
  
  return { encryptedData: encrypted, key, iv };
}
```

The `key` and `iv` are then embedded in the encrypted message payload (not sent separately).

---

## Part 5: Sealed Sender

Sealed sender prevents the server from knowing who sent a message:

```typescript
// Alice seals her identity inside the ciphertext
export function createSealedSenderEnvelope(
  senderCertificate: Uint8Array, // Alice's identity + signature
  ciphertext: Uint8Array,
  recipientIdentityKey: Uint8Array // Bob's identity key (used to encrypt the envelope)
): Uint8Array {
  const ephemeral = nacl.box.keyPair();
  const sharedKey = nacl.scalarMult(ephemeral.secretKey, recipientIdentityKey);
  const nonce = nacl.randomBytes(24);
  
  const inner = concat(senderCertificate, ciphertext);
  const sealed = nacl.secretbox(inner, nonce, sharedKey.slice(0, 32));
  
  return concat(ephemeral.publicKey, nonce, sealed);
}
```

---

## Helper: HKDF

```typescript
// Use Web Crypto API for HKDF
export async function hkdf(
  inputKeyMaterial: Uint8Array,
  outputLength: number,
  info: string
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', inputKeyMaterial, 'HKDF', false, ['deriveBits']
  );
  
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32), // Zero salt per Signal spec
      info: new TextEncoder().encode(info),
    },
    key,
    outputLength * 8
  );
  
  return new Uint8Array(bits);
}
```

---

## ❌ Common Crypto Mistakes to Avoid

| Wrong | Right |
|-------|-------|
| `Math.random()` for keys | `nacl.randomBytes()` or `crypto.getRandomValues()` |
| Same nonce twice | Always `nacl.randomBytes(24)` per message |
| Store secret key in localStorage | Store in IndexedDB (web) or SecureStore (mobile) |
| Return `null` on decrypt without trying | Return `null` and log error — never throw raw errors to UI |
| AES-ECB mode | AES-GCM (authenticated) only |
| MD5/SHA1 for passwords | bcrypt or Argon2 only |
| Hardcoded encryption keys | Always `nacl.randomBytes(32)` |
