import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import AuthForm from '@/features/auth/components/AuthForm';
import { getCurrentUser } from '@/server/auth/service';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Login - WalletDash',
  description: 'Sign in or create an account to access your wallet dashboard.',
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/');
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>WalletDash</p>
          <h2 className={styles.heroTitle}>Secure multi-user wallet access with MongoDB-backed data.</h2>
          <p className={styles.heroText}>
            Sign in to your own dashboard or create a new account. Wallet balances, linked bank
            accounts, and transaction history stay scoped to the signed-in user.
          </p>
          <div className={styles.heroPanel}>
            <div>
              <p className={styles.panelValue}>Isolated data</p>
              <p className={styles.panelLabel}>Every user works inside their own seeded wallet profile.</p>
            </div>
            <div>
              <p className={styles.panelValue}>Persistent sessions</p>
              <p className={styles.panelLabel}>Secure HTTP-only cookies keep users signed in across requests.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.formWrap}>
        <AuthForm />
      </section>
    </div>
  );
}
