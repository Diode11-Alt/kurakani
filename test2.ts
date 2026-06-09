import { WebSignalStore } from './apps/web/src/lib/crypto/WebSignalStore';
import { generateSignalRegistrationPayload } from './packages/crypto/src/keys';

async function test() {
  const store = new WebSignalStore();
  const payload = await generateSignalRegistrationPayload(store);
  console.log(payload.registrationId);
}
test();
