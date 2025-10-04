import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../config';
import UserRepository, { User } from '../repositories/UserRepository';
import { sanitizeEmail } from '../utils/sanitize';

const TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 10;

type AuthenticatedUser = Pick<User, 'id' | 'email' | 'createdAt'>;

type AuthDependencies = {
  userRepository: typeof UserRepository;
  bcrypt: typeof bcrypt;
  jwt: typeof jwt;
};

const authDependencies: AuthDependencies = {
  userRepository: UserRepository,
  bcrypt,
  jwt
};

export const setAuthControllerDependencies = (overrides: Partial<AuthDependencies>): void => {
  Object.assign(authDependencies, overrides);
};

export const resetAuthControllerDependencies = (): void => {
  authDependencies.userRepository = UserRepository;
  authDependencies.bcrypt = bcrypt;
  authDependencies.jwt = jwt;
};

const toProfile = (user: User): AuthenticatedUser => ({
  id: user.id,
  email: user.email,
  createdAt: user.createdAt
});

const generateToken = (userId: number): string => {
  return authDependencies.jwt.sign({ userId }, config.jwt.secret, { expiresIn: TOKEN_EXPIRY });
};

class AuthController {
  public static async signup(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body as { email: string; password: string };

      const normalizedEmail = sanitizeEmail(email);

      const existingUser = await authDependencies.userRepository.findUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({ message: 'Email is already registered.' });
      }

      const passwordHash = await authDependencies.bcrypt.hash(password, SALT_ROUNDS);
      const user = await authDependencies.userRepository.createUser(normalizedEmail, passwordHash);
      const token = generateToken(user.id);

      return res.status(201).json({ token, user: toProfile(user) });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error during signup:', error);
      return res.status(500).json({ message: 'Unable to create account. Please try again.' });
    }
  }

  public static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body as { email: string; password: string };

      const normalizedEmail = sanitizeEmail(email);
      const user = await authDependencies.userRepository.findUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const isPasswordValid = await authDependencies.bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const token = generateToken(user.id);

      return res.status(200).json({ token, user: toProfile(user) });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error during login:', error);
      return res.status(500).json({ message: 'Unable to log in. Please try again.' });
    }
  }

  public static async me(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      const user = await UserRepository.findUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      return res.status(200).json({ user: toProfile(user) });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ message: 'Unable to retrieve profile.' });
    }
  }
}

export default AuthController;
