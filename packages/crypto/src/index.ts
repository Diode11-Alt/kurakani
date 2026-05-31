// ─── Kurakani Crypto Package ──────────────────────────────────────────
// Core E2EE primitives for the Signal-like messaging platform.



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
