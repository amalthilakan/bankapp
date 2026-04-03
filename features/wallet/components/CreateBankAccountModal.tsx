'use client';

import { X, Building2 } from 'lucide-react';
import { useState } from 'react';

import { useWallet } from '@/features/wallet/context/WalletContext';
import type { Currency } from '@/shared/types';

import styles from './Modal.module.css';

interface CreateBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'INR'];
const POPULAR_BANKS = ['Citi Bank', 'Barclays Bank', 'Axis Bank', 'HDFC Bank', 'Chase Bank', 'Wells Fargo', 'Bank of America', 'Other'];

function formatCurrencyAmount(amount: number) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CreateBankAccountModal({ isOpen, onClose }: CreateBankAccountModalProps) {
  const { addBankAccount } = useWallet();
  const [bankName, setBankName] = useState('');
  const [customBank, setCustomBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) {
    return null;
  }

  const finalBankName = bankName === 'Other' ? customBank.trim() : bankName;
  const maskedAccount = accountNumber ? `****${accountNumber.slice(-4)}` : '';
  const openingBalance = balance === '' ? 0 : Number(balance);

  const resetForm = () => {
    setBankName('');
    setCustomBank('');
    setAccountNumber('');
    setAccountHolder('');
    setBalance('');
    setCurrency('USD');
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!finalBankName) {
      setError('Please enter a bank name');
      return;
    }

    if (!accountNumber || accountNumber.length < 4) {
      setError('Account number must be at least 4 digits');
      return;
    }

    if (!accountHolder.trim()) {
      setError('Account holder name is required');
      return;
    }

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setError('Opening balance must be a valid non-negative number');
      return;
    }

    setLoading(true);

    try {
      await addBankAccount({
        bankName: finalBankName,
        accountNumber: maskedAccount,
        accountHolder: accountHolder.trim(),
        currency,
        balance: openingBalance,
      });
      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
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
            <div className={`${styles.iconWrapper} ${styles.iconWrapperBlue}`}>
              <Building2 className={`${styles.icon} ${styles.iconBlue}`} />
            </div>
            <div>
              <h2 className={styles.title}>Add Bank Account</h2>
              <p className={styles.subtitle}>Create a bank account with an opening balance</p>
            </div>
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>
            <X className={styles.closeIcon} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Bank Name</label>
            <select
              id="bank-name-select"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              className={styles.select}
            >
              <option value="">Select a bank...</option>
              {POPULAR_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          {bankName === 'Other' && (
            <div className={styles.field}>
              <label className={styles.label}>Custom Bank Name</label>
              <input
                type="text"
                value={customBank}
                onChange={(event) => setCustomBank(event.target.value)}
                placeholder="Enter bank name"
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Account Holder Name</label>
            <input
              id="account-holder-input"
              type="text"
              value={accountHolder}
              onChange={(event) => setAccountHolder(event.target.value)}
              placeholder="Full name as on account"
              className={styles.input}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldFlex}>
              <label className={styles.label}>Account Number</label>
              <input
                id="account-number-input"
                type="text"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ''))}
                placeholder="XXXXXXXXXXXXXXXX"
                maxLength={16}
                className={`${styles.input} ${styles.inputMono}`}
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

          <div className={styles.field}>
            <label className={styles.label}>Opening Balance</label>
            <input
              id="bank-balance-input"
              type="number"
              min="0"
              step="0.01"
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              placeholder="0.00"
              className={styles.input}
            />
          </div>

          {finalBankName && accountNumber.length >= 4 && (
            <div className={styles.preview}>
              <p className={styles.previewLabel}>Preview</p>
              <p className={styles.previewName}>{finalBankName}</p>
              <p className={styles.previewMeta}>
                {maskedAccount} | {currency} | ${formatCurrencyAmount(Number.isFinite(openingBalance) ? openingBalance : 0)}
              </p>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button
            id="add-bank-submit-btn"
            type="submit"
            disabled={loading || success}
            className={`${styles.submitBtn} ${success ? styles.submitSuccess : ''}`}
          >
            {success ? 'Bank Account Added' : loading ? 'Adding...' : 'Add Bank Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
