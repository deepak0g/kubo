import axios from 'axios';

/**
 * Demo Script
 *
 * Demonstrates the risk scoring API with example transactions
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRiskScoring() {
  console.log('🚀 Kubo Risk Scoring Engine - Demo\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // Test 1: Legitimate transaction
  console.log('═══════════════════════════════════════════════════════');
  console.log('Test 1: Legitimate Transaction');
  console.log('═══════════════════════════════════════════════════════');

  const legitimateTransaction = {
    amount: 45.99,
    currency: 'USD',

    buyer_id: 'buyer_demo_001',
    account_created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days ago
    email: 'john.smith@gmail.com',
    email_domain: 'gmail.com',
    total_orders: 15,
    lifetime_spend: 687.50,

    device_fingerprint: 'device_legit_demo_001',
    ip_address: '203.145.67.89',
    ip_country: 'US',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

    card_last4: '4532',
    card_bin: '424242',
    card_issuing_country: 'US',

    shipping_address: '123 Main St',
    shipping_city: 'San Francisco',
    shipping_country: 'US',
    is_new_address: false,

    billing_country: 'US'
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/risk/score`, legitimateTransaction);
    const assessment = response.data.data;

    console.log(`\n✅ Risk Score: ${assessment.overall_score}/100`);
    console.log(`   Risk Level: ${assessment.risk_level}`);
    console.log(`   Recommendation: ${assessment.recommended_action}`);
    console.log(`\n   Contributing Signals:`);
    assessment.contributing_signals.slice(0, 3).forEach((signal: any) => {
      console.log(`   • ${signal.name}: ${signal.score}/${signal.max_score} - ${signal.reason}`);
    });
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  await sleep(1000);

  // Test 2: New account with high-value purchase
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('Test 2: Suspicious - New Account + High Value');
  console.log('═══════════════════════════════════════════════════════');

  const suspiciousTransaction = {
    amount: 349.99,
    currency: 'USD',

    buyer_id: 'buyer_demo_002',
    account_created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    email: 'temp_user123@tempmail.com',
    email_domain: 'tempmail.com',
    total_orders: 0,
    lifetime_spend: 0,

    device_fingerprint: 'device_new_suspicious',
    ip_address: '178.34.56.78',
    ip_country: 'RU',
    user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',

    card_last4: '8765',
    card_bin: '512345',
    card_issuing_country: 'US',

    shipping_address: '456 Oak Ave',
    shipping_city: 'New York',
    shipping_country: 'US',
    is_new_address: true,

    billing_country: 'US'
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/risk/score`, suspiciousTransaction);
    const assessment = response.data.data;

    console.log(`\n⚠️  Risk Score: ${assessment.overall_score}/100`);
    console.log(`   Risk Level: ${assessment.risk_level}`);
    console.log(`   Recommendation: ${assessment.recommended_action}`);
    console.log(`\n   Top Risk Signals:`);
    assessment.contributing_signals.slice(0, 5).forEach((signal: any) => {
      if (signal.score > 0) {
        console.log(`   • ${signal.name}: ${signal.score} points - ${signal.reason}`);
      }
    });
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  await sleep(1000);

  // Test 3: Geographic mismatch
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('Test 3: High Risk - Geographic Anomaly');
  console.log('═══════════════════════════════════════════════════════');

  const geoMismatchTransaction = {
    amount: 199.99,
    currency: 'USD',

    buyer_id: 'buyer_demo_003',
    account_created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    email: 'user456@yahoo.com',
    email_domain: 'yahoo.com',
    total_orders: 3,
    lifetime_spend: 275.00,

    device_fingerprint: 'device_suspicious_002',
    ip_address: '102.45.78.123',
    ip_country: 'NG', // Nigeria (high-risk)
    user_agent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36',

    card_last4: '9876',
    card_bin: '448899',
    card_issuing_country: 'GB', // UK card


    shipping_address: '789 Commerce Blvd',
    shipping_city: 'Los Angeles',
    shipping_country: 'US', // Shipping to US
    is_new_address: true,

    billing_country: 'GB'
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/risk/score`, geoMismatchTransaction);
    const assessment = response.data.data;

    console.log(`\n🚨 Risk Score: ${assessment.overall_score}/100`);
    console.log(`   Risk Level: ${assessment.risk_level}`);
    console.log(`   Recommendation: ${assessment.recommended_action}`);
    console.log(`\n   Top Risk Signals:`);
    assessment.contributing_signals.slice(0, 5).forEach((signal: any) => {
      if (signal.score > 0) {
        console.log(`   • ${signal.name}: ${signal.score} points - ${signal.reason}`);
      }
    });
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  await sleep(1000);

  // Test 4: Just under threshold (card testing)
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('Test 4: Suspicious Pattern - Just Under Threshold');
  console.log('═══════════════════════════════════════════════════════');

  const thresholdTestTransaction = {
    amount: 148.50, // Just under $150 manual review threshold
    currency: 'USD',

    buyer_id: 'buyer_demo_004',
    account_created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    email: 'newuser789@gmail.com',
    email_domain: 'gmail.com',
    total_orders: 0,
    lifetime_spend: 0,

    device_fingerprint: 'device_testing_pattern',
    ip_address: '45.123.67.89',
    ip_country: 'PH',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',

    card_last4: '3456',
    card_bin: '431234',
    card_issuing_country: 'PH',

    shipping_address: '321 Market St',
    shipping_city: 'Manila',
    shipping_country: 'PH',
    is_new_address: true,

    billing_country: 'PH'
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/risk/score`, thresholdTestTransaction);
    const assessment = response.data.data;

    console.log(`\n⚠️  Risk Score: ${assessment.overall_score}/100`);
    console.log(`   Risk Level: ${assessment.risk_level}`);
    console.log(`   Recommendation: ${assessment.recommended_action}`);
    console.log(`\n   Top Risk Signals:`);
    assessment.contributing_signals.slice(0, 5).forEach((signal: any) => {
      if (signal.score > 0) {
        console.log(`   • ${signal.name}: ${signal.score} points - ${signal.reason}`);
      }
    });
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('Demo complete! ✅');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run demo
if (require.main === module) {
  testRiskScoring().catch(console.error);
}

export { testRiskScoring };
