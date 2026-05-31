# Kurakani Cryptography Specification

This document outlines the zero-knowledge end-to-end encryption (E2EE) architecture implemented in Kurakani. It serves as the single source of truth for clients interacting with the backend.

## 1. Core Cryptographic Library

All cryptographic operations MUST wrap the industry-standard `@privacyresearch/libsignal-protocol-typescript`. Do not attempt to hand-roll Double Ratchet transitions or X3DH math.

- **Initialization:** Client registers Identity Keys, Signed Pre-Keys, and One-Time Pre-Keys (OTPKs).
- **Session:** Sessions are built using `SessionBuilder` and Pre-Key Bundles fetched from the Key Distribution Server (KDS).
- **Encryption/Decryption:** Operations are executed using `SessionCipher`.

## 2. Zero-Knowledge Attachments Pipeline

Attachments (images, videos, audio) are too large to route through real-time message sockets efficiently and must bypass the standard database layer.

1. **Client-Side Slicing & Key Generation:** The client slices the file into an ArrayBuffer and generates a random 256-bit AES-GCM key and 12-byte IV using WebCrypto (`crypto.subtle.generateKey`).
2. **Encryption:** The binary file is encrypted locally using the AES-GCM key.
3. **Presigned Upload:** The client requests a 120-second AWS S3 (or MinIO) presigned URL via `POST /api/attachments/presign-upload` and executes a direct HTTP `PUT` of the encrypted binary.
4. **Metadata Encapsulation:** The client constructs an attachment metadata block:
   ```json
   {
     "type": "attachment",
     "s3_key": "unique-uuid-file-path",
     "encryption_key": "BASE64_ENCODED_AES_KEY",
     "iv": "BASE64_ENCODED_IV",
     "mime_type": "image/png"
   }
   ```
5. **E2E Routing:** This metadata block is encrypted using the standard `libsignal` SessionCipher and sent as a standard message. The server routes the opaque envelope without seeing the AES key. Only the recipient can decrypt the metadata, fetch the blob from S3, and decrypt the binary locally.

## 3. Cryptographic Group Messaging (Fan-Out)

Group messages use **Sender Key Distribution Messages (SKDMs)** to optimize battery and bandwidth.

1. **Group Setup:** The group creator generates a UUIDv4 `groupId` and an isolated group master identity.
2. **Distribution (SKDM):** The creator sends an SKDM to each participant individually using their 1-on-1 `libsignal` session. This message says "Decrypt my future messages for this group using this sequence."
3. **Multi-Cast Routing:** When sending a message to the group, the sender encrypts the payload exactly *once* using the Sender Key. The sender submits this single ciphertext to `POST /api/messages` with `recipientId` set as an array of all participant IDs.
4. **Fan-Out:** The Kurakani server acts as a dumb relay, placing a copy of the exact same ciphertext into the offline queue (or Socket.io presence room) of every specified participant.
5. **Decryption:** Participants use the previously established Sender Key to decrypt the multi-cast envelope.

## 4. Perfect Forward Secrecy & X3DH

The backend KDS enforces atomic OTPK consumption:
```sql
SELECT * FROM "keys_otpk" WHERE "user_id" = $1 LIMIT 1 FOR UPDATE SKIP LOCKED
```
This guarantees that two people messaging Bob at the exact same millisecond will receive different OTPKs, preserving the mathematical integrity of the Double Ratchet Protocol.
