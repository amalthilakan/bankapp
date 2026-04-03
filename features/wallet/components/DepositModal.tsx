'use client';

import { X, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWallet } from '@/features/wallet/context/WalletContext';
import { toast } from 'react-hot-toast';
import type { Currency } from '@/shared/types';
import styles from './Modal.module.css';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'INR'];

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { walletAccounts, bankAccounts, depositFunds } = useWallet();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [walletId, setWalletId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const preferredBankAccountId = bankAccounts.find((account) => account.isSelected)?.id ?? bankAccounts[0]?.id ?? '';

    setBankAccountId((current) => (
      bankAccounts.some((account) => account.id === current) ? current : preferredBankAccountId
    ));
  }, [bankAccounts, isOpen]);

  if (!isOpen) return null;

  const selectedBankAccount = bankAccounts.find((account) => account.id === bankAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountId) { toast.error('Please select a bank account'); return; }
    if (!walletId) { toast.error('Please select a wallet'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (selectedBankAccount && Number(amount) > selectedBankAccount.balance) {
      toast.error(`Insufficient bank balance. Available: $${selectedBankAccount.balance.toLocaleString()}`);
      return;
    }

    setLoading(true);
    try {
      await depositFunds(walletId, bankAccountId, Number(amount), currency);
      setSuccess(true);
      toast.success('Funds deposited successfully!');
      setTimeout(() => { setSuccess(false); onClose(); resetForm(); }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => { setAmount(''); setWalletId(''); setBankAccountId(''); setCurrency('USD'); };

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
              <p className={styles.subtitle}>Deposit funds into your wallet from a linked bank account</p>
            </div>
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>
            <X className={styles.closeIcon} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Bank Account Select */}
          <div className={styles.field}>
            <label className={styles.label}>From Bank Account</label>
            <select
              id="deposit-bank-account-select"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className={styles.select}
            >
              <option value="">Choose a bank account...</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.bankName} - ${account.balance.toLocaleString()}</option>
              ))}
            </select>
          </div>

          {selectedBankAccount && (
            <div className={styles.availableBalance}>
              <span className={styles.balanceLabel}>Available Bank Balance</span>
              <span className={styles.balanceValue}>${selectedBankAccount.balance.toLocaleString()}</span>
            </div>
          )}

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


          {/* Submit */}
          <button
            id="deposit-submit-btn"
            type="submit"
            disabled={loading || success || bankAccounts.length === 0}
            className={`${styles.submitBtn} ${success ? styles.submitSuccess : ''}`}
          >
            {success ? '✓ Deposited Successfully!' : loading ? 'Processing...' : 'Confirm Deposit'}
          </button>
        </form>
      </div>
    </div>
  );
}
