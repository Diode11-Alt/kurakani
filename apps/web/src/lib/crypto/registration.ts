/* eslint-disable @typescript-eslint/no-explicit-any */
import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { arrayBufferToBase64 } from '@signal/crypto';
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
