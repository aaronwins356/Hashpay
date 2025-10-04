import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config';

interface JwtPayload {
  userId: number;
  iat?: number;
  exp?: number;
}

type JwtVerifier = (token: string, secret: jwt.Secret) => JwtPayload;

let verifyJwt: JwtVerifier = (token: string, secret: jwt.Secret) => {
  return jwt.verify(token, secret) as JwtPayload;
};

export const setAuthMiddlewareJwtVerifier = (verifier: JwtVerifier): void => {
  verifyJwt = verifier;
};

export const resetAuthMiddlewareJwtVerifier = (): void => {
  verifyJwt = (token: string, secret: jwt.Secret) => jwt.verify(token, secret) as JwtPayload;
};

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
    const payload = verifyJwt(token, config.jwt.secret);
    req.user = { id: payload.userId };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export default authMiddleware;
