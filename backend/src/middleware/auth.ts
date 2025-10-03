import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config';

interface JwtPayload {
  userId: number;
  iat?: number;
  exp?: number;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): Response | void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = { id: payload.userId };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export default authMiddleware;
