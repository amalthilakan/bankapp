import { randomUUID } from 'crypto';
import type { Collection, Document, Filter } from 'mongodb';

import { getDb } from '@/server/db/mongodb';
import type {
  WalletAccount,
  BankAccount,
  Transaction,
  WalletSummary,
  ChartDataPoint,
} from '@/shared/types';

interface OwnedWalletAccount extends WalletAccount {
  ownerId: string;
}

interface OwnedBankAccount extends BankAccount {
  ownerId: string;
}

interface OwnedTransaction extends Transaction {
  ownerId: string;
}

interface OwnedChartPoint extends ChartDataPoint {
  ownerId: string;
  sortOrder: number;
}

interface OwnedSettings {
  _id: string;
  ownerId: string;
  referral: number;
  bonus: number;
}

interface OwnedSeedState {
  _id: string;
  ownerId: string;
  seededAt: string;
}

type MongoDocument<T> = T & { _id?: unknown };

const settingsSeed = {
  referral: 0,
  bonus: 0,
};

let initPromise: Promise<void> | null = null;

function toPlainObject<T>(document: MongoDocument<T>): T {
  const rest = { ...document };
  delete rest._id;
  return rest as T;
}

function toPlainArray<T>(documents: MongoDocument<T>[]) {
  return documents.map((document) => toPlainObject(document));
}

function getSettingsId(userId: string) {
  return `wallet-settings:${userId}`;
}

function getSeedStateId(userId: string) {
  return `wallet-seed:${userId}`;
}

function calculateChangePercent(chartPoints: OwnedChartPoint[]) {
  if (chartPoints.length < 2) {
    return 0;
  }

  const sortedPoints = [...chartPoints].sort((left, right) => left.sortOrder - right.sortOrder);
  const previousAmount = sortedPoints.at(-2)?.amount ?? 0;
  const latestAmount = sortedPoints.at(-1)?.amount ?? 0;

  if (previousAmount <= 0) {
    return 0;
  }

  return Math.round((((latestAmount - previousAmount) / previousAmount) * 100) * 10) / 10;
}

function createOpeningBalanceTransaction(
  userId: string,
  walletId: string,
  walletName: string,
  amount: number,
  currency: WalletAccount['currency']
): OwnedTransaction {
  return {
    ownerId: userId,
    id: `tx-${randomUUID()}`,
    type: 'deposit',
    description: `Opening balance for ${walletName}`,
    amount,
    currency,
    status: 'Success',
    date: new Date().toISOString(),
    walletId,
  };
}

async function getCollections() {
  const db = await getDb();

  return {
    walletAccounts: db.collection<OwnedWalletAccount>('walletAccounts'),
    bankAccounts: db.collection<OwnedBankAccount>('bankAccounts'),
    transactions: db.collection<OwnedTransaction>('transactions'),
    chartData: db.collection<OwnedChartPoint>('chartData'),
    settings: db.collection<OwnedSettings>('settings'),
    metadata: db.collection<OwnedSeedState>('metadata'),
  };
}

async function dropLegacyUniqueIndex<T extends Document>(
  collection: Collection<T>,
  keyPattern: Record<string, 1 | -1>
) {
  const indexes = await collection.listIndexes().toArray();
  const legacyIndex = indexes.find((index) => {
    const keys = Object.entries(index.key);
    const expectedKeys = Object.entries(keyPattern);

    return (
      index.unique === true &&
      keys.length === expectedKeys.length &&
      expectedKeys.every(([key, direction]) => index.key[key] === direction)
    );
  });

  if (!legacyIndex || legacyIndex.name === '_id_') {
    return;
  }

  await collection.dropIndex(legacyIndex.name);
}

async function migrateLegacyIndexes(collections: Awaited<ReturnType<typeof getCollections>>) {
  await Promise.all([
    dropLegacyUniqueIndex(collections.walletAccounts, { id: 1 }),
    dropLegacyUniqueIndex(collections.bankAccounts, { id: 1 }),
    dropLegacyUniqueIndex(collections.transactions, { id: 1 }),
    dropLegacyUniqueIndex(collections.chartData, { date: 1 }),
  ]);
}

