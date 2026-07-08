import { getAllTransactions, initializeDatabase, closeDatabase } from '../database';
import { calculateBatchRiskScores } from '../scoring/engine';
import { BatchAnalysisResult, RiskAssessment, Transaction } from '../types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

/**
 * Batch Analysis Script
 *
 * Analyzes historical transactions and generates insights about
 * risk score distribution and model performance.
 */

async function performBatchAnalysis(): Promise<BatchAnalysisResult> {
  console.log('🔍 Starting batch analysis...\n');

  initializeDatabase();

  // Load all transactions
  const transactions = await getAllTransactions();
  console.log(`Loaded ${transactions.length} historical transactions`);

  // Calculate risk scores
  console.log('Computing risk scores...');
  const assessments = await calculateBatchRiskScores(transactions);

  // Combine transactions with their assessments
  const transactionsWithScores = transactions.map((txn, idx) => ({
    ...txn,
    risk_assessment: assessments[idx]
  }));

  // Calculate score distribution
  const low = assessments.filter(a => a.risk_level === 'LOW').length;
  const medium = assessments.filter(a => a.risk_level === 'MEDIUM').length;
  const high = assessments.filter(a => a.risk_level === 'HIGH').length;

  console.log('\n📊 Risk Score Distribution:');
  console.log(`   LOW (0-30):    ${low} transactions (${((low / transactions.length) * 100).toFixed(1)}%)`);
  console.log(`   MEDIUM (31-70): ${medium} transactions (${((medium / transactions.length) * 100).toFixed(1)}%)`);
  console.log(`   HIGH (71-100):  ${high} transactions (${((high / transactions.length) * 100).toFixed(1)}%)`);

  // Fraud detection metrics
  const chargebacks = transactions.filter(t => t.status === 'chargeback');
  const chargebackIds = new Set(chargebacks.map(t => t.transaction_id));

  const chargebackAssessments = assessments.filter(a => chargebackIds.has(a.transaction_id));
  const chargebacksFlaggedHigh = chargebackAssessments.filter(a => a.risk_level === 'HIGH').length;
  const chargebacksFlaggedMediumOrHigh = chargebackAssessments.filter(
    a => a.risk_level === 'MEDIUM' || a.risk_level === 'HIGH'
  ).length;

  const highRiskAssessments = assessments.filter(a => a.risk_level === 'HIGH');
  const truePositivesHigh = highRiskAssessments.filter(a => chargebackIds.has(a.transaction_id)).length;

  const precisionAtHigh = highRiskAssessments.length > 0
    ? truePositivesHigh / highRiskAssessments.length
    : 0;

  const recallAtHigh = chargebacks.length > 0
    ? chargebacksFlaggedHigh / chargebacks.length
    : 0;

  console.log('\n🎯 Fraud Detection Performance:');
  console.log(`   Total chargebacks: ${chargebacks.length}`);
  console.log(`   Chargebacks flagged HIGH: ${chargebacksFlaggedHigh} (${((chargebacksFlaggedHigh / chargebacks.length) * 100).toFixed(1)}%)`);
  console.log(`   Chargebacks flagged MEDIUM or HIGH: ${chargebacksFlaggedMediumOrHigh} (${((chargebacksFlaggedMediumOrHigh / chargebacks.length) * 100).toFixed(1)}%)`);
  console.log(`   Precision at HIGH threshold: ${(precisionAtHigh * 100).toFixed(1)}%`);
  console.log(`   Recall at HIGH threshold: ${(recallAtHigh * 100).toFixed(1)}%`);

  // Analyze signal contributions in fraud cases
  console.log('\n🔬 Top Risk Signals in Fraud Cases:');

  const signalContributions = new Map<string, { count: number; totalScore: number }>();

  chargebackAssessments.forEach(assessment => {
    assessment.contributing_signals.forEach(signal => {
      if (signal.score > 0) {
        const existing = signalContributions.get(signal.name) || { count: 0, totalScore: 0 };
        signalContributions.set(signal.name, {
          count: existing.count + 1,
          totalScore: existing.totalScore + signal.score
        });
      }
    });
  });

  const topSignals = Array.from(signalContributions.entries())
    .map(([name, data]) => ({
      signal_name: name,
      frequency_in_fraud: data.count / chargebacks.length,
      avg_contribution: data.totalScore / data.count
    }))
    .sort((a, b) => b.frequency_in_fraud - a.frequency_in_fraud)
    .slice(0, 5);

  topSignals.forEach((signal, idx) => {
    console.log(`   ${idx + 1}. ${signal.signal_name.replace(/_/g, ' ')}: ` +
      `${(signal.frequency_in_fraud * 100).toFixed(1)}% frequency, ` +
      `avg ${signal.avg_contribution.toFixed(1)} points`);
  });

  // Recommend threshold
  const scores = assessments.map(a => a.overall_score).sort((a, b) => b - a);
  const chargebackScores = chargebackAssessments.map(a => a.overall_score).sort((a, b) => b - a);

  // Find threshold that captures 80-90% of fraud while minimizing false positives
  let recommendedThreshold = 70;
  let bestF1 = 0;

  for (let threshold = 50; threshold <= 85; threshold += 5) {
    const flagged = assessments.filter(a => a.overall_score >= threshold);
    const fraudCaught = flagged.filter(a => chargebackIds.has(a.transaction_id)).length;

    const precision = flagged.length > 0 ? fraudCaught / flagged.length : 0;
    const recall = chargebacks.length > 0 ? fraudCaught / chargebacks.length : 0;
    const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    if (f1 > bestF1) {
      bestF1 = f1;
      recommendedThreshold = threshold;
    }
  }

  const flaggedAtRecommended = assessments.filter(a => a.overall_score >= recommendedThreshold);
  const fraudCaughtAtRecommended = flaggedAtRecommended.filter(a => chargebackIds.has(a.transaction_id)).length;
  const precisionAtRecommended = fraudCaughtAtRecommended / flaggedAtRecommended.length;
  const recallAtRecommended = fraudCaughtAtRecommended / chargebacks.length;

  console.log('\n💡 Recommended Threshold:');
  console.log(`   Threshold: ${recommendedThreshold}`);
  console.log(`   Would flag: ${flaggedAtRecommended.length} transactions for review`);
  console.log(`   Would catch: ${fraudCaughtAtRecommended}/${chargebacks.length} chargebacks (${(recallAtRecommended * 100).toFixed(1)}%)`);
  console.log(`   Precision: ${(precisionAtRecommended * 100).toFixed(1)}%`);
  console.log(`   Reasoning: Optimizes F1-score balance between catching fraud and minimizing false positives`);

  const result: BatchAnalysisResult = {
    batch_id: uuidv4(),
    total_transactions: transactions.length,
    analysis_timestamp: new Date().toISOString(),
    score_distribution: {
      low,
      medium,
      high
    },
    fraud_detection_metrics: {
      total_chargebacks: chargebacks.length,
      chargebacks_flagged_high: chargebacksFlaggedHigh,
      chargebacks_flagged_medium_or_high: chargebacksFlaggedMediumOrHigh,
      precision_at_high: precisionAtHigh,
      recall_at_high: recallAtHigh
    },
    top_signals_in_fraud: topSignals,
    recommended_threshold: {
      score: recommendedThreshold,
      reasoning: `Optimizes F1-score (${bestF1.toFixed(3)}) to balance fraud detection with false positive rate. ` +
        `Would catch ${(recallAtRecommended * 100).toFixed(1)}% of fraud with ${(precisionAtRecommended * 100).toFixed(1)}% precision.`
    },
    transactions_with_scores: transactionsWithScores
  };

  // Save to file
  const outputDir = './output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, `batch-analysis-${result.batch_id}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

  console.log(`\n💾 Full report saved to: ${reportPath}`);

  // Save CSV of high-risk transactions
  const highRiskTxns = transactionsWithScores.filter(t => t.risk_assessment.risk_level === 'HIGH');
  const csvLines = [
    'transaction_id,amount,status,risk_score,buyer_id,account_age_days,device_fingerprint,top_signals'
  ];

  highRiskTxns.forEach((txn: any) => {
    const accountAgeDays = Math.floor(
      (new Date(txn.timestamp).getTime() - new Date(txn.account_created_at).getTime()) /
      (1000 * 60 * 60 * 24)
    );

    const topSignals = txn.risk_assessment.contributing_signals
      .slice(0, 3)
      .map((s: any) => `${s.name}:${s.score}`)
      .join(';');

    csvLines.push(
      `${txn.transaction_id},${txn.amount},${txn.status},${txn.risk_assessment.overall_score},` +
      `${txn.buyer_id},${accountAgeDays},${txn.device_fingerprint},"${topSignals}"`
    );
  });

  const csvPath = path.join(outputDir, `high-risk-transactions-${result.batch_id}.csv`);
  fs.writeFileSync(csvPath, csvLines.join('\n'));

  console.log(`📊 High-risk transactions CSV saved to: ${csvPath}`);

  closeDatabase();

  return result;
}

// Run if called directly
if (require.main === module) {
  performBatchAnalysis().then(() => {
    console.log('\n✅ Batch analysis complete!\n');
  });
}

export { performBatchAnalysis };
