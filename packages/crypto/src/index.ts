// ─── Kurakani Crypto Package ──────────────────────────────────────────
// Core E2EE primitives for the Signal-like messaging platform.

// Session establishment and encryption/decryption using libsignal
export {
  establishSessionAsInitiator,
  encryptMessage,
  decryptMessage,
} from './session';

// HKDF key derivation
export { hkdf, concat } from './hkdf';

// Key generation (Signal Protocol helpers)
export { generateSignalRegistrationPayload } from './keys';

// Attachment encryption
export {
  encryptAttachment,
  decryptAttachment,
  encryptAttachmentBase64,
  decryptAttachmentBase64,
} from './attachments';

// Sealed sender (hide sender identity from server)
export {
  createSealedSenderEnvelope,
  openSealedSenderEnvelope,
  createSealedSenderEnvelopeBase64,
} from './sealed-sender';
