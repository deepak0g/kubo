import { Transaction, RiskAssessment, RiskLevel, RecommendedAction, RiskSignal } from '../types';
import { calculateAccountAgeSignal } from './signals/accountAge';
import { calculateTransactionAnomalySignal } from './signals/transactionAnomaly';
import { calculateDeviceReputationSignal } from './signals/deviceReputation';
import { calculateVelocitySignal } from './signals/velocity';
import { calculateGeographicAnomalySignal } from './signals/geographicAnomaly';
import { calculateEmailRiskSignal } from './signals/emailRisk';
import { calculateShippingRiskSignal } from './signals/shippingRisk';
import { calculatePurchasePatternSignal } from './signals/purchasePattern';
import { checkWatchlist } from '../database';

const MODEL_VERSION = '1.0.0';

/**
 * Risk Scoring Engine
 *
 * Aggregates multiple risk signals to compute an overall risk score
 * and provide actionable recommendations.
 */

/**
 * Main scoring function
 */
export async function calculateRiskScore(transaction: Transaction): Promise<RiskAssessment> {
  const startTime = Date.now();

  // Calculate all risk signals (some are async now)
  const signals: RiskSignal[] = [];
  let totalScore = 0;

  // Sync signals
  signals.push(calculateAccountAgeSignal(transaction));
  signals.push(calculateTransactionAnomalySignal(transaction));
  signals.push(calculateGeographicAnomalySignal(transaction));
  signals.push(calculateEmailRiskSignal(transaction));
  signals.push(calculatePurchasePatternSignal(transaction));

  // Async signals
  const velocitySignal = await calculateVelocitySignal(transaction);
  signals.push(velocitySignal);

  const shippingSignal = await calculateShippingRiskSignal(transaction);
  signals.push(shippingSignal);

  const deviceSignal = await calculateDeviceReputationSignal(transaction);
  signals.push(deviceSignal);

  // Calculate total score
  for (const signal of signals) {
    totalScore += signal.score;
  }

  // Check watchlist (stretch goal feature) - also async now
  const watchlistSignal = await checkWatchlistSignal(transaction);
  if (watchlistSignal) {
    signals.push(watchlistSignal);
    totalScore += watchlistSignal.score;
  }

  // Normalize score to 0-100 range
  const overallScore = Math.min(Math.round(totalScore), 100);

  // Classify risk level
  const riskLevel = classifyRiskLevel(overallScore);

  // Determine recommended action
  const recommendedAction = getRecommendedAction(riskLevel);

  const processingTime = Date.now() - startTime;

  return {
    transaction_id: transaction.transaction_id,
    overall_score: overallScore,
    risk_level: riskLevel,
    recommended_action: recommendedAction,
    contributing_signals: signals.sort((a, b) => b.score - a.score), // Sort by score descending
    metadata: {
      timestamp: new Date().toISOString(),
      model_version: MODEL_VERSION,
      processing_time_ms: processingTime
    }
  };
}

/**
 * Classify risk level based on score thresholds
 */
function classifyRiskLevel(score: number): RiskLevel {
  const lowThreshold = parseInt(process.env.RISK_THRESHOLD_LOW || '30');
  const mediumThreshold = parseInt(process.env.RISK_THRESHOLD_MEDIUM || '70');

  if (score <= lowThreshold) {
    return 'LOW';
  } else if (score <= mediumThreshold) {
    return 'MEDIUM';
  } else {
    return 'HIGH';
  }
}

/**
 * Determine recommended action based on risk level
 */
function getRecommendedAction(riskLevel: RiskLevel): RecommendedAction {
  switch (riskLevel) {
    case 'LOW':
      return 'APPROVE';
    case 'MEDIUM':
      return 'REVIEW';
    case 'HIGH':
      return 'DECLINE';
  }
}

/**
 * Check if transaction entities are on watchlist
 */
async function checkWatchlistSignal(transaction: Transaction): Promise<RiskSignal | null> {
  const enableWatchlist = process.env.ENABLE_WATCHLIST === 'true';
  if (!enableWatchlist) return null;

  // Check email
  const emailEntry = await checkWatchlist('email', transaction.email);
  if (emailEntry) {
    if (emailEntry.list_type === 'blocklist') {
      return {
        name: 'watchlist',
        score: 50,
        max_score: 50,
        weight: 1,
        reason: `Email on blocklist: ${emailEntry.reason}`,
        details: { watchlist_entry: emailEntry }
      };
    } else if (emailEntry.list_type === 'allowlist') {
      return {
        name: 'watchlist',
        score: -20, // Negative score reduces overall risk
        max_score: 0,
        weight: 0,
        reason: `Email on allowlist: ${emailEntry.reason}`,
        details: { watchlist_entry: emailEntry }
      };
    }
  }

  // Check device fingerprint
  const deviceEntry = await checkWatchlist('device_fingerprint', transaction.device_fingerprint);
  if (deviceEntry) {
    if (deviceEntry.list_type === 'blocklist') {
      return {
        name: 'watchlist',
        score: 50,
        max_score: 50,
        weight: 1,
        reason: `Device on blocklist: ${deviceEntry.reason}`,
        details: { watchlist_entry: deviceEntry }
      };
    } else if (deviceEntry.list_type === 'allowlist') {
      return {
        name: 'watchlist',
        score: -20,
        max_score: 0,
        weight: 0,
        reason: `Device on allowlist: ${deviceEntry.reason}`,
        details: { watchlist_entry: deviceEntry }
      };
    }
  }

  // Check IP address
  const ipEntry = await checkWatchlist('ip_address', transaction.ip_address);
  if (ipEntry) {
    if (ipEntry.list_type === 'blocklist') {
      return {
        name: 'watchlist',
        score: 40,
        max_score: 50,
        weight: 0.8,
        reason: `IP address on blocklist: ${ipEntry.reason}`,
        details: { watchlist_entry: ipEntry }
      };
    }
  }

  return null;
}

/**
 * Batch scoring function
 */
export async function calculateBatchRiskScores(transactions: Transaction[]): Promise<RiskAssessment[]> {
  return Promise.all(transactions.map(transaction => calculateRiskScore(transaction)));
}
