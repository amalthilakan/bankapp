'use client';

import { MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { BankAccount } from '@/shared/types';
import { useWallet } from '@/features/wallet/context/WalletContext';

interface BankAccountCardProps {
  account: BankAccount;
  isSelected?: boolean;
}

import styles from './BankAccountCard.module.css';

export default function BankAccountCard({ account, isSelected }: BankAccountCardProps) {
  const { removeBankAccount } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const changeText = account.change === 0
    ? account.balance > 0
      ? 'Opening balance'
      : 'No activity yet'
    : `+${account.change.toLocaleString()} since last hour`;

  const format = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
    return n.toLocaleString('en-US');
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeBankAccount(account.id);
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.bankName}>{account.bankName}</span>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className={styles.moreBtn}
        >
          <MoreVertical className={styles.moreIcon} />
        </button>
      </div>

      {/* Balance */}
      <p className={`${styles.balance} ${isSelected ? styles.balanceSelected : styles.balanceDefault}`}>
        {format(account.balance)}
      </p>

      {/* Change */}
      <p className={styles.change}>{changeText}</p>

      {/* Dropdown */}
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
