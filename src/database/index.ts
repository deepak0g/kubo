import { prisma } from './prisma';
import { Transaction, DeviceReputation, WatchlistEntry } from '../types';

// Transaction operations
export async function insertTransaction(transaction: Transaction) {
  await prisma.transaction.create({
    data: {
      transactionId: transaction.transaction_id,
      timestamp: new Date(transaction.timestamp),
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      buyerId: transaction.buyer_id,
      accountCreatedAt: new Date(transaction.account_created_at),
      email: transaction.email,
      emailDomain: transaction.email_domain,
      totalOrders: transaction.total_orders,
      lifetimeSpend: transaction.lifetime_spend,
      deviceFingerprint: transaction.device_fingerprint,
      ipAddress: transaction.ip_address,
      ipCountry: transaction.ip_country,
      userAgent: transaction.user_agent,
      cardLast4: transaction.card_last4,
      cardBin: transaction.card_bin,
      cardIssuingCountry: transaction.card_issuing_country,
      shippingAddress: transaction.shipping_address,
      shippingCity: transaction.shipping_city,
      shippingCountry: transaction.shipping_country,
      isNewAddress: transaction.is_new_address,
      billingCountry: transaction.billing_country
    }
  });
}

export async function bulkInsertTransactions(transactions: Transaction[]) {
  await prisma.transaction.createMany({
    data: transactions.map(t => ({
      transactionId: t.transaction_id,
      timestamp: new Date(t.timestamp),
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      buyerId: t.buyer_id,
      accountCreatedAt: new Date(t.account_created_at),
      email: t.email,
      emailDomain: t.email_domain,
      totalOrders: t.total_orders,
      lifetimeSpend: t.lifetime_spend,
      deviceFingerprint: t.device_fingerprint,
      ipAddress: t.ip_address,
      ipCountry: t.ip_country,
      userAgent: t.user_agent,
      cardLast4: t.card_last4,
      cardBin: t.card_bin,
      cardIssuingCountry: t.card_issuing_country,
      shippingAddress: t.shipping_address,
      shippingCity: t.shipping_city,
      shippingCountry: t.shipping_country,
      isNewAddress: t.is_new_address,
      billingCountry: t.billing_country
    })) as any,
    skipDuplicates: true
  });
}

function mapPrismaToTransaction(t: any): Transaction {
  return {
    transaction_id: t.transactionId,
    timestamp: t.timestamp.toISOString(),
    amount: t.amount,
    currency: t.currency,
    status: t.status,
    buyer_id: t.buyerId,
    account_created_at: t.accountCreatedAt.toISOString(),
    email: t.email,
    email_domain: t.emailDomain,
    total_orders: t.totalOrders,
    lifetime_spend: t.lifetimeSpend,
    device_fingerprint: t.deviceFingerprint,
    ip_address: t.ipAddress,
    ip_country: t.ipCountry,
    user_agent: t.userAgent,
    card_last4: t.cardLast4,
    card_bin: t.cardBin,
    card_issuing_country: t.cardIssuingCountry,
    shipping_address: t.shippingAddress,
    shipping_city: t.shippingCity,
    shipping_country: t.shippingCountry,
    is_new_address: t.isNewAddress,
    billing_country: t.billingCountry
  };
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const transactions = await prisma.transaction.findMany({
    orderBy: { timestamp: 'desc' }
  });
  return transactions.map(mapPrismaToTransaction);
}

export async function getTransactionsByTimeRange(startTime: string, endTime: string): Promise<Transaction[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      timestamp: {
        gte: new Date(startTime),
        lte: new Date(endTime)
      }
    },
    orderBy: { timestamp: 'desc' }
  });
  return transactions.map(mapPrismaToTransaction);
}

