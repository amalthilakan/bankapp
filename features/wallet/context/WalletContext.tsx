'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type {
  WalletAccount,
  BankAccount,
  Transaction,
  WalletSummary,
  ChartDataPoint,
  Currency,
} from '@/shared/types';

// ─── State ────────────────────────────────────────────────────────────────────

interface WalletState {
  summary: WalletSummary | null;
  walletAccounts: WalletAccount[];
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  chartData: ChartDataPoint[];
  loading: boolean;
  error: string | null;
}

const initialState: WalletState = {
  summary: null,
  walletAccounts: [],
  bankAccounts: [],
  transactions: [],
  chartData: [],
  loading: true,
  error: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_WALLET_DATA'; payload: { summary: WalletSummary; walletAccounts: WalletAccount[]; chartData: ChartDataPoint[] } }
  | { type: 'SET_BANK_ACCOUNTS'; payload: BankAccount[] }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_BANK_ACCOUNT'; payload: BankAccount }
  | { type: 'REMOVE_BANK_ACCOUNT'; payload: string }
  | { type: 'REMOVE_WALLET'; payload: string }
  | { type: 'UPDATE_WALLET'; payload: WalletAccount }
  | { type: 'ADD_TRANSACTION'; payload: Transaction };

function reducer(state: WalletState, action: Action): WalletState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_WALLET_DATA':
      return {
        ...state,
        summary: action.payload.summary,
        walletAccounts: action.payload.walletAccounts,
        chartData: action.payload.chartData,
        loading: false,
      };
    case 'SET_BANK_ACCOUNTS':
      return { ...state, bankAccounts: action.payload };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'ADD_BANK_ACCOUNT':
      return { ...state, bankAccounts: [...state.bankAccounts, action.payload] };
    case 'REMOVE_BANK_ACCOUNT':
      return { ...state, bankAccounts: state.bankAccounts.filter((a) => a.id !== action.payload) };
    case 'REMOVE_WALLET':
      return { ...state, walletAccounts: state.walletAccounts.filter((wallet) => wallet.id !== action.payload) };
    case 'UPDATE_WALLET':
      return {
        ...state,
        walletAccounts: state.walletAccounts.map((w) =>
          w.id === action.payload.id ? action.payload : w
        ),
        summary: state.summary
          ? {
              ...state.summary,
              totalBalance: state.walletAccounts.reduce((sum, w) =>
                w.id === action.payload.id ? sum + action.payload.balance : sum + w.balance, 0
              ),
            }
          : null,
      };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface WalletContextValue extends WalletState {
  fetchWalletData: () => Promise<void>;
  fetchBankAccounts: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  depositFunds: (walletId: string, bankAccountId: string, amount: number, currency: string) => Promise<void>;
  withdrawFunds: (walletId: string, amount: number, currency: string) => Promise<void>;
  addWalletAccount: (data: { name: string; balance: number; currency: Currency }) => Promise<void>;
  addBankAccount: (data: { bankName: string; accountNumber: string; accountHolder: string; currency: Currency; balance: number }) => Promise<void>;
  selectBankAccount: (id: string) => Promise<void>;
  removeBankAccount: (id: string) => Promise<void>;
  removeWalletAccount: (id: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const pathname = usePathname();
  const router = useRouter();

  const handleUnauthorized = useCallback(() => {
    router.replace('/login');
    router.refresh();
  }, [router]);

  const fetchWalletData = useCallback(async () => {
    if (pathname === '/login') {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch('/api/wallet');
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (json.success) {
        dispatch({ type: 'SET_WALLET_DATA', payload: json.data });
      }
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load wallet data' });
    }
  }, [handleUnauthorized, pathname]);

  const fetchBankAccounts = useCallback(async () => {
    if (pathname === '/login') {
      return;
    }

    try {
      const res = await fetch('/api/accounts');
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (json.success) dispatch({ type: 'SET_BANK_ACCOUNTS', payload: json.data });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load bank accounts' });
    }
  }, [handleUnauthorized, pathname]);

  const fetchTransactions = useCallback(async () => {
    if (pathname === '/login') {
      return;
    }

    try {
      const res = await fetch('/api/transactions');
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (json.success) dispatch({ type: 'SET_TRANSACTIONS', payload: json.data });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load transactions' });
    }
  }, [handleUnauthorized, pathname]);

  const depositFunds = useCallback(async (walletId: string, bankAccountId: string, amount: number, currency: string) => {
    const res = await fetch('/api/wallet/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, bankAccountId, amount, currency }),
    });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Deposit failed');
    dispatch({ type: 'UPDATE_WALLET', payload: json.data.wallet });
    await Promise.all([fetchTransactions(), fetchWalletData(), fetchBankAccounts()]);
  }, [fetchBankAccounts, fetchTransactions, fetchWalletData, handleUnauthorized]);

  const withdrawFunds = useCallback(async (walletId: string, amount: number, currency: string) => {
    const res = await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, amount, currency }),
    });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Withdrawal failed');
    dispatch({ type: 'UPDATE_WALLET', payload: json.data });
    await fetchTransactions();
    await fetchWalletData();
  }, [fetchTransactions, fetchWalletData, handleUnauthorized]);

  const addWalletAccount = useCallback(async (data: { name: string; balance: number; currency: Currency }) => {
    const res = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create wallet');
    await fetchWalletData();
    await fetchTransactions();
  }, [fetchTransactions, fetchWalletData, handleUnauthorized]);

  const addBankAccount = useCallback(async (data: { bankName: string; accountNumber: string; accountHolder: string; currency: Currency; balance: number }) => {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to add account');
    dispatch({ type: 'ADD_BANK_ACCOUNT', payload: json.data });
  }, [handleUnauthorized]);

  const selectBankAccount = useCallback(async (id: string) => {
    const res = await fetch(`/api/accounts/${id}`, { method: 'PATCH' });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to select bank account');
    await fetchBankAccounts();
  }, [fetchBankAccounts, handleUnauthorized]);

  const removeBankAccount = useCallback(async (id: string) => {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to remove account');
    await fetchBankAccounts();
  }, [fetchBankAccounts, handleUnauthorized]);

  const removeWalletAccount = useCallback(async (id: string) => {
    const res = await fetch(`/api/wallet/${id}`, { method: 'DELETE' });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to remove wallet');
    dispatch({ type: 'REMOVE_WALLET', payload: id });
    await fetchTransactions();
    await fetchWalletData();
  }, [fetchTransactions, fetchWalletData, handleUnauthorized]);

  useEffect(() => {
    if (pathname === '/login') {
      return;
    }

    fetchWalletData();
    fetchBankAccounts();
    fetchTransactions();
  }, [fetchWalletData, fetchBankAccounts, fetchTransactions, pathname]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        fetchWalletData,
        fetchBankAccounts,
        fetchTransactions,
        depositFunds,
        withdrawFunds,
        addWalletAccount,
        addBankAccount,
        selectBankAccount,
        removeBankAccount,
        removeWalletAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
