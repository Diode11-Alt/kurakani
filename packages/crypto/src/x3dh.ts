import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { concat, hkdf } from './hkdf';

/**
 * X3DH — Extended Triple Diffie-Hellman Key Agreement
 * Implements the Signal Protocol's initial key exchange.
 *
 * Alice (initiator) performs:
 *   DH1 = DH(IK_A, SPK_B)       — Identity ↔ Signed PreKey
 *   DH2 = DH(EK_A, IK_B)        — Ephemeral ↔ Identity
 *   DH3 = DH(EK_A, SPK_B)       — Ephemeral ↔ Signed PreKey
 *   DH4 = DH(EK_A, OPK_B)       — Ephemeral ↔ One-Time PreKey (optional)
 *
 * Bob (receiver) mirrors with the private keys.
 */

const X3DH_INFO = 'KurakaniX3DH';

// ─── Sender (Alice) Session Establishment ──────────────────────────────

export interface SenderSessionResult {
  sharedSecret: Uint8Array;
  ephemeralPublicKey: Uint8Array;
}

export async function x3dhSenderCalculate(
  senderIdentity: { publicKey: Uint8Array; secretKey: Uint8Array },
  recipientBundle: {
    identityKey: Uint8Array;
    signedPreKey: Uint8Array;
    oneTimePreKey: Uint8Array | null;
  }
): Promise<SenderSessionResult> {
  // Generate ephemeral key pair — fresh for each session
  const ephemeralKeyPair = nacl.box.keyPair();

  // DH1 = DH(IK_A_secret, SPK_B_public)
  const dh1 = nacl.scalarMult(senderIdentity.secretKey, recipientBundle.signedPreKey);

  // DH2 = DH(EK_A_secret, IK_B_public)
  const dh2 = nacl.scalarMult(ephemeralKeyPair.secretKey, recipientBundle.identityKey);

  // DH3 = DH(EK_A_secret, SPK_B_public)
  const dh3 = nacl.scalarMult(ephemeralKeyPair.secretKey, recipientBundle.signedPreKey);

  let dhInput: Uint8Array;
  if (recipientBundle.oneTimePreKey) {
    // DH4 = DH(EK_A_secret, OPK_B_public)
    const dh4 = nacl.scalarMult(ephemeralKeyPair.secretKey, recipientBundle.oneTimePreKey);
    dhInput = concat(dh1, dh2, dh3, dh4);
  } else {
    dhInput = concat(dh1, dh2, dh3);
  }

  // KDF: HKDF-SHA256 with zero salt, info = "KurakaniX3DH"
  const sharedSecret = await hkdf(dhInput, 32, X3DH_INFO);

  return {
    sharedSecret,
    ephemeralPublicKey: ephemeralKeyPair.publicKey,
  };
}

// ─── Receiver (Bob) Session Establishment ──────────────────────────────

export async function x3dhReceiverCalculate(
  recipientIdentity: { publicKey: Uint8Array; secretKey: Uint8Array },
  signedPreKeySecret: Uint8Array,
  oneTimePreKeySecret: Uint8Array | null,
  senderEphemeralKey: Uint8Array,
  senderIdentityKey: Uint8Array
): Promise<Uint8Array> {
  // DH1 = DH(SPK_B_secret, IK_A_public)
  const dh1 = nacl.scalarMult(signedPreKeySecret, senderIdentityKey);

  // DH2 = DH(IK_B_secret, EK_A_public)
  const dh2 = nacl.scalarMult(recipientIdentity.secretKey, senderEphemeralKey);

  // DH3 = DH(SPK_B_secret, EK_A_public)
  const dh3 = nacl.scalarMult(signedPreKeySecret, senderEphemeralKey);

  let dhInput: Uint8Array;
  if (oneTimePreKeySecret) {
    // DH4 = DH(OPK_B_secret, EK_A_public)
    const dh4 = nacl.scalarMult(oneTimePreKeySecret, senderEphemeralKey);
    dhInput = concat(dh1, dh2, dh3, dh4);
  } else {
    dhInput = concat(dh1, dh2, dh3);
  }

  // Must produce the same shared secret as the sender
  return hkdf(dhInput, 32, X3DH_INFO);
}

// ─── Simplified Session Establishment (backward-compat wrapper) ────────
// Uses only 2 DH for cases where identity keys are not available (e.g. prekey messages)

export function establishSessionAsInitiator(
  ephemeralKeyPair: { pubKey: ArrayBuffer; privKey: ArrayBuffer },
  bobSignedPreKeyPublicBase64: string,
  bobOneTimePreKeyPublicBase64?: string
): Uint8Array {
  const ek_sk = new Uint8Array(ephemeralKeyPair.privKey);
  const spk_pk = decodeBase64(bobSignedPreKeyPublicBase64);

  const dh1 = nacl.box.before(spk_pk, ek_sk);

  let sharedMaterial = dh1;

  if (bobOneTimePreKeyPublicBase64) {
    const opk_pk = decodeBase64(bobOneTimePreKeyPublicBase64);
    const dh2 = nacl.box.before(opk_pk, ek_sk);
    const combined = new Uint8Array(dh1.length + dh2.length);
    combined.set(dh1);
    combined.set(dh2, dh1.length);
    sharedMaterial = combined;
  }

  return nacl.hash(sharedMaterial).slice(0, 32);
}

export function establishSessionAsReceiver(
  ephemeralPublicKeyBase64: string,
  mySignedPreKeyPrivateBase64: string,
  myOneTimePreKeyPrivateBase64?: string
): Uint8Array {
  const ek_pk = decodeBase64(ephemeralPublicKeyBase64);
  const spk_sk = decodeBase64(mySignedPreKeyPrivateBase64);

  const dh1 = nacl.box.before(ek_pk, spk_sk);

  let sharedMaterial = dh1;

  if (myOneTimePreKeyPrivateBase64) {
    const opk_sk = decodeBase64(myOneTimePreKeyPrivateBase64);
    const dh2 = nacl.box.before(ek_pk, opk_sk);
    const combined = new Uint8Array(dh1.length + dh2.length);
    combined.set(dh1);
    combined.set(dh2, dh1.length);
    sharedMaterial = combined;
  }

  return nacl.hash(sharedMaterial).slice(0, 32);
}

// ─── Message Encryption / Decryption ───────────────────────────────────

export function encryptMessage(sharedSecret: Uint8Array, plaintext: string): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = decodeUTF8(plaintext);
  const encrypted = nacl.secretbox(messageUint8, nonce, sharedSecret);

  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);

  return encodeBase64(fullMessage);
}

export function decryptMessage(sharedSecret: Uint8Array, ciphertextBase64: string): string | null {
  try {
    const messageWithNonce = decodeBase64(ciphertextBase64);
    const nonce = messageWithNonce.slice(0, nacl.secretbox.nonceLength);
    const message = messageWithNonce.slice(nacl.secretbox.nonceLength);

    const decrypted = nacl.secretbox.open(message, nonce, sharedSecret);

    if (!decrypted) {
      return null;
    }

    return encodeUTF8(decrypted);
  } catch {
    return null;
  }
}
