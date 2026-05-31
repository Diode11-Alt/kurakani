const fetch = require('node-fetch');
async function run() {
  const serverPayload = {
    deviceId: 1,
    registrationId: 12345,
    identityKey: 'base64_identity_key',
    signedPreKey: {
      keyId: 1,
      publicKey: 'base64_signed_pre_key_public',
      signature: 'base64_signature'
    },
    oneTimePreKeys: [
      { keyId: 1, publicKey: 'base64_prekey_1' }
    ]
  };

  const res = await fetch('http://localhost:4000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test_dup@example.com`,
      password: 'password123',
      username: `user_dup`,
      serverPayload
    })
  });
  console.log(await res.text());
  
  // try again to get the "server error"
  const res2 = await fetch('http://localhost:4000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test_dup2@example.com`, // different email
      password: 'password123',
      username: `user_dup`, // same username
      serverPayload
    })
  });
  console.log(await res2.text());
}
run();
