import { NextFunction, Request, Response } from 'express';
import config from '../../config';

type RateLimitRecord = {
  count: number;
  expiresAt: number;
};

const store = new Map<string, RateLimitRecord>();

const cleanupExpired = (now: number) => {
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
};

const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): Response | void => {
  const windowMs = config.server.rateLimit.windowMs;
  const maxRequests = config.server.rateLimit.maxRequests;
  const now = Date.now();

  cleanupExpired(now);

  const identifier = req.ip || req.headers['x-forwarded-for']?.toString() || 'anonymous';
  const existing = store.get(identifier);

  if (!existing || existing.expiresAt <= now) {
    store.set(identifier, { count: 1, expiresAt: now + windowMs });
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - 1));
    return next();
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res
      .status(429)
      .json({ message: 'Too many requests from this IP, please try again later.' });
  }

  existing.count += 1;
  store.set(identifier, existing);
  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - existing.count)));
  return next();
};

export default rateLimitMiddleware;
