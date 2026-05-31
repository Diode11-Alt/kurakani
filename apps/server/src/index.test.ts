import { describe, it, expect, beforeAll } from 'vitest';
import WebSocket from 'ws';

const API_URL = 'http://localhost:4000/api';
const WS_URL = 'ws://localhost:4000';

describe('API and Signaling Endpoints', () => {
  let token1: string;
  let token2: string;
  let userId1: string;
  let userId2: string;
  
  const testEmail1 = `test1_${Date.now()}@example.com`;
  const testEmail2 = `test2_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

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

  it('should register user 1', async () => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail1,
        password: testPassword,
        username: `user1_${Date.now()}`,
        serverPayload
      })
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.token).toBeDefined();
    token1 = data.token;
    userId1 = data.user.id;
  });

  it('should register user 2', async () => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail2,
        password: testPassword,
        username: `user2_${Date.now()}`,
        serverPayload
      })
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.token).toBeDefined();
    token2 = data.token;
    userId2 = data.user.id;
  });

  it('should reject WS connection without token', () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      ws.on('close', (code) => {
        expect(code).toBe(4001);
        resolve();
      });
      ws.on('error', (err) => {
        // Ignored
      });
    });
  });

  it('should connect WS and receive presence and messages', () => {
    return new Promise<void>((resolve, reject) => {
      const ws1 = new WebSocket(`${WS_URL}?token=${token1}`);
      const ws2 = new WebSocket(`${WS_URL}?token=${token2}`);

      let ws1Ready = false;
      let ws2Ready = false;

      ws1.on('open', () => { ws1Ready = true; checkReady(); });
      ws2.on('open', () => { ws2Ready = true; checkReady(); });

      function checkReady() {
        if (ws1Ready && ws2Ready) {
          // Give server a tiny bit of time to register the connection in the Map
          setTimeout(() => {
            ws1.send(JSON.stringify({
              type: 'message:send',
              recipientId: userId2,
              ciphertext: 'hello',
              ciphertextType: 1
            }));
          }, 100);
        }
      }

      ws2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'message:receive') {
          expect(msg.fromUserId).toBe(userId1);
          expect(msg.ciphertext).toBe('hello');
          ws1.close();
          ws2.close();
          resolve();
        }
      });

      // Timeout safety
      setTimeout(() => {
        ws1.close();
        ws2.close();
        reject(new Error('Timeout waiting for message'));
      }, 3000);
    });
  });
});
