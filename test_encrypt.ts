import { SessionBuilder, SessionCipher, SignalProtocolAddress, KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { WebSignalStore } from './apps/web/src/lib/crypto/WebSignalStore';
import { generateSignalRegistrationPayload } from './apps/web/src/lib/crypto/registration';

async function test() {
  const storeA = new WebSignalStore();
  storeA['dbName'] = 'storeA';
  const payloadA = await generateSignalRegistrationPayload(storeA);

  const storeB = new WebSignalStore();
  storeB['dbName'] = 'storeB';
  const payloadB = await generateSignalRegistrationPayload(storeB);

  const addressB = new SignalProtocolAddress('bob', 1);
  const builderA = new SessionBuilder(storeA, addressB);
  await builderA.processPreKey({
    registrationId: payloadB.registrationId,
    identityKey: storeB.dbPromise.then(() => storeB.getIdentityKeyPair().then(kp => kp.pubKey)), // mock
    // we need array buffers
  });
}
