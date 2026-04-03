import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import styles from './layout.module.css';
import Navbar from '@/features/layout/components/Navbar';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from '@/features/wallet/context/WalletContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'WalletDash — Smart Wallet Management',
  description: 'Manage your wallet balances, bank accounts, and transaction history in one elegant dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={styles.body}>
        <Toaster position="top-center" />
        <WalletProvider>
          <Navbar />
          <main className={styles.main}>
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}
