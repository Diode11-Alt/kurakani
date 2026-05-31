
async function main() {
  const serverPayload = {
    registrationId: 12345,
    identityKey: 'base64_identity_key',
    signedPreKey: {
      keyId: 1,
      publicKey: 'base64_signed_pre_key_public',
      signature: 'base64_signature'
    },
    preKeys: [
      { keyId: 1, publicKey: 'base64_prekey_1' }
    ]
  };

  const res = await fetch('http://localhost:4000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test_${Date.now()}@example.com`,
      password: 'password123',
      username: `user_${Date.now()}`,
      serverPayload
    })
  });

  const text = await res.text();
  console.log(res.status, text);
}

main().catch(console.error);
