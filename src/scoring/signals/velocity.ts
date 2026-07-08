import { Transaction, RiskSignal } from '../../types';
import { getRecentTransactionsByBuyer, getRecentTransactionsByDevice } from '../../database';
import { parseISO, subHours } from 'date-fns';

const MAX_SCORE = 25;

/**
 * Velocity Signal
 *
 * Detects rapid-fire transaction patterns common in fraud.
 * Checks both buyer-level and device-level velocity.
 *
 * Scoring:
 * - 10+ transactions in 2 hours: 25 points
 * - 6-10 transactions in 2 hours: 20 points
 * - 3-5 transactions in 2 hours: 10 points
 * - Normal velocity: 0 points
 */
export async function calculateVelocitySignal(transaction: Transaction): Promise<RiskSignal> {
  const transactionTime = parseISO(transaction.timestamp);
  const twoHoursAgo = subHours(transactionTime, 2).toISOString();

  // Check buyer velocity
  const buyerRecentTxns = await getRecentTransactionsByBuyer(transaction.buyer_id, 2);
  const buyerVelocity = buyerRecentTxns.filter(t =>
    t.timestamp <= transaction.timestamp && t.timestamp >= twoHoursAgo
  ).length;

  // Check device velocity
  const deviceRecentTxns = await getRecentTransactionsByDevice(transaction.device_fingerprint, 2);
  const deviceVelocity = deviceRecentTxns.filter(t =>
    t.timestamp <= transaction.timestamp && t.timestamp >= twoHoursAgo
  ).length;

  const maxVelocity = Math.max(buyerVelocity, deviceVelocity);

  let score = 0;
  let reason = '';

  if (maxVelocity >= 10) {
    score = MAX_SCORE;
    reason = `High velocity detected: ${maxVelocity} transactions in 2 hours`;
  } else if (maxVelocity >= 6) {
    score = 20;
    reason = `Elevated velocity: ${maxVelocity} transactions in 2 hours`;
  } else if (maxVelocity >= 3) {
    score = 10;
    reason = `Moderate velocity: ${maxVelocity} transactions in 2 hours`;
  } else {
    score = 0;
    reason = `Normal velocity: ${maxVelocity} transaction(s) in 2 hours`;
  }

  return {
    name: 'velocity',
    score,
    max_score: MAX_SCORE,
    weight: score / MAX_SCORE,
    reason,
    details: {
      buyer_velocity_2h: buyerVelocity,
      device_velocity_2h: deviceVelocity,
      max_velocity: maxVelocity
    }
  };
}
