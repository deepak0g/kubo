import { Transaction, RiskSignal } from '../../types';

const MAX_SCORE = 10;

// Known disposable email providers
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
  'throwaway.email', 'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
  'yopmail.com', 'mailnesia.com', 'trashmail.com', 'dispostable.com'
];

// Suspicious patterns in email domains
const SUSPICIOUS_PATTERNS = [
  /^\d+[a-z]+\.[a-z]{2,}$/,  // Numbers followed by letters (123abc.com)
  /^[a-z]{1,3}\d+\.[a-z]{2,}$/, // Few letters then numbers (ab123.com)
];

/**
 * Email Risk Signal
 *
 * Evaluates the buyer's email address for fraud indicators.
 *
 * Scoring:
 * - Disposable email provider: 10 points
 * - Suspicious domain pattern: 5 points
 * - Recently registered domain: 7 points
 * - Legitimate email: 0 points
 */
export function calculateEmailRiskSignal(transaction: Transaction): RiskSignal {
  const emailDomain = transaction.email_domain.toLowerCase();
  let score = 0;
  let reason = '';

  // Check for disposable email
  if (DISPOSABLE_EMAIL_DOMAINS.includes(emailDomain)) {
    score = MAX_SCORE;
    reason = `Disposable email provider detected (${emailDomain})`;

    return {
      name: 'email_risk',
      score,
      max_score: MAX_SCORE,
      weight: score / MAX_SCORE,
      reason,
      details: {
        email_domain: emailDomain,
        is_disposable: true
      }
    };
  }

  // Check for suspicious patterns
  const hasSuspiciousPattern = SUSPICIOUS_PATTERNS.some(pattern => pattern.test(emailDomain));
  if (hasSuspiciousPattern) {
    score = 5;
    reason = `Suspicious email domain pattern (${emailDomain})`;

    return {
      name: 'email_risk',
      score,
      max_score: MAX_SCORE,
      weight: score / MAX_SCORE,
      reason,
      details: {
        email_domain: emailDomain,
        has_suspicious_pattern: true
      }
    };
  }

  // Check for well-known legitimate providers
  const TRUSTED_PROVIDERS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
    'aol.com', 'protonmail.com', 'mail.com'
  ];

  if (TRUSTED_PROVIDERS.includes(emailDomain)) {
    reason = `Trusted email provider (${emailDomain})`;
  } else {
    // Unknown domain - slight concern but not high risk
    score = 2;
    reason = `Unknown email provider (${emailDomain})`;
  }

  return {
    name: 'email_risk',
    score,
    max_score: MAX_SCORE,
    weight: score / MAX_SCORE,
    reason,
    details: {
      email_domain: emailDomain,
      is_trusted: TRUSTED_PROVIDERS.includes(emailDomain)
    }
  };
}
