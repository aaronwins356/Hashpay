import { Currency } from '../repositories/WalletRepository';

const MIN_FEE_USD = 1.45;
const DEPOSIT_CONVERSION_FEE_PERCENT = 0.023;
const TRANSFER_FEE_PERCENT = 0.02;
const BTC_SCALE = 8;
const USD_SCALE = 2;

const scaleFactor = (scale: number): number => 10 ** scale;

const roundUp = (value: number, scale: number): number => {
  const factor = scaleFactor(scale);
  return Math.ceil(value * factor - Number.EPSILON) / factor;
};

const toFixedString = (value: number, scale: number): string => value.toFixed(scale);

export type FeeType = 'deposit' | 'conversion' | 'transfer';

export interface FeeCalculationInput {
  amount: number;
  currency: Currency;
  usdPerBtc: number;
  type: FeeType;
}

export interface FeeCalculationResult {
  feeAmountCurrency: string;
  feeAmountUsd: number;
}

export class FeeService {
  public static calculateFee({ amount, currency, usdPerBtc, type }: FeeCalculationInput): FeeCalculationResult {
    if (usdPerBtc <= 0) {
      throw new Error('USD/BTC rate must be positive to compute fees.');
    }

    const basePercent = type === 'transfer' ? TRANSFER_FEE_PERCENT : DEPOSIT_CONVERSION_FEE_PERCENT;
    const amountUsd = currency === 'USD' ? amount : amount * usdPerBtc;

    const rawFeeUsd = amountUsd * basePercent;
    const feeUsd = roundUp(Math.max(rawFeeUsd, MIN_FEE_USD), USD_SCALE);

    if (currency === 'USD') {
      return {
        feeAmountCurrency: toFixedString(feeUsd, USD_SCALE),
        feeAmountUsd: feeUsd
      };
    }

    const feeBtc = roundUp(feeUsd / usdPerBtc, BTC_SCALE);

    return {
      feeAmountCurrency: toFixedString(feeBtc, BTC_SCALE),
      feeAmountUsd: feeUsd
    };
  }
}

export default FeeService;
