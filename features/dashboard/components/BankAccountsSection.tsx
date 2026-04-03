'use client';

import { Plus } from 'lucide-react';

import { useWallet } from '@/features/wallet/context/WalletContext';

import BankAccountCard from './BankAccountCard';
import styles from './BankAccountsSection.module.css';

interface BankAccountsSectionProps {
  onAddBankAccount: () => void;
}

export default function BankAccountsSection({ onAddBankAccount }: BankAccountsSectionProps) {
  const { bankAccounts, loading } = useWallet();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Associated Bank Accounts</h2>
        <button onClick={onAddBankAccount} className={styles.actionBtn}>
          <Plus className={styles.actionIcon} />
          Add Bank
        </button>
      </div>

      <div className={styles.scrollArea}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))
          : bankAccounts.length === 0
            ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>No bank accounts yet</p>
                <p className={styles.emptyText}>Add a linked bank account and set its starting balance when you create it.</p>
                <button onClick={onAddBankAccount} className={styles.emptyBtn}>
                  Add First Bank Account
                </button>
              </div>
            )
          : bankAccounts.map((account) => (
              <BankAccountCard
                key={account.id}
                account={account}
                isSelected={account.isSelected}
              />
            ))}
      </div>
    </div>
  );
}
