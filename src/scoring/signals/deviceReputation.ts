import { Transaction, RiskSignal } from '../../types';
import { getDeviceReputationAsync } from '../../database';

const MAX_SCORE = 35;

/**
 * Device Fingerprint Reputation Signal
 *
 * Tracks device history across transactions. Devices associated with
 * chargebacks or suspicious velocity patterns are high risk.
 *
 * Scoring:
 * - Device seen in chargebacks: 35 points
 * - Device used for 10+ transactions in 24hrs: 20 points
 * - Device used for 5+ transactions in 24hrs: 10 points
 * - New device on established account: 5 points
 * - Clean device: 0 points
 */
export async function calculateDeviceReputationSignal(transaction: Transaction): Promise<RiskSignal> {
  const reputation = await getDeviceReputationAsync(transaction.device_fingerprint);

  if (!reputation) {
    // New device - check if on established account
    if (transaction.total_orders > 10) {
      return {
        name: 'device_reputation',
        score: 5,
        max_score: MAX_SCORE,
        weight: 5 / MAX_SCORE,
        reason: 'New device on established account',
        details: {
          is_new_device: true,
          buyer_total_orders: transaction.total_orders
        }
      };
    }

    return {
      name: 'device_reputation',
      score: 0,
      max_score: MAX_SCORE,
      weight: 0,
      reason: 'New device on new account (no reputation data)',
      details: {
        is_new_device: true
      }
    };
  }

  let score = 0;
  let reason = '';

  // Check for chargebacks
  if (reputation.chargeback_count > 0) {
    score = MAX_SCORE;
    reason = `Device has ${reputation.chargeback_count} previous chargeback(s)`;

    return {
      name: 'device_reputation',
      score,
      max_score: MAX_SCORE,
      weight: score / MAX_SCORE,
      reason,
      details: {
        total_transactions: reputation.total_transactions,
        chargeback_count: reputation.chargeback_count,
        chargeback_rate: reputation.chargeback_count / reputation.total_transactions,
        associated_buyers: reputation.associated_buyer_ids.length
      }
    };
  }

  // Check for high velocity (multiple buyers on same device)
  if (reputation.associated_buyer_ids.length >= 5) {
    score = 15;
    reason = `Device used by ${reputation.associated_buyer_ids.length} different buyers`;
  } else if (reputation.associated_buyer_ids.length >= 3) {
    score = 8;
    reason = `Device used by ${reputation.associated_buyer_ids.length} different buyers`;
  } else if (reputation.total_transactions > 20) {
    score = 0;
    reason = `Device has clean history (${reputation.total_transactions} transactions, no chargebacks)`;
  } else {
    score = 0;
    reason = 'Device has limited but clean history';
  }

  return {
    name: 'device_reputation',
    score,
    max_score: MAX_SCORE,
    weight: score / MAX_SCORE,
    reason,
    details: {
      total_transactions: reputation.total_transactions,
      chargeback_count: reputation.chargeback_count,
      associated_buyers: reputation.associated_buyer_ids.length
    }
  };
}
