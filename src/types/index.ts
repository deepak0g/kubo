// Core data models for the risk scoring system

export interface Transaction {
  transaction_id: string;
  timestamp: string;

  // Transaction details
  amount: number;
  currency: string;
  status: 'approved' | 'declined' | 'chargeback' | 'pending';

  // Buyer information
  buyer_id: string;
  account_created_at: string;
  email: string;
  email_domain: string;
  total_orders: number;
  lifetime_spend: number;

  // Device/Session
  device_fingerprint: string;
  ip_address: string;
  ip_country: string;
  user_agent: string;

  // Payment information
  card_last4: string;
  card_bin: string;
  card_issuing_country: string;

  // Shipping information
  shipping_address: string;
  shipping_city: string;
  shipping_country: string;
  is_new_address: boolean;

  // Billing information
  billing_country: string;
}

export interface RiskSignal {
  name: string;
  score: number;
  max_score: number;
  weight: number;
  reason: string;
  details?: Record<string, any>;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RecommendedAction = 'APPROVE' | 'REVIEW' | 'DECLINE';

export interface RiskAssessment {
  transaction_id: string;
  overall_score: number;
  risk_level: RiskLevel;
  recommended_action: RecommendedAction;
  contributing_signals: RiskSignal[];
  metadata: {
    timestamp: string;
    model_version: string;
    processing_time_ms: number;
  };
}

export interface BatchAnalysisResult {
  batch_id: string;
  total_transactions: number;
  analysis_timestamp: string;
  score_distribution: {
    low: number;
    medium: number;
    high: number;
  };
  fraud_detection_metrics: {
    total_chargebacks: number;
    chargebacks_flagged_high: number;
    chargebacks_flagged_medium_or_high: number;
    precision_at_high: number;
    recall_at_high: number;
  };
  top_signals_in_fraud: Array<{
    signal_name: string;
    frequency_in_fraud: number;
    avg_contribution: number;
  }>;
  recommended_threshold: {
    score: number;
    reasoning: string;
  };
  transactions_with_scores: Array<Transaction & { risk_assessment: RiskAssessment }>;
}

export interface DeviceReputation {
  device_fingerprint: string;
  total_transactions: number;
  chargeback_count: number;
  first_seen: string;
  last_seen: string;
  associated_buyer_ids: string[];
}

export interface VelocityWindow {
  buyer_id?: string;
  device_fingerprint?: string;
  card_last4?: string;
  time_window_hours: number;
  transaction_count: number;
  total_amount: number;
}

export interface WatchlistEntry {
  id: string;
  entity_type: 'email' | 'device_fingerprint' | 'shipping_address' | 'ip_address';
  entity_value: string;
  list_type: 'blocklist' | 'allowlist';
  reason: string;
  added_at: string;
  added_by: string;
}

export interface RiskConfig {
  thresholds: {
    low: number;
    medium: number;
  };
  signal_weights: {
    account_age: number;
    transaction_anomaly: number;
    device_reputation: number;
    velocity: number;
    geographic_anomaly: number;
    email_risk: number;
    shipping_risk: number;
    purchase_pattern: number;
  };
  enabled_signals: string[];
}
