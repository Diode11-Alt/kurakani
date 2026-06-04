import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';

export function useFileUpload(currentUserId: string | null) {
  const [uploading, setUploading] = useState(false);

  const uploadToS3 = useCallback(async (file: File | Blob, contentType: string): Promise<string> => {
    if (!currentUserId) throw new Error("No user ID");
    const extRaw = contentType.split('/')[1] || 'bin';
    const ext = extRaw.split(';')[0];
    const s3Key = `${currentUserId}-${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage.from('attachments').upload(s3Key, file, { contentType });
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(s3Key);
    return publicUrl;
  }, [currentUserId]);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
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

      const downloadUrl = await uploadToS3(uploadFile, file.type || 'application/octet-stream');
      return downloadUrl;
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
