'use client';

import { MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { BankAccount } from '@/shared/types';
import { useWallet } from '@/features/wallet/context/WalletContext';
import styles from './BankAccountCard.module.css';

interface BankAccountCardProps {
  account: BankAccount;
  isSelected?: boolean;
}

export default function BankAccountCard({ account, isSelected }: BankAccountCardProps) {
  const { removeBankAccount, selectBankAccount } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selecting, setSelecting] = useState(false);
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

  const handleSelect = async () => {
    if (isSelected || selecting || deleting) {
      return;
    }

    setSelecting(true);
    try {
      await selectBankAccount(account.id);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-busy={selecting}
      onClick={() => {
        void handleSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void handleSelect();
        }
      }}
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
      <p className={styles.change}>
        {selecting ? 'Selecting funding account...' : isSelected ? 'Selected funding account' : changeText}
      </p>

      {/* Dropdown */}
      {menuOpen && (
        <div className={styles.dropdown}>
          <button
            onClick={(event) => {
              event.stopPropagation();
              void handleDelete();
            }}
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
