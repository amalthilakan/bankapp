'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { useWallet } from '@/features/wallet/context/WalletContext';
import BalanceCard from '@/features/dashboard/components/BalanceCard';
import StatCard from '@/features/dashboard/components/StatCard';
import WalletChart from '@/features/dashboard/components/WalletChart';
import BankAccountsSection from '@/features/dashboard/components/BankAccountsSection';
import WalletAccountsSection from '@/features/dashboard/components/WalletAccountsSection';
import TransactionHistory from '@/features/dashboard/components/TransactionHistory';
import DepositModal from '@/features/wallet/components/DepositModal';
import WithdrawModal from '@/features/wallet/components/WithdrawModal';
import CreateWalletModal from '@/features/wallet/components/CreateWalletModal';
import CreateBankAccountModal from '@/features/wallet/components/CreateBankAccountModal';

export default function DashboardPage() {
  const { summary } = useWallet();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [addWalletOpen, setAddWalletOpen] = useState(false);
  const [addBankAccountOpen, setAddBankAccountOpen] = useState(false);

  return (
    <div className={styles.page}>
      {/* Main Grid */}
      <div className={styles.grid}>

        {/* ─── Left Column ───────────────────────────────────────────── */}
        <div className={styles.leftCol}>

          {/* Top Row: Balance Card */}
          <BalanceCard
            onDeposit={() => setDepositOpen(true)}
            onWithdraw={() => setWithdrawOpen(true)}
            onAddWallet={() => setAddWalletOpen(true)}
          />

          {/* Stat Cards side by side */}
          <div className={styles.statRow}>
            <StatCard
              title="Referral"
              amount={summary?.referral ?? 0}
              currency="USD"
              changePercent={(summary?.referral ?? 0) > 0 ? 20.1 : 0}
            />
            <StatCard
              title="Bonus"
              amount={summary?.bonus ?? 0}
              currency="USD"
              changePercent={(summary?.bonus ?? 0) > 0 ? 20.1 : 0}
            />
          </div>

          {/* Bank Accounts */}
          <BankAccountsSection onAddBankAccount={() => setAddBankAccountOpen(true)} />

          {/* Wallet Accounts */}
          <WalletAccountsSection onAddWallet={() => setAddWalletOpen(true)} />
        </div>

        {/* ─── Right Column ──────────────────────────────────────────── */}
        <div className={styles.rightCol}>
          {/* Chart */}
          <div className={styles.chartCard}>
            <WalletChart />
          </div>

          {/* Transactions */}
          <div className={styles.txCard}>
            <TransactionHistory />
          </div>
        </div>
      </div>

      {/* Modals */}
      <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
      <CreateWalletModal isOpen={addWalletOpen} onClose={() => setAddWalletOpen(false)} />
      <CreateBankAccountModal isOpen={addBankAccountOpen} onClose={() => setAddBankAccountOpen(false)} />
    </div>
  );
}
