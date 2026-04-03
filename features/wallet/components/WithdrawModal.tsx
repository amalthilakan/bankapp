'use client';

import { X, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useWallet } from '@/features/wallet/context/WalletContext';
import { toast } from 'react-hot-toast';
import type { Currency } from '@/shared/types';
import styles from './Modal.module.css';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'INR'];

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { walletAccounts, withdrawFunds } = useWallet();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [walletId, setWalletId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const selectedWallet = walletAccounts.find((w) => w.id === walletId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId) { toast.error('Please select a wallet'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (selectedWallet && Number(amount) > selectedWallet.balance) {
      toast.error(`Insufficient balance. Available: $${selectedWallet.balance.toLocaleString()}`);
      return;
    }

    setLoading(true);
    try {
      await withdrawFunds(walletId, Number(amount), currency);
      setSuccess(true);
      toast.success('Funds withdrawn successfully!');
      setTimeout(() => { setSuccess(false); onClose(); resetForm(); }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => { setAmount(''); setWalletId(''); setCurrency('USD'); };

  const handleClose = () => { resetForm(); onClose(); };

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={handleClose} />

      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={`${styles.iconWrapper} ${styles.iconWrapperWithdraw}`}>
              <ArrowUpRight className={`${styles.icon} ${styles.iconWithdraw}`} />
            </div>
            <div>
              <h2 className={styles.title}>Withdraw Funds</h2>
              <p className={styles.subtitle}>Transfer money from your wallet</p>
            </div>
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>
            <X className={styles.closeIcon} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Wallet Select */}
          <div className={styles.field}>
            <label className={styles.label}>From Wallet</label>
            <select
              id="withdraw-wallet-select"
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

          {/* Available Balance */}
          {selectedWallet && (
            <div className={styles.availableBalance}>
              <span className={styles.balanceLabel}>Available Balance</span>
              <span className={styles.balanceValue}>${selectedWallet.balance.toLocaleString()}</span>
            </div>
          )}

          {/* Amount + Currency */}
          <div className={styles.field}>
            <label className={styles.label}>Amount</label>
            <div className={styles.inputContainer}>
              <input
                id="withdraw-amount-input"
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



          {/* Submit */}
          <button
            id="withdraw-submit-btn"
            type="submit"
            disabled={loading || success}
            className={`${styles.submitBtn} ${success ? styles.submitSuccess : ''}`}
          >
            {success ? '✓ Withdrawn Successfully!' : loading ? 'Processing...' : 'Confirm Withdrawal'}
          </button>
        </form>
      </div>
    </div>
  );
}
