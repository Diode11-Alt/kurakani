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
  
  await sessionBuilder.processPreKey(preKeyBundle);
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
  
  // Encrypt the string directly (libsignal will handle String vs ArrayBuffer depending on version)
  const ciphertext = await cipher.encrypt(new TextEncoder().encode(plaintext).buffer);
  return ciphertext;
}

/**
 * Decrypts an incoming message (either PreKeyWhisperMessage or WhisperMessage).
 */
export async function decryptMessage(
  store: SignalProtocolStore,
  senderId: string,
  deviceId: number,
  ciphertext: string, // Base64 or binary string depending on transport
  type: 1 | 3 // 3 = PREKEY_MESSAGE, 1 = WHISPER_MESSAGE
) {
  const address = new SignalProtocolAddress(senderId, deviceId);
  const cipher = new SessionCipher(store, address);
  
  let plaintextBuffer: ArrayBuffer;
  if (type === 3) {
    plaintextBuffer = await cipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
  } else {
    plaintextBuffer = await cipher.decryptWhisperMessage(ciphertext, 'binary');
  }

  return new TextDecoder().decode(plaintextBuffer);
}
