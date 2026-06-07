import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { concat } from './hkdf';

/**
 * Sealed Sender — Hides the sender's identity from the server.
 *
 * The sender encrypts their identity + message inside an envelope
 * that only the recipient can open (using their identity key).
 * The server routes the blob without knowing who sent it.
 */

// Note: Sealed sender envelope creation can be integrated into the message send flow here
// if sender anonymity is ever required. Currently, the sender_id is relied upon by the backend
// to enforce read receipts and authorization.
export function createSealedSenderEnvelope(
  senderCertificate: Uint8Array, // Sender's identity info (userId + identityKey)
  ciphertext: Uint8Array,
  recipientIdentityKey: Uint8Array // Recipient's public identity key
): Uint8Array {
  // Generate ephemeral key pair for the envelope
  const ephemeral = nacl.box.keyPair();

  // Derive a shared key using ephemeral secret + recipient identity public
  const sharedKey = nacl.scalarMult(ephemeral.secretKey, recipientIdentityKey);

  // Hash to get a proper symmetric key
  const envelopeKey = nacl.hash(sharedKey).slice(0, 32);

  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  // Seal: encrypt(senderCertificate || ciphertext) with the envelope key
  const inner = concat(senderCertificate, ciphertext);
  const sealed = nacl.secretbox(inner, nonce, envelopeKey);

  // Envelope format: [ephemeralPublicKey (32)] [nonce (24)] [sealed ciphertext]
  return concat(ephemeral.publicKey, nonce, sealed);
}

export function openSealedSenderEnvelope(
  envelope: Uint8Array,
  recipientIdentity: { publicKey: Uint8Array; secretKey: Uint8Array },
  senderCertificateLength: number // Must be known to split sender cert from ciphertext
): {
  senderCertificate: Uint8Array;
  ciphertext: Uint8Array;
} | null {
  if (envelope.length < 32 + 24 + 16) {
    return null; // Too short to be valid
  }

  const ephemeralPublicKey = envelope.slice(0, 32);
  const nonce = envelope.slice(32, 56);
  const sealed = envelope.slice(56);

  // Derive the same shared key
  const sharedKey = nacl.scalarMult(recipientIdentity.secretKey, ephemeralPublicKey);
  const envelopeKey = nacl.hash(sharedKey).slice(0, 32);

  const inner = nacl.secretbox.open(sealed, nonce, envelopeKey);
  if (!inner) {
    return null; // Decryption failed
  }

  return {
    senderCertificate: inner.slice(0, senderCertificateLength),
    ciphertext: inner.slice(senderCertificateLength),
  };
}

// ─── Base64 convenience wrappers ───────────────────────────────────────

export function createSealedSenderEnvelopeBase64(
  senderCertificateBase64: string,
  ciphertextBase64: string,
  recipientIdentityKeyBase64: string
): string {
  const envelope = createSealedSenderEnvelope(
    decodeBase64(senderCertificateBase64),
    decodeBase64(ciphertextBase64),
    decodeBase64(recipientIdentityKeyBase64)
  );
  return encodeBase64(envelope);
}
