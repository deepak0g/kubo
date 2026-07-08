import { Transaction, RiskSignal } from '../../types';

const MAX_SCORE = 10;

// Common manual review threshold
const MANUAL_REVIEW_THRESHOLD = 150;
const THRESHOLD_MARGIN = 10; // Within $10 of threshold

/**
 * Purchase Pattern Signal
 *
 * Detects suspicious purchasing behaviors like staying just under
 * manual review thresholds.
 *
 * Scoring:
 * - Amount just under review threshold: 8 points
 * - Round number amount (possible testing): 3 points
 * - Normal purchase pattern: 0 points
 */
export function calculatePurchasePatternSignal(transaction: Transaction): RiskSignal {
  const amount = transaction.amount;
  let score = 0;
  const reasons: string[] = [];

  // Check if just under manual review threshold
  if (
    amount < MANUAL_REVIEW_THRESHOLD &&
    amount >= MANUAL_REVIEW_THRESHOLD - THRESHOLD_MARGIN
  ) {
    score += 8;
    reasons.push(
      `Transaction amount ($${amount.toFixed(2)}) just under review threshold ($${MANUAL_REVIEW_THRESHOLD})`
    );
  }

  // Check for suspiciously round numbers (card testing)
  const isRoundNumber = amount % 10 === 0 || amount % 5 === 0;
  if (isRoundNumber && amount <= 50) {
    score += 3;
    reasons.push(`Round number amount ($${amount.toFixed(2)}) suggests possible card testing`);
  }

  // Check for multiple small transactions pattern (should be detected by velocity)
  // This signal focuses on the individual transaction characteristics

  const reason = reasons.length > 0
    ? reasons.join('; ')
    : `Normal purchase pattern ($${amount.toFixed(2)})`;

  return {
    name: 'purchase_pattern',
    score,
    max_score: MAX_SCORE,
    weight: score / MAX_SCORE,
    reason,
    details: {
      amount: amount,
      is_under_threshold: amount < MANUAL_REVIEW_THRESHOLD,
      distance_from_threshold: MANUAL_REVIEW_THRESHOLD - amount,
      is_round_number: isRoundNumber
    }
  };
}
