'use client';

import { MoreHorizontal, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useWallet } from '@/features/wallet/context/WalletContext';
import type { Transaction } from '@/shared/types';
import styles from './TransactionHistory.module.css';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function StatusBadge({ status }: { status: Transaction['status'] }) {
  const statusClass = 
    status === 'Success' ? styles.statusSuccess :
    status === 'Pending' ? styles.statusPending :
    styles.statusFailed;

  return <span className={statusClass}>{status}</span>;
}

function TransactionItem({ tx }: { tx: Transaction }) {
  const isDeposit = tx.type === 'deposit';
  return (
    <div className={styles.item}>
      <div className={styles.itemHeader}>
        <div className={styles.itemInfo}>
          <div className={`${styles.iconWrapper} ${isDeposit ? styles.iconDeposit : styles.iconWithdraw}`}>
            {isDeposit
              ? <ArrowDownLeft className={styles.iconSvgDeposit} />
              : <ArrowUpRight className={styles.iconSvgWithdraw} />
            }
          </div>
          <span className={styles.itemDesc}>{tx.description}</span>
        </div>
        <StatusBadge status={tx.status} />
      </div>
      <p className={styles.amount}>
        {isDeposit ? '+' : ''}{tx.amount.toLocaleString('en-US')} {' '}
        <span className={styles.currency}>{tx.currency}</span>
      </p>
      <p className={styles.date}>{formatDate(tx.date)}</p>
    </div>
  );
}

export default function TransactionHistory() {
  const { transactions, loading } = useWallet();

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Transaction History</h2>
        <button className={styles.moreBtn}>
          <MoreHorizontal className={styles.moreIcon} />
        </button>
      </div>

      {/* List */}
      <div className={styles.list}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonItem}>
              <div className={styles.skeletonLine1} />
              <div className={styles.skeletonLine2} />
              <div className={styles.skeletonLine3} />
            </div>
          ))
        ) : transactions.length === 0 ? (
          <p className={styles.emptyText}>No transactions yet</p>
        ) : (
          transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
        )}
      </div>
    </div>
  );
}
