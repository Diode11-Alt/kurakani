import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

const minioEndpoint = process.env.MINIO_ENDPOINT || 'http://127.0.0.1:9000';
const minioUser = process.env.MINIO_USER || 'admin';
const minioPassword = process.env.MINIO_PASSWORD || 'password123';
export const BUCKET_NAME = 'signal-attachments';

export const s3Client = new S3Client({
  region: 'us-east-1', // MinIO doesn't strictly need a real AWS region, but SDK requires one
  credentials: {
    accessKeyId: minioUser,
    secretAccessKey: minioPassword,
  },
  endpoint: minioEndpoint,
  forcePathStyle: true, // Required for MinIO
});

export async function initS3() {
  try {
    // Check if bucket exists
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`[S3] Bucket '${BUCKET_NAME}' already exists.`);
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`[S3] Bucket '${BUCKET_NAME}' not found. Creating...`);
      await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`[S3] Bucket '${BUCKET_NAME}' created successfully.`);
    } else {
      console.error('[S3] Error initializing bucket:', error);
    }
  }
}
