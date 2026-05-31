import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { s3Client, BUCKET_NAME } from '../lib/s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import crypto from 'crypto';
import { db, schema } from '@signal/db';
import { eq } from 'drizzle-orm';

const router = Router();

// POST /api/attachments/upload-url
// Request a pre-signed URL to upload an encrypted file
router.post('/upload-url', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { contentType, size } = req.body;
    
    // Generate a random object key (UUID-like)
    const s3Key = crypto.randomUUID();

    // Use createPresignedPost instead of getSignedUrl (PUT) to enforce strict size conditions
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Conditions: [
        ['content-length-range', 0, 52428800], // 50MB limit
        ['eq', '$Content-Type', (contentType as string) || 'application/octet-stream'],
      ],
      Fields: {
        'Content-Type': (contentType as string) || 'application/octet-stream',
      },
      Expires: 300, // URL expires in 5 minutes
    });

    res.json({ uploadUrl: url, fields, s3Key });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Server error generating upload URL' });
  }
});

// GET /api/attachments/download-url
// Request a pre-signed URL to download an encrypted file
router.get('/download-url', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { s3Key } = req.query;
    if (!s3Key || typeof s3Key !== 'string') {
      return res.status(400).json({ error: 's3Key is required' });
    }

    // In a production app, we would verify the user has access to the message containing this attachment.
    // For now, we assume if they have the s3Key (sent via E2EE message), they are authorized to download the ciphertext.
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    // URL expires in 15 minutes
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    res.json({ downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Server error generating download URL' });
  }
});

export default router;
