import axios from 'axios';
import ExchangeRateRepository from '../repositories/ExchangeRateRepository';
import FeeService from './FeeService';
import { Currency } from '../repositories/WalletRepository';

export type ConvertDirection = 'BTC_TO_USD' | 'USD_TO_BTC';

export interface ConversionQuoteInput {
  from: Currency;
  amount: number;
}

export interface ConversionQuoteResult {
  from: Currency;
  to: Currency;
  requestedAmount: number;
  convertedAmount: number;
  feeAmount: string;
  feeUsd: number;
  rate: {
    raw: number;
    final: number;
    fetchedAt: Date;
  };
}

const FETCH_INTERVAL_MS = 30_000;
const BASE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
const FEE_PERCENT = 0.023;

interface RateCache {
  rawUsdPerBtc: number;
  finalUsdPerBtc: number;
  fetchedAt: Date;
}

export class ConversionService {
  private timer: NodeJS.Timeout | null = null;

  private cache: RateCache | null = null;

  public start(): void {
    if (this.timer) {
      return;
    }

    void this.safeFetch();

    this.timer = setInterval(() => {
      void this.safeFetch();
    }, FETCH_INTERVAL_MS);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async fetchAndCache(): Promise<void> {
    const { data } = await axios.get<{ bitcoin?: { usd?: number } }>(BASE_URL, { timeout: 10_000 });
    const rawUsdPerBtc = data.bitcoin?.usd;

    if (!rawUsdPerBtc || Number.isNaN(rawUsdPerBtc) || rawUsdPerBtc <= 0) {
      throw new Error('Unable to resolve BTC/USD price from provider.');
    }

    const finalUsdPerBtc = rawUsdPerBtc * (1 - FEE_PERCENT);
    const fetchedAt = new Date();

    await ExchangeRateRepository.insertRate({
      baseCurrency: 'BTC',
      quoteCurrency: 'USD',
      rawRate: rawUsdPerBtc.toFixed(8),
      feeRate: FEE_PERCENT.toFixed(4),
      finalRate: finalUsdPerBtc.toFixed(8)
    });

    this.cache = {
      rawUsdPerBtc,
      finalUsdPerBtc,
      fetchedAt
    };
  }

  private async safeFetch(): Promise<void> {
    try {
      await this.fetchAndCache();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('ConversionService: failed to refresh rate', error);
    }
  }

  public getLatestRate(): RateCache {
    if (!this.cache) {
      throw new Error('Exchange rate cache not initialised yet.');
    }

    return this.cache;
  }

  public async getQuote(input: ConversionQuoteInput): Promise<ConversionQuoteResult> {
    if (!this.cache) {
      const latest = await ExchangeRateRepository.getLatest('BTC', 'USD');
      if (latest) {
        this.cache = {
          rawUsdPerBtc: Number(latest.rawRate),
          finalUsdPerBtc: Number(latest.finalRate),
          fetchedAt: latest.fetchedAt
        };
      }
    }

    const { rawUsdPerBtc, finalUsdPerBtc, fetchedAt } = this.getLatestRate();

    if (input.amount <= 0) {
      throw new Error('Amount must be positive.');
    }

    if (input.from === 'BTC') {
      const grossUsd = input.amount * rawUsdPerBtc;
      const fee = FeeService.calculateFee({
        amount: input.amount,
        currency: 'BTC',
        usdPerBtc: rawUsdPerBtc,
        type: 'conversion'
      });

      const netUsd = grossUsd - fee.feeAmountUsd;

      return {
        from: 'BTC',
        to: 'USD',
        requestedAmount: input.amount,
        convertedAmount: Number(netUsd.toFixed(2)),
        feeAmount: fee.feeAmountCurrency,
        feeUsd: fee.feeAmountUsd,
        rate: {
          raw: rawUsdPerBtc,
          final: finalUsdPerBtc,
          fetchedAt
        }
      };
    }

    const fee = FeeService.calculateFee({
      amount: input.amount,
      currency: 'USD',
      usdPerBtc: rawUsdPerBtc,
      type: 'conversion'
    });

    const netUsd = input.amount - fee.feeAmountUsd;
    const netBtc = netUsd / rawUsdPerBtc;

    return {
      from: 'USD',
      to: 'BTC',
      requestedAmount: input.amount,
      convertedAmount: Number(netBtc.toFixed(8)),
      feeAmount: fee.feeAmountCurrency,
      feeUsd: fee.feeAmountUsd,
      rate: {
        raw: rawUsdPerBtc,
        final: finalUsdPerBtc,
        fetchedAt
      }
    };
  }
}

const conversionService = new ConversionService();

export default conversionService;
