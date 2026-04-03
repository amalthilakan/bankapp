export type Currency = 'USD' | 'GBP' | 'EUR' | 'INR';

export type TransactionType = 'deposit' | 'withdrawal';

export type TransactionStatus = 'Success' | 'Pending' | 'Failed';

export interface WalletAccount {
  id: string;
  name: string;
  balance: number;
  currency: Currency;
  change: number;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
  currency: Currency;
  change: number;
  isSelected?: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  date: string;
  walletId?: string;
  bankAccountId?: string;
}

export interface WalletSummary {
  totalBalance: number;
  currency: Currency;
  changePercent: number;
  referral: number;
  bonus: number;
}

export interface ChartDataPoint {
  date: string;
  amount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
