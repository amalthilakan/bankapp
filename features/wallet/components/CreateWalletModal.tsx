'use client';

import { X, Wallet } from 'lucide-react';
import { useState } from 'react';

import { useWallet } from '@/features/wallet/context/WalletContext';
import { toast } from 'react-hot-toast';
import type { Currency } from '@/shared/types';

import styles from './Modal.module.css';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'INR'];

function formatCurrencyAmount(amount: number) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CreateWalletModal({ isOpen, onClose }: CreateWalletModalProps) {
  const { addWalletAccount } = useWallet();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) {
    return null;
  }

  const openingBalance = balance === '' ? 0 : Number(balance);

  const resetForm = () => {
    setName('');
    setBalance('');
    setCurrency('USD');
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error('Wallet name must be at least 2 characters long');
      return;
    }

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      toast.error('Opening balance must be a valid non-negative number');
      return;
    }

    setLoading(true);

    try {
      await addWalletAccount({
        name: name.trim(),
        balance: openingBalance,
        currency,
      });
      setSuccess(true);
      toast.success('Wallet created successfully!');
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={handleClose} />

      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={`${styles.iconWrapper} ${styles.iconWrapperAdd}`}>
              <Wallet className={`${styles.icon} ${styles.iconAdd}`} />
            </div>
            <div>
              <h2 className={styles.title}>Add Wallet</h2>
              <p className={styles.subtitle}>Create a wallet with an opening balance</p>
            </div>
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>
            <X className={styles.closeIcon} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Wallet Name</label>
            <input
              id="wallet-name-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Main wallet"
              className={styles.input}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldFlex}>
              <label className={styles.label}>Opening Balance</label>
              <input
                id="wallet-balance-input"
                type="number"
                min="0"
                step="0.01"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                placeholder="0.00"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Currency</label>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
                className={`${styles.select} ${styles.selectCurrency}`}
              >
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {name.trim() && (
            <div className={styles.preview}>
              <p className={styles.previewLabel}>Preview</p>
              <p className={styles.previewName}>{name.trim()}</p>
              <p className={styles.previewMeta}>
                ${formatCurrencyAmount(Number.isFinite(openingBalance) ? openingBalance : 0)} | {currency}
              </p>
            </div>
          )}



          <button
            id="add-wallet-submit-btn"
            type="submit"
            disabled={loading || success}
            className={`${styles.submitBtn} ${success ? styles.submitSuccess : ''}`}
          >
            {success ? 'Wallet Added' : loading ? 'Adding...' : 'Add Wallet'}
          </button>
        </form>
      </div>
    </div>
  );
}
