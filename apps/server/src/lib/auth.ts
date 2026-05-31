import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev';

export function verifyToken(token: string): { userId: string, deviceId: number } {
  const decoded = jwt.verify(token, secret) as any;
  return {
    userId: decoded.userId,
    deviceId: decoded.deviceId,
  };
}

/**
 * Validates inbound plaintext password against database-persisted bcrypt string safely
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    if (!password || !hash) return false;
    
    // Explicitly await the asynchronous thread execution
    const match = await bcrypt.compare(password, hash);
    return match;
  } catch (error) {
    // Audit log internally; do not bubble raw runtime anomalies to the outer client layer
    console.error("Cryptographic hardware comparison failure:", error);
    return false;
  }
};
