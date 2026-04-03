'use client';

import { X, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useWallet } from '@/features/wallet/context/WalletContext';
import type { Currency } from '@/shared/types';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'INR'];

import styles from './Modal.module.css';

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { walletAccounts, depositFunds } = useWallet();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [walletId, setWalletId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!walletId) { setError('Please select a wallet'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid amount'); return; }

    setLoading(true);
    try {
      await depositFunds(walletId, Number(amount), currency);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); resetForm(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => { setAmount(''); setWalletId(''); setCurrency('USD'); setError(''); };

  const handleClose = () => { resetForm(); onClose(); };

  return (
    <div className={styles.overlay}>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={handleClose} />

      {/* Modal */}
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.iconWrapper}>
              <Wallet className={styles.icon} />
            </div>
            <div>
              <h2 className={styles.title}>Add to Wallet</h2>
              <p className={styles.subtitle}>Deposit funds into your wallet</p>
            </div>
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>
            <X className={styles.closeIcon} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Wallet Select */}
          <div className={styles.field}>
            <label className={styles.label}>Select Wallet</label>
            <select
              id="deposit-wallet-select"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className={styles.select}
            >
              <option value="">Choose a wallet...</option>
              {walletAccounts.map((w) => (
                <option key={w.id} value={w.id}>{w.name} — ${w.balance.toLocaleString()}</option>
              ))}
            </select>
          </div>

          {/* Amount + Currency */}
          <div className={styles.field}>
            <label className={styles.label}>Amount</label>
            <div className={styles.inputContainer}>
              <input
                id="deposit-amount-input"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={styles.input}
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className={`${styles.select} ${styles.selectCurrency}`}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && <p className={styles.error}>{error}</p>}

          {/* Submit */}
          <button
            id="deposit-submit-btn"
            type="submit"
            disabled={loading || success}
            className={`${styles.submitBtn} ${success ? styles.submitSuccess : ''}`}
          >
            {success ? '✓ Deposited Successfully!' : loading ? 'Processing...' : 'Confirm Deposit'}
          </button>
        </form>
      </div>
    </div>
  );
}