async function initializeCollections() {
  const collections = await getCollections();

  await migrateLegacyIndexes(collections);

  await Promise.all([
    collections.walletAccounts.createIndex({ ownerId: 1, id: 1 }, { unique: true }),
    collections.bankAccounts.createIndex({ ownerId: 1, id: 1 }, { unique: true }),
    collections.transactions.createIndex({ ownerId: 1, id: 1 }, { unique: true }),
    collections.chartData.createIndex({ ownerId: 1, date: 1 }, { unique: true }),
    collections.settings.createIndex({ ownerId: 1 }, { unique: true }),
    collections.metadata.createIndex({ ownerId: 1 }, { unique: true }),
  ]);
}

async function ensureCollections() {
  if (!initPromise) {
    initPromise = initializeCollections().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
  return getCollections();
}

async function getWalletTotal(userId: string, walletAccountsCollection: Collection<OwnedWalletAccount>) {
  const walletAccounts = await walletAccountsCollection.find({ ownerId: userId }).toArray();
  return toPlainArray(walletAccounts).reduce((sum, wallet) => sum + wallet.balance, 0);
}

async function syncChartWithTotal(
  userId: string,
  walletAccountsCollection: Collection<OwnedWalletAccount>,
  chartDataCollection: Collection<OwnedChartPoint>
) {
  const total = await getWalletTotal(userId, walletAccountsCollection);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const existingPoint = await chartDataCollection.findOne({ ownerId: userId, date: today });

  if (existingPoint) {
    await chartDataCollection.updateOne(
      { ownerId: userId, date: today },
      { $set: { amount: total } }
    );
  } else {
    const latestPoint = await chartDataCollection
      .find({ ownerId: userId })
      .sort({ sortOrder: -1 })
      .limit(1)
      .next();

    await chartDataCollection.insertOne({
      ownerId: userId,
      date: today,
      amount: total,
      sortOrder: (latestPoint?.sortOrder ?? -1) + 1,
    });
  }

  const allPoints = await chartDataCollection.find({ ownerId: userId }).sort({ sortOrder: 1 }).toArray();

  if (allPoints.length > 15) {
    const overflowDates = allPoints
      .slice(0, allPoints.length - 15)
      .map((point) => point.date);

    if (overflowDates.length > 0) {
      await chartDataCollection.deleteMany({ ownerId: userId, date: { $in: overflowDates } });
    }
  }
}

async function getBankAccountsWithNormalizedSelection(
  userId: string,
  bankAccountsCollection: Collection<OwnedBankAccount>
) {
  const bankAccounts = await bankAccountsCollection.find({ ownerId: userId }).sort({ createdAt: 1 }).toArray();

  if (bankAccounts.length === 0) {
    return bankAccounts;
  }

  const selectedAccounts = bankAccounts.filter((account) => account.isSelected);

  if (selectedAccounts.length === 1) {
    return bankAccounts;
  }

  const selectedId = selectedAccounts[0]?.id ?? bankAccounts[0].id;

  await bankAccountsCollection.updateMany({ ownerId: userId }, { $set: { isSelected: false } });
  await bankAccountsCollection.updateOne({ ownerId: userId, id: selectedId }, { $set: { isSelected: true } });

  return bankAccounts.map((account) => ({
    ...account,
    isSelected: account.id === selectedId,
  }));
}

export async function ensureUserSeedData(userId: string) {
  const collections = await ensureCollections();
  const seedStateId = getSeedStateId(userId);

  await Promise.all([
    collections.settings.updateOne(
      { _id: getSettingsId(userId) },
      {
        $setOnInsert: {
          _id: getSettingsId(userId),
          ownerId: userId,
          ...settingsSeed,
        },
      },
      { upsert: true }
    ),
    collections.metadata.updateOne(
      { _id: seedStateId },
      {
        $setOnInsert: {
          _id: seedStateId,
          ownerId: userId,
          seededAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    ),
  ]);
}

export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const collections = await ensureCollections();
  const [walletAccounts, settings, chartPoints] = await Promise.all([
    collections.walletAccounts.find({ ownerId: userId }).toArray(),
    collections.settings.findOne({ _id: getSettingsId(userId) }),
    collections.chartData.find({ ownerId: userId }).toArray(),
  ]);

  const total = toPlainArray(walletAccounts).reduce((sum, wallet) => sum + wallet.balance, 0);

  return {
    totalBalance: total,
    currency: 'USD',
    changePercent: calculateChangePercent(chartPoints),
    referral: settings?.referral ?? settingsSeed.referral,
    bonus: settings?.bonus ?? settingsSeed.bonus,
  };
}

export async function addWalletAccount(
  userId: string,
  data: Pick<WalletAccount, 'name' | 'balance' | 'currency'>
): Promise<WalletAccount> {
  const collections = await ensureCollections();
  const openingBalance = Number.isFinite(data.balance) && data.balance >= 0 ? data.balance : 0;
  const wallet: OwnedWalletAccount = {
    ownerId: userId,
    id: `wa-${randomUUID()}`,
    name: data.name.trim(),
    balance: openingBalance,
    currency: data.currency,
    change: 0,
    createdAt: new Date().toISOString(),
  };

  await collections.walletAccounts.insertOne(wallet);

  if (openingBalance > 0) {
    await collections.transactions.insertOne(
      createOpeningBalanceTransaction(userId, wallet.id, wallet.name, openingBalance, wallet.currency)
    );
  }

  const hasChartHistory = await collections.chartData.findOne({ ownerId: userId }, { projection: { _id: 1 } });

  if (openingBalance > 0 || hasChartHistory) {
    await syncChartWithTotal(userId, collections.walletAccounts, collections.chartData);
  }

  return toPlainObject(wallet);
}

export async function deleteWalletAccount(userId: string, id: string): Promise<boolean> {
  const collections = await ensureCollections();
  const existingWallet = await collections.walletAccounts.findOne({ ownerId: userId, id });

  if (!existingWallet) {
    return false;
  }

  await Promise.all([
    collections.walletAccounts.deleteOne({ ownerId: userId, id }),
    collections.transactions.deleteMany({ ownerId: userId, walletId: id }),
  ]);

  const remainingWallets = await collections.walletAccounts.countDocuments({ ownerId: userId });

  if (remainingWallets === 0) {
    await collections.chartData.deleteMany({ ownerId: userId });
  } else {
    await syncChartWithTotal(userId, collections.walletAccounts, collections.chartData);
  }

  return true;
}

export async function deposit(
  userId: string,
  walletId: string,
  bankAccountId: string,
  amount: number,
  currency: string
): Promise<{ wallet: WalletAccount; bankAccount: BankAccount }> {
  const collections = await ensureCollections();
  const [existingWallet, existingBankAccount] = await Promise.all([
    collections.walletAccounts.findOne({ ownerId: userId, id: walletId }),
    collections.bankAccounts.findOne({ ownerId: userId, id: bankAccountId }),
  ]);

  if (!existingWallet) {
    throw new Error('Wallet not found');
  }

  if (!existingBankAccount) {
    throw new Error('Bank account not found');
  }

  if (existingBankAccount.balance < amount) {
    throw new Error('Insufficient bank balance');
  }

  const updatedBankAccount = await collections.bankAccounts.findOneAndUpdate(
    { ownerId: userId, id: bankAccountId, balance: { $gte: amount } },
    {
      $inc: { balance: -amount },
      $set: { isSelected: true },
    },
    { returnDocument: 'after' }
  );

  if (!updatedBankAccount) {
    throw new Error('Insufficient bank balance');
  }

  await collections.bankAccounts.updateMany(
    { ownerId: userId, id: { $ne: bankAccountId } },
    { $set: { isSelected: false } }
  );

  const updatedWallet = await collections.walletAccounts.findOneAndUpdate(
    { ownerId: userId, id: walletId },
    { $inc: { balance: amount } },
    { returnDocument: 'after' }
  );

  if (!updatedWallet) {
    await collections.bankAccounts.updateOne(
      { ownerId: userId, id: bankAccountId },
      { $inc: { balance: amount } }
    );
    throw new Error('Wallet not found');
  }

  const transaction: OwnedTransaction = {
    ownerId: userId,
    id: `tx-${randomUUID()}`,
    type: 'deposit',
    description: `Transferred from ${updatedBankAccount.bankName} to ${updatedWallet.name}`,
    amount,
    currency: currency as Transaction['currency'],
    status: 'Success',
    date: new Date().toISOString(),
    walletId,
    bankAccountId,
  };

  await collections.transactions.insertOne(transaction);
  await syncChartWithTotal(userId, collections.walletAccounts, collections.chartData);

  return {
    wallet: toPlainObject(updatedWallet),
    bankAccount: toPlainObject(updatedBankAccount),
  };
}

export async function withdraw(
  userId: string,
  walletId: string,
  amount: number,
  currency: string
): Promise<WalletAccount> {
  const collections = await ensureCollections();
  const existingWallet = await collections.walletAccounts.findOne({ ownerId: userId, id: walletId });

  if (!existingWallet) {
    throw new Error('Wallet not found');
  }

  if (existingWallet.balance < amount) {
    throw new Error('Insufficient balance');
  }

  const updatedWallet = await collections.walletAccounts.findOneAndUpdate(
    { ownerId: userId, id: walletId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { returnDocument: 'after' }
  );

  if (!updatedWallet) {
    throw new Error('Insufficient balance');
  }

  const transaction: OwnedTransaction = {
    ownerId: userId,
    id: `tx-${randomUUID()}`,
    type: 'withdrawal',
    description: 'Withdrawn',
    amount,
    currency: currency as Transaction['currency'],
    status: 'Success',
    date: new Date().toISOString(),
    walletId,
  };

  await collections.transactions.insertOne(transaction);
  await syncChartWithTotal(userId, collections.walletAccounts, collections.chartData);

  return toPlainObject(updatedWallet);
}

export async function getBankAccounts(userId: string): Promise<BankAccount[]> {
  const collections = await ensureCollections();
  const bankAccounts = await getBankAccountsWithNormalizedSelection(userId, collections.bankAccounts);
  return toPlainArray(bankAccounts);
}

export async function addBankAccount(
  userId: string,
  data: Omit<BankAccount, 'id' | 'createdAt' | 'change' | 'isSelected'> & { balance: number }
): Promise<BankAccount> {
  const collections = await ensureCollections();
  const existingAccounts = await collections.bankAccounts.countDocuments({ ownerId: userId });
  const openingBalance = Number.isFinite(data.balance) && data.balance >= 0 ? data.balance : 0;
  const account: OwnedBankAccount = {
    ownerId: userId,
    id: `ba-${randomUUID()}`,
    ...data,
    balance: openingBalance,
    change: 0,
    isSelected: existingAccounts === 0,
    createdAt: new Date().toISOString(),
  };

  await collections.bankAccounts.insertOne(account);
  return toPlainObject(account);
}

export async function deleteBankAccount(userId: string, id: string): Promise<boolean> {
  const collections = await ensureCollections();
  const existingAccount = await collections.bankAccounts.findOne({ ownerId: userId, id });

  if (!existingAccount) {
    return false;
  }

  const result = await collections.bankAccounts.deleteOne({ ownerId: userId, id });

  if (result.deletedCount > 0 && existingAccount.isSelected) {
    await getBankAccountsWithNormalizedSelection(userId, collections.bankAccounts);
  }

  return result.deletedCount > 0;
}

export async function selectBankAccount(userId: string, id: string): Promise<BankAccount> {
  const collections = await ensureCollections();
  const existingAccount = await collections.bankAccounts.findOne({ ownerId: userId, id });

  if (!existingAccount) {
    throw new Error('Bank account not found');
  }

  await collections.bankAccounts.updateMany(
    { ownerId: userId, id: { $ne: id } },
    { $set: { isSelected: false } }
  );

  const updatedAccount = await collections.bankAccounts.findOneAndUpdate(
    { ownerId: userId, id },
    { $set: { isSelected: true } },
    { returnDocument: 'after' }
  );

  if (!updatedAccount) {
    throw new Error('Bank account not found');
  }

  return toPlainObject(updatedAccount);
}

export async function getTransactions(
  userId: string,
  type?: string,
  page = 1,
  limit = 20
): Promise<{ transactions: Transaction[]; total: number }> {
  const collections = await ensureCollections();
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;
  const filter: Filter<OwnedTransaction> = { ownerId: userId };

  if (type === 'deposit' || type === 'withdrawal') {
    filter.type = type;
  }

  const [transactions, total] = await Promise.all([
    collections.transactions
      .find(filter)
      .sort({ date: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .toArray(),
    collections.transactions.countDocuments(filter),
  ]);

  return {
    transactions: toPlainArray(transactions),
    total,
  };
}

export async function getWalletAccounts(userId: string): Promise<WalletAccount[]> {
  const collections = await ensureCollections();
  const walletAccounts = await collections.walletAccounts.find({ ownerId: userId }).sort({ createdAt: 1 }).toArray();
  return toPlainArray(walletAccounts);
}

export async function getChartData(userId: string): Promise<ChartDataPoint[]> {
  const collections = await ensureCollections();
  const chartPoints = await collections.chartData.find({ ownerId: userId }).sort({ sortOrder: 1 }).toArray();

  return chartPoints.map((point) => ({
    date: point.date,
    amount: point.amount,
  }));
}
