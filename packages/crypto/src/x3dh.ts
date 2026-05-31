import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { KeyPairType as KeyPair } from '@privacyresearch/libsignal-protocol-typescript';

// Using a simplified DH for the web clone to avoid ed2curve conversions.
// We use the ephemeral key against the Signed PreKey and One-Time PreKey.
// Alice generates an Ephemeral Key (EK_A).
// DH1 = DH(EK_A, SPK_B)
// DH2 = DH(EK_A, OPK_B)
// shared_secret = KDF(DH1 || DH2)

export function establishSessionAsInitiator(
  ephemeralKeyPair: KeyPair,
  bobSignedPreKeyPublicBase64: string,
  bobOneTimePreKeyPublicBase64?: string
): Uint8Array {
  const ek_sk = new Uint8Array(ephemeralKeyPair.privKey);
  const spk_pk = decodeBase64(bobSignedPreKeyPublicBase64);
  
  // DH1 = DH(EK_A, SPK_B)
  const dh1 = nacl.box.before(spk_pk, ek_sk);
  
  let sharedMaterial = dh1;

  if (bobOneTimePreKeyPublicBase64) {
    const opk_pk = decodeBase64(bobOneTimePreKeyPublicBase64);
    // DH2 = DH(EK_A, OPK_B)
    const dh2 = nacl.box.before(opk_pk, ek_sk);
    
    // Concat dh1 and dh2
    const combined = new Uint8Array(dh1.length + dh2.length);
    combined.set(dh1);
    combined.set(dh2, dh1.length);
    sharedMaterial = combined;
  }

  // KDF (using SHA-512)
  return nacl.hash(sharedMaterial).slice(0, 32); // Take first 32 bytes for AES/NaCl box
}

export function establishSessionAsReceiver(
  ephemeralPublicKeyBase64: string,
  mySignedPreKeyPrivateBase64: string,
  myOneTimePreKeyPrivateBase64?: string
): Uint8Array {
  const ek_pk = decodeBase64(ephemeralPublicKeyBase64);
  const spk_sk = decodeBase64(mySignedPreKeyPrivateBase64);
  
  // DH1 = DH(SPK_B, EK_A)
  const dh1 = nacl.box.before(ek_pk, spk_sk);
  
  let sharedMaterial = dh1;

  if (myOneTimePreKeyPrivateBase64) {
    const opk_sk = decodeBase64(myOneTimePreKeyPrivateBase64);
    // DH2 = DH(OPK_B, EK_A)
    const dh2 = nacl.box.before(ek_pk, opk_sk);
    
    // Concat dh1 and dh2
    const combined = new Uint8Array(dh1.length + dh2.length);
    combined.set(dh1);
    combined.set(dh2, dh1.length);
    sharedMaterial = combined;
  }

  // KDF (using SHA-512)
  return nacl.hash(sharedMaterial).slice(0, 32); 
}

export function encryptMessage(sharedSecret: Uint8Array, plaintext: string) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = decodeUTF8(plaintext);
  const encrypted = nacl.secretbox(messageUint8, nonce, sharedSecret);
  
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  return encodeBase64(fullMessage);
}

export function decryptMessage(sharedSecret: Uint8Array, ciphertextBase64: string): string {
  const messageWithNonceAsUint8Array = decodeBase64(ciphertextBase64);
  const nonce = messageWithNonceAsUint8Array.slice(0, nacl.secretbox.nonceLength);
  const message = messageWithNonceAsUint8Array.slice(nacl.secretbox.nonceLength);
  
  const decrypted = nacl.secretbox.open(message, nonce, sharedSecret);
  
  if (!decrypted) {
    throw new Error('Failed to decrypt message');
  }
  
  return encodeUTF8(decrypted);
}
