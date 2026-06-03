// @ts-nocheck
import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { WebSignalStore } from './WebSignalStore';

export async function generateSignalRegistrationPayload(store: WebSignalStore) {
  // 1. Generate Registration ID
  const registrationId = KeyHelper.generateRegistrationId();
  await store.saveLocalRegistrationId(registrationId);

  // 2. Generate Identity Key Pair
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  await store.saveIdentityKeyPair(identityKeyPair);

  // 3. Generate Signed Pre-Key (Id = 1)
  const signedPreKeyId = 1;
  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);
  await store.storeSignedPreKey(signedPreKeyId, signedPreKey);

  // 4. Generate 100 One-Time Pre-Keys (OTPKs) (Ids 1 to 100)
  const preKeys = [];
  for (let i = 1; i <= 100; i++) {
    const preKey = await KeyHelper.generatePreKey(i);
    preKeys.push(preKey);
    await store.storePreKey(preKey.keyId, preKey.keyPair);
  }

  // 5. Structure the payload for the KDS (Key Distribution Server)
  // Note: Libsignal's ArrayBuffers must be converted to Base64 strings for JSON transmission.
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const payload = {
    registrationId,
    identityKey: arrayBufferToBase64(identityKeyPair.pubKey),
    signedPreKey: {
      keyId: signedPreKey.keyId,
      publicKey: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
      signature: arrayBufferToBase64(signedPreKey.signature),
    },
    oneTimePreKeys: preKeys.map((pk) => ({
      keyId: pk.keyId,
      publicKey: arrayBufferToBase64(pk.keyPair.pubKey),
    })),
  };

  return payload;
}
