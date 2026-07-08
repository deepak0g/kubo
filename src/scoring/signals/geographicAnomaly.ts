import { Transaction, RiskSignal } from '../../types';

const MAX_SCORE = 15;

// High-risk countries based on common fraud patterns
const HIGH_RISK_COUNTRIES = [
  'NG', 'GH', 'PK', 'BD', 'VN', 'ID', 'RO', 'UA', 'RU'
];

/**
 * Geographic Anomaly Signal
 *
 * Detects mismatches between IP location, card issuing country,
 * and shipping/billing addresses.
 *
 * Scoring:
 * - IP country ≠ card issuing country: 15 points
 * - IP country ≠ shipping country: 10 points
 * - IP from high-risk country: 8 points
 * - All locations match: 0 points
 */
export function calculateGeographicAnomalySignal(transaction: Transaction): RiskSignal {
  let score = 0;
  const reasons: string[] = [];

  // Check IP vs card issuing country
  if (transaction.ip_country !== transaction.card_issuing_country) {
    score += 15;
    reasons.push(
      `IP country (${transaction.ip_country}) differs from card issuing country (${transaction.card_issuing_country})`
    );
  }

  // Check IP vs shipping country
  if (transaction.ip_country !== transaction.shipping_country) {
    const mismatchScore = transaction.ip_country === transaction.card_issuing_country ? 5 : 10;
    score += mismatchScore;
    reasons.push(
      `IP country (${transaction.ip_country}) differs from shipping country (${transaction.shipping_country})`
    );
  }

  // Check for high-risk country
  if (HIGH_RISK_COUNTRIES.includes(transaction.ip_country)) {
    if (!reasons.length) {
      score += 8;
    }
    reasons.push(`Transaction originates from high-risk country (${transaction.ip_country})`);
  }

  // Check billing vs shipping mismatch
  if (transaction.billing_country !== transaction.shipping_country) {
    score += 3;
    reasons.push(
      `Billing country (${transaction.billing_country}) differs from shipping country (${transaction.shipping_country})`
    );
  }

  // Cap at max score
  score = Math.min(score, MAX_SCORE);

  const reason = reasons.length > 0
    ? reasons.join('; ')
    : `All geographic indicators align (${transaction.ip_country})`;

  return {
    name: 'geographic_anomaly',
    score,
    max_score: MAX_SCORE,
    weight: score / MAX_SCORE,
    reason,
    details: {
      ip_country: transaction.ip_country,
      card_issuing_country: transaction.card_issuing_country,
      shipping_country: transaction.shipping_country,
      billing_country: transaction.billing_country,
      is_high_risk_country: HIGH_RISK_COUNTRIES.includes(transaction.ip_country)
    }
  };
}
