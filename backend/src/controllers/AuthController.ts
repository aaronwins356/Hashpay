import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../config';
import UserRepository, { User } from '../repositories/UserRepository';

const TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 10;

type AuthenticatedUser = Pick<User, 'id' | 'email' | 'createdAt'>;

const toProfile = (user: User): AuthenticatedUser => ({
  id: user.id,
  email: user.email,
  createdAt: user.createdAt
});

const isValidEmail = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
  return emailRegex.test(trimmed);
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const isValidPassword = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }
  return value.length >= 8 && value.length <= 128;
};

const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, config.jwt.secret, { expiresIn: TOKEN_EXPIRY });
};

class AuthController {
  public static async signup(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body ?? {};

      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'A valid email address is required.' });
      }

      if (!isValidPassword(password)) {
        return res
          .status(400)
          .json({ message: 'Password must be between 8 and 128 characters long.' });
      }

      const normalizedEmail = normalizeEmail(email);

      const existingUser = await UserRepository.findUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({ message: 'Email is already registered.' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await UserRepository.createUser(normalizedEmail, passwordHash);
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
      const { email, password } = req.body ?? {};

      if (!isValidEmail(email) || !isValidPassword(password)) {
        return res.status(400).json({ message: 'Invalid email or password.' });
      }

      const normalizedEmail = normalizeEmail(email);
      const user = await UserRepository.findUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
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
