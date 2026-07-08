import { Transaction, RiskSignal } from '../../types';
import { getAllTransactions } from '../../database';

const MAX_SCORE = 15;

// Known freight forwarder/reshipping service patterns
const FREIGHT_FORWARDER_KEYWORDS = [
  'freight', 'forwarding', 'reship', 'package', 'parcel service',
  'mailbox', 'po box', 'suite', 'remail'
];

/**
 * Shipping Risk Signal
 *
 * Analyzes shipping address for fraud indicators.
 *
 * Scoring:
 * - Multiple buyers shipping to same address: 15 points
 * - New address on account: 5 points
 * - Freight forwarder detected: 12 points
 * - Normal shipping address: 0 points
 */
export async function calculateShippingRiskSignal(transaction: Transaction): Promise<RiskSignal> {
  let score = 0;
  const reasons: string[] = [];

  // Check if new shipping address
  if (transaction.is_new_address) {
    score += 5;
    reasons.push('New shipping address on account');
  }

  // Check for freight forwarder patterns
  const shippingLower = transaction.shipping_address.toLowerCase();
  const hasFreightForwarderKeyword = FREIGHT_FORWARDER_KEYWORDS.some(keyword =>
    shippingLower.includes(keyword)
  );

  if (hasFreightForwarderKeyword) {
    score += 12;
    reasons.push('Potential freight forwarder or reshipping service detected');
  }

  // Check if multiple buyers are using this address
  const allTransactions = await getAllTransactions();
  const sameAddressTransactions = allTransactions.filter(t =>
    t.shipping_address === transaction.shipping_address &&
    t.shipping_city === transaction.shipping_city &&
    t.shipping_country === transaction.shipping_country
  );

  const uniqueBuyers = new Set(sameAddressTransactions.map(t => t.buyer_id));

  if (uniqueBuyers.size >= 5) {
    score += 15;
    reasons.push(`Address used by ${uniqueBuyers.size} different buyers`);
  } else if (uniqueBuyers.size >= 3) {
    score += 10;
    reasons.push(`Address used by ${uniqueBuyers.size} different buyers`);
  }

  // Cap at max score
  score = Math.min(score, MAX_SCORE);

  const reason = reasons.length > 0
    ? reasons.join('; ')
    : 'Normal shipping address';

  return {
    name: 'shipping_risk',
    score,
    max_score: MAX_SCORE,
    weight: score / MAX_SCORE,
    reason,
    details: {
      is_new_address: transaction.is_new_address,
      shipping_address: transaction.shipping_address,
      unique_buyers_at_address: uniqueBuyers.size,
      has_freight_forwarder_pattern: hasFreightForwarderKeyword
    }
  };
}
