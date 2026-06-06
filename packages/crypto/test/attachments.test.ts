import { describe, it, expect } from 'vitest';
import { 
  encryptAttachment, 
  decryptAttachment,
  encryptAttachmentBase64,
  decryptAttachmentBase64
} from '../src/attachments';

describe('Attachment Encryption', () => {
  it('should encrypt and decrypt an ArrayBuffer correctly', async () => {
    const plaintext = new TextEncoder().encode('Hello world, this is a secret attachment test!');
    
    // Encrypt
    const encrypted = await encryptAttachment(plaintext);
    
    expect(encrypted.encryptedData).toBeDefined();
    expect(encrypted.key).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    
    // Ciphertext should not be the plaintext
    const cipherBytes = new Uint8Array(encrypted.encryptedData);
    const plainBytes = new Uint8Array(plaintext);
    expect(cipherBytes).not.toEqual(plainBytes);

    // Decrypt
    const decryptedBuffer = await decryptAttachment(
      encrypted.encryptedData,
      encrypted.key,
      encrypted.iv
    );
    
    // Should match original
    const decryptedText = new TextDecoder().decode(decryptedBuffer!);
    expect(decryptedText).toBe('Hello world, this is a secret attachment test!');
  });

  it('should encrypt and decrypt using Base64 format', async () => {
    const plaintext = new TextEncoder().encode('Base64 test data here');
    
    const encrypted = await encryptAttachmentBase64(plaintext);
    
    expect(typeof encrypted.encryptedDataBase64).toBe('string');
    expect(typeof encrypted.keyBase64).toBe('string');
    expect(typeof encrypted.ivBase64).toBe('string');

    const decryptedBuffer = await decryptAttachmentBase64(
      encrypted.encryptedDataBase64,
      encrypted.keyBase64,
      encrypted.ivBase64
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer!);
    expect(decryptedText).toBe('Base64 test data here');
  });

  it('should fail decryption if IV is wrong', async () => {
    const plaintext = new TextEncoder().encode('Base64 test data here');
    const encrypted = await encryptAttachmentBase64(plaintext);
    
    // Modify IV
    const wrongIv = Buffer.from(new Uint8Array(24)).toString('base64');
    
    const result = decryptAttachmentBase64(
      encrypted.encryptedDataBase64,
      encrypted.keyBase64,
      wrongIv
    );
    expect(result).toBeNull();
  });
});
