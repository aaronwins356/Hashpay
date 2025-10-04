import { describe, it, expect } from '../../utils/harness';
import FeeService from '../../../src/services/FeeService';

describe('FeeService', () => {
  it('applies minimum fee for small USD transfers', () => {
    const result = FeeService.calculateFee({
      amount: 10,
      currency: 'USD',
      usdPerBtc: 30_000,
      type: 'transfer'
    });

    expect(result.feeAmountCurrency).toBe('1.45');
    expect(result.feeAmountUsd).toBe(1.45);
  });

  it('computes percentage fee for BTC transfers above the minimum', () => {
    const result = FeeService.calculateFee({
      amount: 0.5,
      currency: 'BTC',
      usdPerBtc: 40_000,
      type: 'transfer'
    });

    expect(result.feeAmountCurrency).toBe('0.01000000');
    expect(result.feeAmountUsd).toBeCloseTo(400, 2);
  });

  it('applies conversion fee with USD minimum when converting BTC', () => {
    const result = FeeService.calculateFee({
      amount: 0.01,
      currency: 'BTC',
      usdPerBtc: 30_000,
      type: 'conversion'
    });

    expect(result.feeAmountCurrency).toBe('0.00023000');
    expect(result.feeAmountUsd).toBeCloseTo(6.9, 2);
  });
});
