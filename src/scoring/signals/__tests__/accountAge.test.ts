import { calculateAccountAgeSignal } from '../accountAge';
import { Transaction } from '../../../types';
import { subHours, subDays } from 'date-fns';

describe('Account Age Signal', () => {
  const baseTransaction: Transaction = {
    transaction_id: 'test_txn_001',
    timestamp: new Date().toISOString(),
    amount: 100,
    currency: 'USD',
    status: 'pending',
    buyer_id: 'buyer_test',
    account_created_at: new Date().toISOString(),
    email: 'test@example.com',
    email_domain: 'example.com',
    total_orders: 5,
    lifetime_spend: 500,
    device_fingerprint: 'device_test',
    ip_address: '192.168.1.1',
    ip_country: 'US',
    user_agent: 'Mozilla/5.0',
    card_last4: '4242',
    card_bin: '424242',
    card_issuing_country: 'US',
    shipping_address: '123 Test St',
    shipping_city: 'TestCity',
    shipping_country: 'US',
    is_new_address: false,
    billing_country: 'US'
  };

  test('should give maximum score for account < 24 hours old', () => {
    const now = new Date();
    const transaction = {
      ...baseTransaction,
      timestamp: now.toISOString(),
      account_created_at: subHours(now, 12).toISOString()
    };

    const signal = calculateAccountAgeSignal(transaction);

    expect(signal.score).toBe(15);
    expect(signal.name).toBe('account_age');
    expect(signal.reason).toContain('less than 24 hours ago');
  });

  test('should give 10 points for account < 7 days old', () => {
    const now = new Date();
    const transaction = {
      ...baseTransaction,
      timestamp: now.toISOString(),
      account_created_at: subDays(now, 5).toISOString()
    };

    const signal = calculateAccountAgeSignal(transaction);

    expect(signal.score).toBe(10);
    expect(signal.reason).toContain('5 days ago');
  });

  test('should give 5 points for account < 30 days old', () => {
    const now = new Date();
    const transaction = {
      ...baseTransaction,
      timestamp: now.toISOString(),
      account_created_at: subDays(now, 20).toISOString()
    };

    const signal = calculateAccountAgeSignal(transaction);

    expect(signal.score).toBe(5);
    expect(signal.reason).toContain('20 days ago');
  });

  test('should give 0 points for established account (>30 days)', () => {
    const now = new Date();
    const transaction = {
      ...baseTransaction,
      timestamp: now.toISOString(),
      account_created_at: subDays(now, 180).toISOString()
    };

    const signal = calculateAccountAgeSignal(transaction);

    expect(signal.score).toBe(0);
    expect(signal.reason).toContain('Established account');
  });

  test('should include account age details', () => {
    const now = new Date();
    const transaction = {
      ...baseTransaction,
      timestamp: now.toISOString(),
      account_created_at: subDays(now, 10).toISOString()
    };

    const signal = calculateAccountAgeSignal(transaction);

    expect(signal.details).toHaveProperty('account_age_hours');
    expect(signal.details).toHaveProperty('account_age_days');
    expect(signal.details?.account_age_days).toBe(10);
  });
});
