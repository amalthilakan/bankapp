'use client';

import { TrendingUp } from 'lucide-react';
import { useWallet } from '@/features/wallet/context/WalletContext';
import styles from './BalanceCard.module.css';

interface BalanceCardProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onAddWallet: () => void;
}

export default function BalanceCard({ onDeposit, onWithdraw, onAddWallet }: BalanceCardProps) {
  const { summary, loading, walletAccounts, bankAccounts } = useWallet();
  const hasWallets = walletAccounts.length > 0;
  const hasBankAccounts = bankAccounts.length > 0;
  const hasChange = (summary?.changePercent ?? 0) !== 0;

  const formatBalance = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className={styles.card}>
      
      {/* Title */}
      <p className={styles.title}>
        Total Balance
      </p>

      {/* Amount Section */}
      <div className={styles.amountSection}>
        {loading ? (
          <div className={styles.skeleton} />
        ) : (
          <h1 className={styles.balance}>
            ${formatBalance(summary?.totalBalance ?? 0)}
          </h1>
        )}

        <div className={styles.changeWrap}>
          {hasChange && <TrendingUp className={styles.changeIcon} />}
          <span className={styles.changeText}>
            {hasChange
              ? `${summary!.changePercent > 0 ? '+' : ''}${summary!.changePercent}% from recent activity`
              : 'Create a wallet to start tracking balance changes'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          id="btn-add-to-wallet"
          onClick={onDeposit}
          disabled={!hasWallets || !hasBankAccounts}
          className={styles.btnPrimary}
        >
          Add to wallet
        </button>

        <button
          id="btn-withdraw"
          onClick={onWithdraw}
          disabled={!hasWallets}
          className={styles.btnSecondary}
        >
          Withdraw
        </button>

        <button
          id="btn-add-wallet"
          onClick={onAddWallet}
          className={styles.btnTertiary}
        >
          New Wallet
        </button>
      </div>

      {!loading && !hasWallets && (
        <p className={styles.helperText}>
          Add your first wallet before depositing or withdrawing funds.
        </p>
      )}

      {!loading && hasWallets && !hasBankAccounts && (
        <p className={styles.helperText}>
          Add a bank account before moving money into your wallet.
        </p>
      )}
    </div>
  );
}
