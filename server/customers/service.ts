import 'server-only';

import { type Collection, type Document } from 'mongodb';
import { getDb } from '@/server/db/mongodb';
import type { User } from '@/shared/types';

export type CustomerStatus = 'Active' | 'New' | 'Idle';
export type CustomerStatusFilter = CustomerStatus | 'all';

export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  totalBalance: number;
  walletCount: number;
  bankAccountCount: number;
  transactionCount: number;
  joined: string;
  status: CustomerStatus;
}

interface UserRecord extends User {
  emailNormalized: string;
  passwordHash: string;
}

interface WalletAggregate {
  _id: string;
  totalBalance: number;
  walletCount: number;
}

interface BankAggregate {
  _id: string;
  bankAccountCount: number;
}

interface TransactionAggregate {
  _id: string;
  transactionCount: number;
}

const RECENT_CUSTOMER_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSingleStatus(value?: string): CustomerStatusFilter {
  if (value === 'Active' || value === 'New' || value === 'Idle' || value === 'all') {
    return value;
  }

  return 'all';
}

function deriveCustomerStatus(
  joined: string,
  totalBalance: number,
  walletCount: number,
  bankAccountCount: number,
  transactionCount: number
): CustomerStatus {
  if (totalBalance > 0 || walletCount > 0 || bankAccountCount > 0 || transactionCount > 0) {
    return 'Active';
  }

  const joinedTimestamp = new Date(joined).getTime();

  if (Number.isFinite(joinedTimestamp) && Date.now() - joinedTimestamp <= RECENT_CUSTOMER_WINDOW_MS) {
    return 'New';
  }

  return 'Idle';
}

export function normalizeCustomerStatus(value?: string) {
  return getSingleStatus(value);
}

async function safeAggregate<T>(collection: Collection<Document>, pipeline: Document[]): Promise<T[]> {
  try {
    return await collection.aggregate(pipeline).toArray() as T[];
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 26 || (err.message && err.message.includes('ns does not exist'))) {
      console.warn(`[db] Collection '${collection.collectionName}' does not exist yet. Returning empty results.`);
      return [];
    }
    throw new Error(`Aggregation failed on collection '${collection.collectionName}': ${err.message || 'Unknown error'}`);
  }
}

export async function getCustomers(filters: { query?: string; status?: string } = {}) {
  const db = await getDb();
  const usersCollection = db.collection<UserRecord>('users');
  const normalizedQuery = filters.query?.trim() ?? '';
  const statusFilter = getSingleStatus(filters.status);

  const userFilter = normalizedQuery
    ? {
        $or: [
          { name: { $regex: escapeRegex(normalizedQuery), $options: 'i' } },
          { email: { $regex: escapeRegex(normalizedQuery), $options: 'i' } },
          { id: { $regex: escapeRegex(normalizedQuery), $options: 'i' } },
        ],
      }
    : {};

  const users = await usersCollection.find(userFilter).sort({ createdAt: -1, name: 1 }).toArray();

  if (users.length === 0) {
    return [] as CustomerListItem[];
  }

  const userIds = users.map((user) => user.id);
  const [walletAggregates, bankAggregates, transactionAggregates] = await Promise.all([
    safeAggregate<WalletAggregate>(db.collection('walletAccounts'), [
      { $match: { ownerId: { $in: userIds } } },
      {
        $group: {
          _id: '$ownerId',
          totalBalance: { $sum: '$balance' },
          walletCount: { $sum: 1 },
        },
      },
    ]),
    safeAggregate<BankAggregate>(db.collection('bankAccounts'), [
      { $match: { ownerId: { $in: userIds } } },
      {
        $group: {
          _id: '$ownerId',
          bankAccountCount: { $sum: 1 },
        },
      },
    ]),
    safeAggregate<TransactionAggregate>(db.collection('transactions'), [
      { $match: { ownerId: { $in: userIds } } },
      {
        $group: {
          _id: '$ownerId',
          transactionCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const walletStats = new Map(walletAggregates.map((aggregate) => [aggregate._id, aggregate]));
  const bankStats = new Map(bankAggregates.map((aggregate) => [aggregate._id, aggregate]));
  const transactionStats = new Map(transactionAggregates.map((aggregate) => [aggregate._id, aggregate]));

  const customers = users
    .map((user) => {
      const walletAggregate = walletStats.get(user.id);
      const bankAggregate = bankStats.get(user.id);
      const transactionAggregate = transactionStats.get(user.id);
      const totalBalance = walletAggregate?.totalBalance ?? 0;
      const walletCount = walletAggregate?.walletCount ?? 0;
      const bankAccountCount = bankAggregate?.bankAccountCount ?? 0;
      const transactionCount = transactionAggregate?.transactionCount ?? 0;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalBalance,
        walletCount,
        bankAccountCount,
        transactionCount,
        joined: user.createdAt,
        status: deriveCustomerStatus(
          user.createdAt,
          totalBalance,
          walletCount,
          bankAccountCount,
          transactionCount
        ),
      } satisfies CustomerListItem;
    })
    .filter((customer) => statusFilter === 'all' || customer.status === statusFilter);

  return customers;
}
