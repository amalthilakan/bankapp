'use client';

import { TrendingUp } from 'lucide-react';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  amount: number;
  currency?: string;
  changePercent?: number;
}

export default function StatCard({ title, amount, currency = 'USD', changePercent = 20.1 }: StatCardProps) {
  const format = (n: number) => n.toLocaleString('en-US');
  const hasChange = changePercent !== 0;

  return (
    <div className={styles.card}>
      <p className={styles.title}>{title}</p>
      <p className={styles.valueWrapper}>
        {format(amount)} <span className={styles.currency}>{currency}</span>
      </p>
      <div className={styles.changeWrapper}>
        {hasChange && <TrendingUp className={styles.changeIcon} />}
        <span className={styles.changeText}>
          {hasChange ? `+${changePercent}% from last month` : 'No activity yet'}
        </span>
      </div>
    </div>
  );
}
