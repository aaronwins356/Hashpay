import { NextFunction, Request, Response } from 'express';
import config from '../../config';
import { sanitizeEmail, sanitizeInput } from '../utils/sanitize';

type Validator<T> = (value: unknown) => T;

type ValidatorMap = {
  body?: Validator<unknown>;
  params?: Validator<unknown>;
  query?: Validator<unknown>;
};

class ValidationException extends Error {
  public readonly details: string[];

  constructor(message: string, details: string[]) {
    super(message);
    this.details = details;
  }
}

const ensureObject = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) {
    throw new ValidationException('Validation failed', ['Payload must be an object.']);
  }
  return value as Record<string, unknown>;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const TESTNET_ADDRESS_REGEX = /^(tb1[ac-hj-np-z02-9]{39,59}|bcrt1[ac-hj-np-z02-9]{39,59}|[mn2][1-9A-HJ-NP-Za-km-z]{25,39})$/;

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new ValidationException('Validation failed', [`${field} must be a string.`]);
  }
  const sanitized = sanitizeInput(value);
  if (!sanitized) {
    throw new ValidationException('Validation failed', [`${field} is required.`]);
  }
  return sanitized;
};

const requirePassword = (value: unknown): string => {
  const password = requireString(value, 'password');
  if (password.length < 8 || password.length > 128) {
    throw new ValidationException('Validation failed', [
      'Password must be between 8 and 128 characters long.'
    ]);
  }
  return password;
};

const requireEmail = (value: unknown): string => {
  const email = sanitizeEmail(requireString(value, 'email'));
  if (!emailRegex.test(email)) {
    throw new ValidationException('Validation failed', ['A valid email address is required.']);
  }
  return email;
};

const requireAmount = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationException('Validation failed', ['Amount must be a numeric value.']);
  }
  if (value <= 0) {
    throw new ValidationException('Validation failed', ['Amount must be greater than zero.']);
  }
  if (value > config.wallet.maxWithdrawBtc) {
    throw new ValidationException('Validation failed', [
      `Amount cannot exceed ${config.wallet.maxWithdrawBtc} BTC per transaction.`
    ]);
  }
  const rounded = Math.round(value * 1e8) / 1e8;
  return rounded;
};

const requireTestnetAddress = (value: unknown): string => {
  const address = requireString(value, 'address');
  if (!TESTNET_ADDRESS_REGEX.test(address)) {
    throw new ValidationException('Validation failed', ['A valid Bitcoin testnet address is required.']);
  }
  return address;
};

export const validate = (validators: ValidatorMap) =>
  (req: Request, res: Response, next: NextFunction): Response | void => {
    try {
      if (validators.body) {
        req.body = validators.body(req.body ?? {}) as Request['body'];
      }
      if (validators.params) {
        req.params = validators.params(req.params ?? {}) as Request['params'];
      }
      if (validators.query) {
        req.query = validators.query(req.query ?? {}) as Request['query'];
      }
      return next();
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.status(400).json({ message: error.message, details: error.details });
      }
      return res.status(400).json({ message: 'Invalid request payload.' });
    }
  };

export const authSchemas = {
  signup: (payload: unknown) => {
    const body = ensureObject(payload);
    return {
      email: requireEmail(body.email),
      password: requirePassword(body.password)
    };
  },
  login: (payload: unknown) => {
    const body = ensureObject(payload);
    return {
      email: requireEmail(body.email),
      password: requirePassword(body.password)
    };
  }
};

export const walletSchemas = {
  send: (payload: unknown) => {
    const body = ensureObject(payload);
    return {
      address: requireTestnetAddress(body.address),
      amount: requireAmount(body.amount)
    };
  }
};

export default validate;

export { TESTNET_ADDRESS_REGEX };
