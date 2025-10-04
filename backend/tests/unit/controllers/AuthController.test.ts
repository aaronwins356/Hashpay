import '../../helpers/env';
import AuthController, {
  resetAuthControllerDependencies,
  setAuthControllerDependencies
} from '../../../src/controllers/AuthController';
import { describe, it, beforeEach, expect } from '../../utils/harness';
import { createMockResponse, MockRequest } from '../../helpers/http';

interface MockUser {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

describe('AuthController', () => {
  let findUserReturn: MockUser | null;
  let createUserReturn: MockUser;
  let compareResult: boolean;
  let hashResult: string;
  let signResult: string;

  const findUserCalls: string[] = [];
  const createUserCalls: Array<[string, string]> = [];
  const hashCalls: string[] = [];
  const compareCalls: Array<[string, string]> = [];
  const signCalls: unknown[] = [];

  const mockRepository = {
    async findUserByEmail(email: string) {
      findUserCalls.push(email);
      return findUserReturn;
    },
    async createUser(email: string, passwordHash: string) {
      createUserCalls.push([email, passwordHash]);
      return createUserReturn;
    },
    async findUserById() {
      return null;
    }
  };

  const mockBcrypt = {
    async hash(password: string) {
      hashCalls.push(password);
      return hashResult;
    },
    async compare(password: string, hash: string) {
      compareCalls.push([password, hash]);
      return compareResult;
    }
  };

  const mockJwt = {
    sign(payload: unknown) {
      signCalls.push(payload);
      return signResult;
    }
  };

  beforeEach(() => {
    findUserReturn = null;
    createUserReturn = {
      id: 1,
      email: 'user@example.com',
      passwordHash: 'hashed',
      createdAt: new Date('2024-01-01T00:00:00Z')
    };
    compareResult = true;
    hashResult = 'hashed';
    signResult = 'jwt-token';

    findUserCalls.length = 0;
    createUserCalls.length = 0;
    hashCalls.length = 0;
    compareCalls.length = 0;
    signCalls.length = 0;

    resetAuthControllerDependencies();
    setAuthControllerDependencies({
      userRepository: mockRepository as any,
      bcrypt: mockBcrypt as any,
      jwt: mockJwt as any
    });
  });

  it('signs up a user and returns a token', async () => {
    const req: MockRequest<{ email: string; password: string }> = {
      body: { email: 'User@example.com ', password: 'Password123' }
    };
    const res = createMockResponse();

    const response = await AuthController.signup(req as any, res as any);

    expect(findUserCalls[0]).toBe('user@example.com');
    expect(createUserCalls[0]).toEqual(['user@example.com', 'hashed']);
    expect(hashCalls[0]).toBe('Password123');
    expect(signCalls.length).toBe(1);

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      token: 'jwt-token',
      user: {
        id: 1,
        email: 'user@example.com'
      }
    });
  });

  it('logs in a user with valid credentials', async () => {
    const createdAt = new Date('2024-01-02T00:00:00Z');
    findUserReturn = {
      id: 2,
      email: 'user@example.com',
      passwordHash: 'hashed-password',
      createdAt
    };
    compareResult = true;
    signResult = 'login-token';

    const req: MockRequest<{ email: string; password: string }> = {
      body: { email: 'user@example.com', password: 'Password123' }
    };
    const res = createMockResponse();

    const response = await AuthController.login(req as any, res as any);

    expect(findUserCalls[0]).toBe('user@example.com');
    expect(compareCalls[0]).toEqual(['Password123', 'hashed-password']);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      token: 'login-token',
      user: {
        id: 2,
        email: 'user@example.com',
        createdAt: createdAt.toISOString()
      }
    });
  });

  it('rejects invalid login attempts', async () => {
    findUserReturn = null;

    const req: MockRequest<{ email: string; password: string }> = {
      body: { email: 'user@example.com', password: 'wrong-password' }
    };
    const res = createMockResponse();

    const response = await AuthController.login(req as any, res as any);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid credentials.' });
  });
});
