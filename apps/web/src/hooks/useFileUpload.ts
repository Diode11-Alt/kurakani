import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';

export function useFileUpload(currentUserId: string | null) {
  const [uploading, setUploading] = useState(false);

  const uploadToS3 = useCallback(async (file: File | Blob, contentType: string): Promise<{ s3Key: string; keyBase64: string; ivBase64: string }> => {
    if (!currentUserId) throw new Error("No user ID");
    
    // Convert file to bytes and encrypt
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);
    const { encryptAttachmentBase64 } = await import('@signal/crypto');
    const { encryptedDataBase64, keyBase64, ivBase64 } = encryptAttachmentBase64(fileBytes);
    
    // Convert base64 ciphertext to Blob for upload
    const { decodeBase64 } = await import('tweetnacl-util');
    const encryptedData = decodeBase64(encryptedDataBase64);
    const encryptedBlob = new Blob([encryptedData], { type: contentType });
    
    const extRaw = contentType.split('/')[1] || 'bin';
    const ext = extRaw.split(';')[0];
    const s3Key = `${currentUserId}-${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage.from('attachments').upload(s3Key, encryptedBlob, { contentType });
    if (error) throw error;
    
    return { 
      s3Key, 
      keyBase64, 
      ivBase64 
    };
  }, [currentUserId]);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      // S-06: File validation
      const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
      if (file.size > MAX_SIZE) {
        throw new Error("File exceeds 100MB limit");
      }
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      if (!allowedTypes.includes(file.type) && file.type !== "") {
        // file.type might be empty for some files, but we should restrict
        throw new Error("File type not allowed");
      }

      let uploadFile: File | Blob = file;
      if (file.type.startsWith('image/')) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        try {
          uploadFile = await imageCompression(file, options);
        } catch (error) {
          console.error('Compression error', error);
        }
      }

      const result = await uploadToS3(uploadFile, file.type || 'application/octet-stream');
      return result;
    } catch (err) {
      console.error('File upload error:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [uploadToS3]);

  return {
    uploading,
    setUploading, // In case manual override is needed
    uploadToS3,
    handleFileUpload
  };
}
