import { QueryResult } from 'pg';
import { query } from '../db';

export interface ExchangeRateRow {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rawRate: string;
  feeRate: string;
  finalRate: string;
  fetchedAt: Date;
}

const mapExchangeRateRow = (row: ExchangeRateRow): ExchangeRateRow => ({
  ...row,
  fetchedAt: new Date(row.fetchedAt)
});

export class ExchangeRateRepository {
  public static async insertRate(params: {
    baseCurrency: string;
    quoteCurrency: string;
    rawRate: string;
    feeRate: string;
    finalRate: string;
  }): Promise<ExchangeRateRow> {
    const sql = `
      INSERT INTO exchange_rates (base_currency, quote_currency, raw_rate, fee_rate, final_rate)
      VALUES ($1, $2, $3::numeric, $4::numeric, $5::numeric)
      RETURNING
        id,
        base_currency AS "baseCurrency",
        quote_currency AS "quoteCurrency",
        raw_rate::text AS "rawRate",
        fee_rate::text AS "feeRate",
        final_rate::text AS "finalRate",
        fetched_at AS "fetchedAt";
    `;

    const result: QueryResult<ExchangeRateRow> = await query<ExchangeRateRow>(sql, [
      params.baseCurrency,
      params.quoteCurrency,
      params.rawRate,
      params.feeRate,
      params.finalRate
    ]);

    return mapExchangeRateRow(result.rows[0]);
  }

  public static async getLatest(baseCurrency: string, quoteCurrency: string): Promise<ExchangeRateRow | null> {
    const sql = `
      SELECT
        id,
        base_currency AS "baseCurrency",
        quote_currency AS "quoteCurrency",
        raw_rate::text AS "rawRate",
        fee_rate::text AS "feeRate",
        final_rate::text AS "finalRate",
        fetched_at AS "fetchedAt"
      FROM exchange_rates
      WHERE base_currency = $1 AND quote_currency = $2
      ORDER BY fetched_at DESC
      LIMIT 1;
    `;

    const result: QueryResult<ExchangeRateRow> = await query<ExchangeRateRow>(sql, [
      baseCurrency,
      quoteCurrency
    ]);

    const row = result.rows[0];
    return row ? mapExchangeRateRow(row) : null;
  }
}

export default ExchangeRateRepository;
