'use client';

import { MoreHorizontal } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useWallet } from '@/features/wallet/context/WalletContext';
import styles from './WalletChart.module.css';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        <p className={styles.tooltipValue}>${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
}

export default function WalletChart() {
  const { chartData, loading } = useWallet();

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Overall Wallet Chart</h2>
          <p className={styles.subtitle}>Showing your wallet balances over time</p>
        </div>
        <button className={styles.moreBtn}>
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Chart — fixed height so ResponsiveContainer always gets positive dimensions */}
      <div className={styles.chartContainer}>
        {loading ? (
          <div className={styles.skeleton} />
        ) : chartData.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No wallet history yet</p>
            <p className={styles.emptyText}>Your chart will appear after you create a wallet with funds or make your first wallet transaction.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={chartData} barSize={10} barCategoryGap="20%">
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar
                dataKey="amount"
                fill="#4ade80"
                radius={[3, 3, 0, 0]}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