export async function getTransactionsByBuyer(buyerId: string, limit: number = 100): Promise<Transaction[]> {
  const transactions = await prisma.transaction.findMany({
    where: { buyerId },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
  return transactions.map(mapPrismaToTransaction);
}

export async function getTransactionsByDevice(deviceFingerprint: string, limit: number = 100): Promise<Transaction[]> {
  const transactions = await prisma.transaction.findMany({
    where: { deviceFingerprint },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
  return transactions.map(mapPrismaToTransaction);
}

export async function getRecentTransactionsByBuyer(buyerId: string, hoursBack: number): Promise<Transaction[]> {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const transactions = await prisma.transaction.findMany({
    where: {
      buyerId,
      timestamp: { gte: cutoffTime }
    },
    orderBy: { timestamp: 'desc' }
  });
  return transactions.map(mapPrismaToTransaction);
}

export async function getRecentTransactionsByDevice(deviceFingerprint: string, hoursBack: number): Promise<Transaction[]> {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const transactions = await prisma.transaction.findMany({
    where: {
      deviceFingerprint,
      timestamp: { gte: cutoffTime }
    },
    orderBy: { timestamp: 'desc' }
  });
  return transactions.map(mapPrismaToTransaction);
}

// Device reputation operations
export async function updateDeviceReputation(deviceFingerprint: string) {
  const transactions = await getTransactionsByDevice(deviceFingerprint);

  if (transactions.length === 0) return;

  const chargebackCount = transactions.filter(t => t.status === 'chargeback').length;
  const buyerIds = [...new Set(transactions.map(t => t.buyer_id))];
  const firstSeen = new Date(transactions[transactions.length - 1].timestamp);
  const lastSeen = new Date(transactions[0].timestamp);

  await prisma.deviceReputation.upsert({
    where: { deviceFingerprint },
    update: {
      totalTransactions: transactions.length,
      chargebackCount,
      lastSeen,
      associatedBuyerIds: JSON.stringify(buyerIds)
    },
    create: {
      deviceFingerprint,
      totalTransactions: transactions.length,
      chargebackCount,
      firstSeen,
      lastSeen,
      associatedBuyerIds: JSON.stringify(buyerIds)
    }
  });
}

export function getDeviceReputation(deviceFingerprint: string): DeviceReputation | null {
  // This needs to be synchronous for the signals, so we'll use a different approach
  // We'll query it directly in the signal calculator
  return null; // Placeholder - will be replaced
}

export async function getDeviceReputationAsync(deviceFingerprint: string): Promise<DeviceReputation | null> {
  const rep = await prisma.deviceReputation.findUnique({
    where: { deviceFingerprint }
  });

  if (!rep) return null;

  return {
    device_fingerprint: rep.deviceFingerprint,
    total_transactions: rep.totalTransactions,
    chargeback_count: rep.chargebackCount,
    first_seen: rep.firstSeen.toISOString(),
    last_seen: rep.lastSeen.toISOString(),
    associated_buyer_ids: JSON.parse(rep.associatedBuyerIds)
  };
}

export async function rebuildAllDeviceReputations() {
  const devices = await prisma.transaction.findMany({
    select: { deviceFingerprint: true },
    distinct: ['deviceFingerprint']
  });

  for (const device of devices) {
    await updateDeviceReputation(device.deviceFingerprint);
  }
}

// Watchlist operations
export async function addToWatchlist(entry: WatchlistEntry) {
  await prisma.watchlist.create({
    data: {
      id: entry.id,
      entityType: entry.entity_type,
      entityValue: entry.entity_value,
      listType: entry.list_type,
      reason: entry.reason,
      addedAt: new Date(entry.added_at),
      addedBy: entry.added_by
    }
  });
}

export async function removeFromWatchlist(id: string) {
  await prisma.watchlist.delete({
    where: { id }
  });
}

export async function checkWatchlist(entityType: string, entityValue: string): Promise<WatchlistEntry | null> {
  const entry = await prisma.watchlist.findFirst({
    where: {
      entityType,
      entityValue
    }
  });

  if (!entry) return null;

  return {
    id: entry.id,
    entity_type: entry.entityType as any,
    entity_value: entry.entityValue,
    list_type: entry.listType as any,
    reason: entry.reason,
    added_at: entry.addedAt.toISOString(),
    added_by: entry.addedBy
  };
}

export async function getAllWatchlistEntries(): Promise<WatchlistEntry[]> {
  const entries = await prisma.watchlist.findMany({
    orderBy: { addedAt: 'desc' }
  });

  return entries.map((e: any) => ({
    id: e.id,
    entity_type: e.entityType,
    entity_value: e.entityValue,
    list_type: e.listType,
    reason: e.reason,
    added_at: e.addedAt.toISOString(),
    added_by: e.addedBy
  }));
}

// Initialize (no-op for Prisma, migrations handle schema)
export function initializeDatabase() {
  console.log('Using Prisma - schema managed by migrations');
}

export function closeDatabase() {
  prisma.$disconnect();
}
