import { Transaction, RiskSignal } from '../../types';

const MAX_SCORE = 20;

/**
 * Transaction Amount Anomaly Signal
 *
 * Compares current transaction amount to buyer's historical spending patterns.
 * Large deviations indicate possible account takeover or testing stolen cards.
 *
 * Scoring:
 * - First purchase + high value (>$200): 15 points
 * - Amount > 3x historical average: 20 points
 * - Amount 2-3x historical average: 10 points
 * - Amount within normal range: 0 points
 */
export function calculateTransactionAnomalySignal(transaction: Transaction): RiskSignal {
  let score = 0;
  let reason = '';
  const amount = transaction.amount;

  // First purchase edge case
  if (transaction.total_orders === 0) {
    if (amount > 200) {
      score = 15;
      reason = `First purchase with high value ($${amount.toFixed(2)})`;
    } else if (amount > 100) {
      score = 8;
      reason = `First purchase with moderate value ($${amount.toFixed(2)})`;
    } else {
      score = 0;
      reason = `First purchase with normal value ($${amount.toFixed(2)})`;
    }

    return {
      name: 'transaction_anomaly',
      score,
      max_score: MAX_SCORE,
      weight: score / MAX_SCORE,
      reason,
      details: {
        current_amount: amount,
        is_first_purchase: true
      }
    };
  }

  // Calculate historical average
  const historicalAverage = transaction.lifetime_spend / transaction.total_orders;
  const ratio = amount / historicalAverage;

  if (ratio > 3) {
    score = MAX_SCORE;
    reason = `Transaction amount ($${amount.toFixed(2)}) is ${ratio.toFixed(1)}x historical average ($${historicalAverage.toFixed(2)})`;
  } else if (ratio > 2) {
    score = 10;
    reason = `Transaction amount ($${amount.toFixed(2)}) is ${ratio.toFixed(1)}x historical average ($${historicalAverage.toFixed(2)})`;
  } else if (ratio > 1.5) {
    score = 5;
    reason = `Transaction amount ($${amount.toFixed(2)}) slightly above historical average ($${historicalAverage.toFixed(2)})`;
  } else {
    score = 0;
    reason = `Transaction amount ($${amount.toFixed(2)}) within normal range (avg: $${historicalAverage.toFixed(2)})`;
  }

  return {
    name: 'transaction_anomaly',
    score,
    max_score: MAX_SCORE,
    weight: score / MAX_SCORE,
    reason,
    details: {
      current_amount: amount,
      historical_average: historicalAverage,
      ratio: ratio,
      total_orders: transaction.total_orders
    }
  };
}
