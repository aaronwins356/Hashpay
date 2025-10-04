import '../../helpers/env';
import { authMiddleware, resetAuthMiddlewareJwtVerifier, setAuthMiddlewareJwtVerifier } from '../../../src/middleware/auth';
import { describe, it, beforeEach, expect } from '../../utils/harness';
import { createMockResponse, MockRequest } from '../../helpers/http';

describe('authMiddleware', () => {
  beforeEach(() => {
    resetAuthMiddlewareJwtVerifier();
  });

  it('allows requests with a valid token', () => {
    setAuthMiddlewareJwtVerifier(() => ({ userId: 42 }));

    const req: MockRequest = { headers: { authorization: 'Bearer valid-token' } };
    const res = createMockResponse();
    let nextCalled = false;

    authMiddleware(req as any, res as any, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect((req as any).user).toEqual({ id: 42 });
  });

  it('rejects requests with an invalid token', () => {
    setAuthMiddlewareJwtVerifier(() => {
      throw new Error('Invalid token');
    });

    const req: MockRequest = { headers: { authorization: 'Bearer invalid-token' } };
    const res = createMockResponse();
    let nextCalled = false;

    authMiddleware(req as any, res as any, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Invalid or expired token.' });
  });
});
