'use client';

import { MoreVertical } from 'lucide-react';
import type { WalletAccount } from '@/shared/types';
import styles from './WalletAccountCard.module.css';

interface WalletAccountCardProps {
  wallet: WalletAccount;
}

export default function WalletAccountCard({ wallet }: WalletAccountCardProps) {
  const changeText = wallet.change === 0
    ? wallet.balance > 0
      ? 'Opening balance'
      : 'No activity yet'
    : `+${wallet.change.toLocaleString()} since last hour`;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.name}>{wallet.name}</span>
        <button className={styles.moreBtn}>
          <MoreVertical className={styles.moreIcon} />
        </button>
      </div>
      <p className={styles.balance}>{wallet.balance.toLocaleString('en-US')}</p>
      <p className={styles.change}>{changeText}</p>
    </div>
  );
}
