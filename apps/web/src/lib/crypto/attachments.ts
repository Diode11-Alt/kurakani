export async function encryptAttachment(file: File) {
  // 1. Generate a fresh 256-bit AES-GCM key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // Extractable so we can send it to the recipient
    ['encrypt', 'decrypt']
  );

  // 2. Generate a 12-byte random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Read the file as an ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // 4. Encrypt the file buffer
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  );

  // 5. Export the raw key
  const rawKey = await crypto.subtle.exportKey('raw', key);

  // Helper to convert ArrayBuffer to Base64
  const bufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  return {
    encryptedBlob: new Blob([encryptedBuffer], { type: 'application/octet-stream' }),
    keyBase64: bufferToBase64(rawKey),
    ivBase64: bufferToBase64(iv.buffer),
  };
}

export async function decryptAttachment(encryptedBlob: Blob, keyBase64: string, ivBase64: string) {
  // Helper to convert Base64 to Uint8Array
  const base64ToUint8Array = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const rawKey = base64ToUint8Array(keyBase64);
  const iv = base64ToUint8Array(ivBase64);

  // 1. Import the AES-GCM key
  const key = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // 2. Read the encrypted Blob
  const encryptedBuffer = await encryptedBlob.arrayBuffer();

  // 3. Decrypt the buffer
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedBuffer
  );

  // Return as a standard Blob (MIME type will be set by the caller)
  return new Blob([decryptedBuffer]);
}
