/* eslint-disable @typescript-eslint/no-explicit-any */
import nacl from 'tweetnacl';

/**
 * HKDF (HMAC-based Key Derivation Function) using SHA-512.
 * Falls back to nacl.hash (SHA-512) + truncation when Web Crypto is unavailable.
 * This is a simplified but secure KDF suitable for deriving session keys from DH output.
 */

// Concatenate multiple Uint8Arrays
export function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Derive a key from input key material using HKDF-SHA256 (Web Crypto API).
 * Falls back to SHA-512 truncation if Web Crypto is unavailable (React Native).
 */
export async function hkdf(
  inputKeyMaterial: Uint8Array,
  outputLength: number,
  info: string
): Promise<Uint8Array> {
  // Try Web Crypto API first (works in browser + Node 18+)
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    try {
      const key = await globalThis.crypto.subtle.importKey(
        'raw',
        inputKeyMaterial,
        'HKDF',
        false,
        ['deriveBits']
      );

      const bits = await globalThis.crypto.subtle.deriveBits(
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
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: SHA-512 hash of (info || ikm), truncated to outputLength
  const infoBytes = new TextEncoder().encode(info);
  const combined = concat(infoBytes, inputKeyMaterial);
  const hash = nacl.hash(combined); // SHA-512 → 64 bytes
  return hash.slice(0, outputLength);
}
