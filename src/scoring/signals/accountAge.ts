import { Transaction, RiskSignal } from '../../types';
import { differenceInHours, differenceInDays, parseISO } from 'date-fns';

const MAX_SCORE = 15;

/**
 * Account Age Signal
 *
 * New accounts are high risk as fraudsters often create fresh accounts
 * to bypass reputation systems.
 *
 * Scoring:
 * - Account < 24 hours old: 15 points
 * - Account < 7 days old: 10 points
 * - Account < 30 days old: 5 points
 * - Older accounts: 0 points
 */
export function calculateAccountAgeSignal(transaction: Transaction): RiskSignal {
  const accountCreated = parseISO(transaction.account_created_at);
  const transactionTime = parseISO(transaction.timestamp);

  const hoursOld = differenceInHours(transactionTime, accountCreated);
  const daysOld = differenceInDays(transactionTime, accountCreated);

  let score = 0;
  let reason = '';

  if (hoursOld < 24) {
    score = MAX_SCORE;
    reason = `Account created less than 24 hours ago (${hoursOld} hours old)`;
  } else if (daysOld < 7) {
    score = 10;
    reason = `Account created ${daysOld} days ago (less than a week old)`;
  } else if (daysOld < 30) {
    score = 5;
    reason = `Account created ${daysOld} days ago (less than a month old)`;
  } else {
    score = 0;
    reason = `Established account (${daysOld} days old)`;
  }

  return {
    name: 'account_age',
    score,
    max_score: MAX_SCORE,
    weight: score / MAX_SCORE,
    reason,
    details: {
      account_age_hours: hoursOld,
      account_age_days: daysOld
    }
  };
}
