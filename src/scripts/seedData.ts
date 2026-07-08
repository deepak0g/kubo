import { Transaction } from '../types';
import { bulkInsertTransactions, initializeDatabase, rebuildAllDeviceReputations, closeDatabase } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { subDays, subHours, subMinutes } from 'date-fns';

/**
 * Test Data Generator
 *
 * Generates realistic transaction data with fraud patterns matching
 * the Kubo Market scenario.
 */

const COUNTRIES = ['US', 'CA', 'GB', 'AU', 'SG', 'PH', 'MY', 'TH', 'ID', 'VN'];
const HIGH_RISK_COUNTRIES = ['NG', 'RU', 'UA', 'PK'];
const CITIES = ['Manila', 'Singapore', 'Bangkok', 'Jakarta', 'Ho Chi Minh City', 'Kuala Lumpur'];

const LEGITIMATE_EMAILS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'
];

const DISPOSABLE_EMAILS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com'
];

// Track device fingerprints for fraud patterns
const fraudDeviceFingerprints = [
  'device_fraud_001',
  'device_fraud_002',
  'device_fraud_003'
];

const legitimateDeviceFingerprints = Array.from({ length: 100 }, (_, i) => `device_legit_${i.toString().padStart(3, '0')}`);

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateBuyerId(): string {
  return `buyer_${uuidv4().substring(0, 8)}`;
}

function generateEmail(domain: string): string {
  const username = `user${randomInt(1000, 9999)}`;
  return `${username}@${domain}`;
}

