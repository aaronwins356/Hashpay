import axios from 'axios';
import config from '../../config';

export interface ExchangeRateQuote {
  currency: string;
  rate: number;
  fetchedAt: Date;
}

class ExchangeRateService {
  private cache: ExchangeRateQuote | null = null;

  private inflightRequest: Promise<ExchangeRateQuote> | null = null;

  public async getLatestQuote(): Promise<ExchangeRateQuote> {
    const now = Date.now();

    if (this.cache && now - this.cache.fetchedAt.getTime() < config.fiat.cacheTtlMs) {
      return this.cache;
    }

    if (this.inflightRequest) {
      return this.inflightRequest;
    }

    this.inflightRequest = this.fetchQuote();

    try {
      const quote = await this.inflightRequest;
      this.cache = quote;
      return quote;
    } finally {
      this.inflightRequest = null;
    }
  }

  public clearCache(): void {
    this.cache = null;
  }

  private async fetchQuote(): Promise<ExchangeRateQuote> {
    const { exchangeRateApiUrl, currency } = config.fiat;

    try {
      const response = await axios.get<{ data?: { rates?: Record<string, string> } }>(exchangeRateApiUrl, {
        timeout: 10_000
      });

      const rates = response.data?.data?.rates ?? {};
      const rateForCurrency = rates[currency];

      if (!rateForCurrency) {
        throw new Error(`Exchange rate for ${currency} not found in API response.`);
      }

      const rate = Number.parseFloat(rateForCurrency);

      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error(`Exchange rate for ${currency} is invalid.`);
      }

      return {
        currency,
        rate,
        fetchedAt: new Date()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown exchange rate failure.';
      throw new Error(`Failed to fetch exchange rate: ${message}`);
    }
  }
}

const exchangeRateService = new ExchangeRateService();

export default exchangeRateService;
