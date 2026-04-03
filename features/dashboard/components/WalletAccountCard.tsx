'use client';

import { MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useWallet } from '@/features/wallet/context/WalletContext';
import type { WalletAccount } from '@/shared/types';

import styles from './WalletAccountCard.module.css';

interface WalletAccountCardProps {
  wallet: WalletAccount;
}

export default function WalletAccountCard({ wallet }: WalletAccountCardProps) {
  const { removeWalletAccount } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const changeText = wallet.change === 0
    ? wallet.balance > 0
      ? 'Opening balance'
      : 'No activity yet'
    : `+${wallet.change.toLocaleString()} since last hour`;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeWalletAccount(wallet.id);
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.name}>{wallet.name}</span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((current) => !current);
          }}
          className={styles.moreBtn}
        >
          <MoreVertical className={styles.moreIcon} />
        </button>
      </div>
      <p className={styles.balance}>{wallet.balance.toLocaleString('en-US')}</p>
      <p className={styles.change}>{changeText}</p>

      {menuOpen && (
        <div className={styles.dropdown}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={styles.removeBtn}
          >
            <Trash2 className={styles.removeIcon} />
            {deleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      )}
    </div>
  );
}
