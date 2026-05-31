import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateSignalRegistrationPayload(deviceId: number) {
  // Generate Identity Key and Registration ID
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  const registrationId = KeyHelper.generateRegistrationId();

  // Generate Signed PreKey (id = 1 usually)
  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);

  // Generate 100 One-Time PreKeys
  const oneTimePreKeys = [];
  for (let i = 0; i < 100; i++) {
    // Generate prekeys starting from id = 1
    const pk = await KeyHelper.generatePreKey(i + 1);
    oneTimePreKeys.push(pk);
  }

  // The payload to send to the server
  const serverPayload = {
    deviceId,
    registrationId,
    identityKey: arrayBufferToBase64(identityKeyPair.pubKey),
    signedPreKey: {
      keyId: signedPreKey.keyId,
      publicKey: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
      signature: arrayBufferToBase64(signedPreKey.signature),
    },
    oneTimePreKeys: oneTimePreKeys.map(k => ({
      keyId: k.keyId,
      publicKey: arrayBufferToBase64(k.keyPair.pubKey)
    }))
  };

  // The private material to save in our local SignalStore
  const localState = {
    identityKeyPair,
    registrationId,
    signedPreKey,
    oneTimePreKeys
  };

  return { serverPayload, localState };
}
