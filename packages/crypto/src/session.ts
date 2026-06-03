// @ts-nocheck
import { 
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
  PreKeyBundle,
  SignalProtocolStore
} from '@privacyresearch/libsignal-protocol-typescript';

/**
 * Initializes a new Signal session as the initiator (Alice starting a chat with Bob).
 */
export async function establishSessionAsInitiator(
  store: SignalProtocolStore,
  recipientId: string,
  deviceId: number,
  preKeyBundle: PreKeyBundle
) {
  const address = new SignalProtocolAddress(recipientId, deviceId);
  const sessionBuilder = new SessionBuilder(store, address);
  
  // Convert preKeyBundle Base64 strings back to ArrayBuffers
  const bundle = {
    identityKey: base64ToArrayBuffer(preKeyBundle.identityKey),
    registrationId: preKeyBundle.registrationId,
    preKey: preKeyBundle.oneTimePreKey ? {
      keyId: preKeyBundle.oneTimePreKey.keyId,
      publicKey: base64ToArrayBuffer(preKeyBundle.oneTimePreKey.publicKey)
    } : undefined,
    signedPreKey: {
      keyId: preKeyBundle.signedPreKey.keyId,
      publicKey: base64ToArrayBuffer(preKeyBundle.signedPreKey.publicKey),
      signature: base64ToArrayBuffer(preKeyBundle.signedPreKey.signature)
    }
  };

  await sessionBuilder.processPreKey(bundle);
}

// --- Utility Functions ---

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Encrypts a plaintext message for a recipient using the established SessionCipher.
 */
export async function encryptMessage(
  store: SignalProtocolStore,
  recipientId: string,
  deviceId: number,
  plaintext: string
) {
  const address = new SignalProtocolAddress(recipientId, deviceId);
  const cipher = new SessionCipher(store, address);
  
  const ciphertextObj = await cipher.encrypt(new TextEncoder().encode(plaintext).buffer);
  
  // Ciphertext from libsignal is an object: { type: number, body: string (usually binary string) }
  return {
    type: ciphertextObj.type,
    body: btoa(ciphertextObj.body) // Convert binary string to Base64
  };
}

/**
 * Decrypts an incoming message (either PreKeyWhisperMessage or WhisperMessage).
 */
export async function decryptMessage(
  store: SignalProtocolStore,
  senderId: string,
  deviceId: number,
  ciphertextBase64: string,
  type: 1 | 3 // 3 = PREKEY_MESSAGE, 1 = WHISPER_MESSAGE
) {
  const address = new SignalProtocolAddress(senderId, deviceId);
  const cipher = new SessionCipher(store, address);
  
  const ciphertext = atob(ciphertextBase64); // Convert Base64 back to binary string for libsignal

  let plaintextBuffer: ArrayBuffer;
  if (type === 3) {
    plaintextBuffer = await cipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
  } else {
    plaintextBuffer = await cipher.decryptWhisperMessage(ciphertext, 'binary');
  }

  return new TextDecoder().decode(plaintextBuffer);
}
