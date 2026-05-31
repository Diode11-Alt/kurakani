import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    deviceId: number;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev';

  try {
    const decoded = jwt.verify(token, secret) as any;
    req.user = {
      userId: decoded.userId,
      deviceId: decoded.deviceId,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
