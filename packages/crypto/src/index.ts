// ─── Kurakani Crypto Package ──────────────────────────────────────────
// Core E2EE primitives for the Signal-like messaging platform.

// X3DH key agreement + message encryption/decryption
export {
  x3dhSenderCalculate,
  x3dhReceiverCalculate,
  establishSessionAsInitiator,
  establishSessionAsReceiver,
  encryptMessage,
  decryptMessage,
  type SenderSessionResult,
} from './x3dh';

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
