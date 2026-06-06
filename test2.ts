import { WebSignalStore } from './apps/web/src/lib/crypto/WebSignalStore';
import { generateSignalRegistrationPayload } from './packages/crypto/src/keys';

async function test() {
  const store = new WebSignalStore();
  const payload = await generateSignalRegistrationPayload(1 as any);
  console.log(payload.registrationId);
}
test();
