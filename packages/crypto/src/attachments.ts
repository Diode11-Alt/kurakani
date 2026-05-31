import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * Encrypt a file/attachment with a random key.
 * The key and IV are NOT stored on the server — they're embedded
 * inside the E2EE message payload so only the recipient can decrypt.
 */
export function encryptAttachment(fileBytes: Uint8Array): {
  encryptedData: Uint8Array;
  key: Uint8Array;
  iv: Uint8Array;
} {
  const key = nacl.randomBytes(32);
  const iv = nacl.randomBytes(nacl.secretbox.nonceLength); // 24 bytes

  const encrypted = nacl.secretbox(fileBytes, iv, key);

  return { encryptedData: encrypted, key, iv };
}

/**
 * Decrypt an attachment using the key and IV from the E2EE message.
 */
export function decryptAttachment(
  encryptedData: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array
): Uint8Array | null {
  const decrypted = nacl.secretbox.open(encryptedData, iv, key);
  return decrypted;
}

// ─── Base64 convenience wrappers ───────────────────────────────────────

export function encryptAttachmentBase64(fileBytes: Uint8Array): {
  encryptedDataBase64: string;
  keyBase64: string;
  ivBase64: string;
} {
  const { encryptedData, key, iv } = encryptAttachment(fileBytes);
  return {
    encryptedDataBase64: encodeBase64(encryptedData),
    keyBase64: encodeBase64(key),
    ivBase64: encodeBase64(iv),
  };
}

export function decryptAttachmentBase64(
  encryptedDataBase64: string,
  keyBase64: string,
  ivBase64: string
): Uint8Array | null {
  return decryptAttachment(
    decodeBase64(encryptedDataBase64),
    decodeBase64(keyBase64),
    decodeBase64(ivBase64)
  );
}