function generateIP(country: string): string {
  return `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
}

function generateAddress(city: string): string {
  const streetNumber = randomInt(1, 9999);
  const streets = ['Main St', 'Oak Ave', 'Market Rd', 'Commerce Blvd', 'Industrial Way'];
  return `${streetNumber} ${randomElement(streets)}`;
}

/**
 * Generate legitimate transactions
 */
function generateLegitimateTransaction(baseTime: Date, accountAge: number): Transaction {
  const buyerId = generateBuyerId();
  const emailDomain = randomElement(LEGITIMATE_EMAILS);
  const country = randomElement(COUNTRIES);

  const totalOrders = randomInt(1, 50);
  const lifetimeSpend = randomFloat(100, 5000);
  const avgSpend = lifetimeSpend / totalOrders;

  // Transaction amount within normal range
  const amount = randomFloat(avgSpend * 0.5, avgSpend * 1.5);

  const accountCreatedAt = subDays(baseTime, accountAge);

  return {
    transaction_id: uuidv4(),
    timestamp: baseTime.toISOString(),
    amount: Math.round(amount * 100) / 100,
    currency: 'USD',
    status: 'approved',

    buyer_id: buyerId,
    account_created_at: accountCreatedAt.toISOString(),
    email: generateEmail(emailDomain),
    email_domain: emailDomain,
    total_orders: totalOrders,
    lifetime_spend: Math.round(lifetimeSpend * 100) / 100,

    device_fingerprint: randomElement(legitimateDeviceFingerprints),
    ip_address: generateIP(country),
    ip_country: country,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

    card_last4: randomInt(1000, 9999).toString(),
    card_bin: randomInt(400000, 599999).toString(),
    card_issuing_country: country,

    shipping_address: generateAddress(randomElement(CITIES)),
    shipping_city: randomElement(CITIES),
    shipping_country: country,
    is_new_address: Math.random() < 0.2,

    billing_country: country
  };
}

/**
 * Pattern 1: New account + high value transaction
 */
function generateNewAccountFraud(baseTime: Date): Transaction {
  const buyerId = generateBuyerId();
  const emailDomain = randomElement([...DISPOSABLE_EMAILS, ...LEGITIMATE_EMAILS]);
  const country = randomElement(COUNTRIES);

  const accountCreatedAt = subHours(baseTime, randomInt(1, 23));

  return {
    transaction_id: uuidv4(),
    timestamp: baseTime.toISOString(),
    amount: randomFloat(200, 500),
    currency: 'USD',
    status: 'chargeback',

    buyer_id: buyerId,
    account_created_at: accountCreatedAt.toISOString(),
    email: generateEmail(emailDomain),
    email_domain: emailDomain,
    total_orders: 0,
    lifetime_spend: 0,

    device_fingerprint: randomElement(fraudDeviceFingerprints),
    ip_address: generateIP(country),
    ip_country: country,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

    card_last4: randomInt(1000, 9999).toString(),
    card_bin: randomInt(400000, 599999).toString(),
    card_issuing_country: country,

    shipping_address: generateAddress(randomElement(CITIES)),
    shipping_city: randomElement(CITIES),
    shipping_country: country,
    is_new_address: true,

    billing_country: country
  };
}

/**
 * Pattern 2: Velocity attack (multiple transactions in short time)
 */
function generateVelocityAttack(baseTime: Date): Transaction[] {
  const buyerId = generateBuyerId();
  const deviceFingerprint = randomElement(fraudDeviceFingerprints);
  const emailDomain = randomElement(LEGITIMATE_EMAILS);
  const country = randomElement(COUNTRIES);
  const accountCreatedAt = subDays(baseTime, randomInt(1, 5));

  const transactions: Transaction[] = [];
  const numTransactions = randomInt(6, 12);

  for (let i = 0; i < numTransactions; i++) {
    const txTime = subMinutes(baseTime, randomInt(0, 120));

    transactions.push({
      transaction_id: uuidv4(),
      timestamp: txTime.toISOString(),
      amount: randomFloat(50, 149),
      currency: 'USD',
      status: i < numTransactions - 2 ? 'approved' : 'chargeback',

      buyer_id: buyerId,
      account_created_at: accountCreatedAt.toISOString(),
      email: generateEmail(emailDomain),
      email_domain: emailDomain,
      total_orders: i,
      lifetime_spend: i * 100,

      device_fingerprint: deviceFingerprint,
      ip_address: generateIP(country),
      ip_country: country,
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',

      card_last4: randomInt(1000, 9999).toString(),
      card_bin: randomInt(400000, 599999).toString(),
      card_issuing_country: country,

      shipping_address: generateAddress(randomElement(CITIES)),
      shipping_city: randomElement(CITIES),
      shipping_country: country,
      is_new_address: i === 0,

      billing_country: country
    });
  }

  return transactions;
}

/**
 * Pattern 3: Geographic mismatch
 */
function generateGeoMismatchFraud(baseTime: Date): Transaction {
  const buyerId = generateBuyerId();
  const emailDomain = randomElement(LEGITIMATE_EMAILS);

  const ipCountry = randomElement(HIGH_RISK_COUNTRIES);
  const cardCountry = randomElement(COUNTRIES);
  const shippingCountry = randomElement(COUNTRIES);

  const accountCreatedAt = subDays(baseTime, randomInt(5, 30));

  return {
    transaction_id: uuidv4(),
    timestamp: baseTime.toISOString(),
    amount: randomFloat(150, 300),
    currency: 'USD',
    status: 'chargeback',

    buyer_id: buyerId,
    account_created_at: accountCreatedAt.toISOString(),
    email: generateEmail(emailDomain),
    email_domain: emailDomain,
    total_orders: randomInt(1, 5),
    lifetime_spend: randomFloat(100, 500),

    device_fingerprint: randomElement(fraudDeviceFingerprints),
    ip_address: generateIP(ipCountry),
    ip_country: ipCountry,
    user_agent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36',

    card_last4: randomInt(1000, 9999).toString(),
    card_bin: randomInt(400000, 599999).toString(),
    card_issuing_country: cardCountry,

    shipping_address: generateAddress(randomElement(CITIES)),
    shipping_city: randomElement(CITIES),
    shipping_country: shippingCountry,
    is_new_address: true,

    billing_country: cardCountry
  };
}

/**
 * Pattern 4: Same device, multiple accounts
 */
function generateDeviceSharing(baseTime: Date): Transaction[] {
  const deviceFingerprint = randomElement(fraudDeviceFingerprints);
  const transactions: Transaction[] = [];

  for (let i = 0; i < 5; i++) {
    const buyerId = generateBuyerId();
    const emailDomain = randomElement(LEGITIMATE_EMAILS);
    const country = randomElement(COUNTRIES);
    const txTime = subHours(baseTime, i * 2);
    const accountCreatedAt = subDays(txTime, randomInt(1, 3));

    transactions.push({
      transaction_id: uuidv4(),
      timestamp: txTime.toISOString(),
      amount: randomFloat(100, 200),
      currency: 'USD',
      status: i >= 3 ? 'chargeback' : 'approved',

      buyer_id: buyerId,
      account_created_at: accountCreatedAt.toISOString(),
      email: generateEmail(emailDomain),
      email_domain: emailDomain,
      total_orders: 0,
      lifetime_spend: 0,

      device_fingerprint: deviceFingerprint,
      ip_address: generateIP(country),
      ip_country: country,
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',

      card_last4: randomInt(1000, 9999).toString(),
      card_bin: randomInt(400000, 599999).toString(),
      card_issuing_country: country,

      shipping_address: generateAddress(randomElement(CITIES)),
      shipping_city: randomElement(CITIES),
      shipping_country: country,
      is_new_address: true,

      billing_country: country
    });
  }

  return transactions;
}

/**
 * Suspicious but not confirmed fraud
 */
function generateSuspiciousTransaction(baseTime: Date): Transaction {
  const buyerId = generateBuyerId();
  const emailDomain = randomElement(LEGITIMATE_EMAILS);
  const country = randomElement(COUNTRIES);

  const accountCreatedAt = subDays(baseTime, randomInt(3, 14));

  return {
    transaction_id: uuidv4(),
    timestamp: baseTime.toISOString(),
    amount: randomFloat(140, 149), // Just under threshold
    currency: 'USD',
    status: 'approved',

    buyer_id: buyerId,
    account_created_at: accountCreatedAt.toISOString(),
    email: generateEmail(emailDomain),
    email_domain: emailDomain,
    total_orders: randomInt(0, 2),
    lifetime_spend: randomFloat(0, 200),

    device_fingerprint: randomElement([...legitimateDeviceFingerprints, ...fraudDeviceFingerprints]),
    ip_address: generateIP(country),
    ip_country: country,
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',

    card_last4: randomInt(1000, 9999).toString(),
    card_bin: randomInt(400000, 599999).toString(),
    card_issuing_country: country,

    shipping_address: generateAddress(randomElement(CITIES)),
    shipping_city: randomElement(CITIES),
    shipping_country: country,
    is_new_address: Math.random() < 0.5,

    billing_country: country
  };
}

/**
 * Main seed function
 */
function seedDatabase() {
  console.log('🌱 Seeding database with test data...\n');

  initializeDatabase();

  const transactions: Transaction[] = [];
  const now = new Date();

  // Generate 130 legitimate transactions
  console.log('Generating 130 legitimate transactions...');
  for (let i = 0; i < 130; i++) {
    const daysAgo = randomInt(0, 30);
    const baseTime = subDays(now, daysAgo);
    const accountAge = randomInt(30, 365);
    transactions.push(generateLegitimateTransaction(baseTime, accountAge));
  }

  // Generate fraud patterns (12 confirmed chargebacks)
  console.log('Generating fraud pattern: New account + high value (3 chargebacks)...');
  for (let i = 0; i < 3; i++) {
    const daysAgo = randomInt(0, 3);
    transactions.push(generateNewAccountFraud(subDays(now, daysAgo)));
  }

  console.log('Generating fraud pattern: Velocity attacks (2 attacks, ~20 transactions)...');
  transactions.push(...generateVelocityAttack(subDays(now, 2)));
  transactions.push(...generateVelocityAttack(subDays(now, 5)));

  console.log('Generating fraud pattern: Geographic mismatches (3 chargebacks)...');
  for (let i = 0; i < 3; i++) {
    const daysAgo = randomInt(1, 7);
    transactions.push(generateGeoMismatchFraud(subDays(now, daysAgo)));
  }

  console.log('Generating fraud pattern: Device sharing (5 transactions, 2 chargebacks)...');
  transactions.push(...generateDeviceSharing(subDays(now, 1)));

  // Generate suspicious transactions
  console.log('Generating 30 suspicious but unconfirmed transactions...');
  for (let i = 0; i < 30; i++) {
    const daysAgo = randomInt(0, 14);
    transactions.push(generateSuspiciousTransaction(subDays(now, daysAgo)));
  }

  // Sort by timestamp
  transactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Insert into database
  console.log(`\nInserting ${transactions.length} transactions into database...`);
  bulkInsertTransactions(transactions);

  // Rebuild device reputations
  console.log('Building device reputation data...');
  rebuildAllDeviceReputations();

  // Statistics
  const chargebacks = transactions.filter(t => t.status === 'chargeback').length;
  const approved = transactions.filter(t => t.status === 'approved').length;

  console.log('\n✅ Database seeded successfully!\n');
  console.log('📊 Statistics:');
  console.log(`   Total transactions: ${transactions.length}`);
  console.log(`   Approved: ${approved}`);
  console.log(`   Chargebacks: ${chargebacks}`);
  console.log(`   Chargeback rate: ${((chargebacks / transactions.length) * 100).toFixed(2)}%`);

  closeDatabase();
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
