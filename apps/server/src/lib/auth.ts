import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev';

export function verifyToken(token: string): { userId: string, deviceId: number } {
  const decoded = jwt.verify(token, secret) as any;
  return {
    userId: decoded.userId,
    deviceId: decoded.deviceId,
  };
}
