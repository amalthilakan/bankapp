'use client';

import { Plus } from 'lucide-react';

import { useWallet } from '@/features/wallet/context/WalletContext';

import WalletAccountCard from './WalletAccountCard';
import styles from './WalletAccountsSection.module.css';

interface WalletAccountsSectionProps {
  onAddWallet: () => void;
}

export default function WalletAccountsSection({ onAddWallet }: WalletAccountsSectionProps) {
  const { walletAccounts, loading } = useWallet();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Wallet Accounts</h2>
        <button onClick={onAddWallet} className={styles.actionBtn}>
          <Plus className={styles.actionIcon} />
          Add Wallet
        </button>
      </div>

      <div className={styles.scrollArea}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))
          : walletAccounts.length === 0
            ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>No wallets yet</p>
                <p className={styles.emptyText}>Create your first wallet to start tracking balances and activity.</p>
                <button onClick={onAddWallet} className={styles.emptyBtn}>
                  Create First Wallet
                </button>
              </div>
            )
          : walletAccounts.map((wallet) => (
              <WalletAccountCard key={wallet.id} wallet={wallet} />
            ))}
      </div>
    </div>
  );
}
