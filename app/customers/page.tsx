import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, Filter, Search, UserCheck, Users } from 'lucide-react';
import { requireAuthenticatedUser } from '@/server/auth/service';
import {
  getCustomers,
  normalizeCustomerStatus,
  type CustomerListItem,
  type CustomerStatus,
  type CustomerStatusFilter,
} from '@/server/customers/service';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Customers — WalletDash',
  description: 'Browse and manage registered customers in your wallet dashboard.',
};

interface CustomersPageProps {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
  }>;
}

const statusClasses: Record<CustomerStatus, string> = {
  Active: styles.statusActive,
  New: styles.statusNew,
  Idle: styles.statusIdle,
};

function getSingleSearchParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatJoinedDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildExportHref(query: string, status: CustomerStatusFilter) {
  const params = new URLSearchParams();

  if (query) {
    params.set('q', query);
  }

  if (status !== 'all') {
    params.set('status', status);
  }

  const search = params.toString();
  return search ? `/api/customers/export?${search}` : '/api/customers/export';
}

function getSummary(customers: CustomerListItem[]) {
  return {
    totalCustomers: customers.length,
    activeCustomers: customers.filter((customer) => customer.status === 'Active').length,
    newCustomers: customers.filter((customer) => customer.status === 'New').length,
  };
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const currentUser = await requireAuthenticatedUser();
  const resolvedSearchParams = await searchParams;
  const query = getSingleSearchParam(resolvedSearchParams.q).trim();
  const status = normalizeCustomerStatus(getSingleSearchParam(resolvedSearchParams.status));
  const customers = await getCustomers({ query, status });
  const summary = getSummary(customers);
  const hasFilters = query.length > 0 || status !== 'all';

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Customer Directory</p>
          <h1 className={styles.title}>Customers</h1>
          <p className={styles.subtitle}>
            Real registered users from your MongoDB database, with wallet totals and account activity.
          </p>
        </div>
        <div className={styles.heroActions}>
          <a href={buildExportHref(query, status)} className={styles.btnPrimary}>
            <Download className={styles.btnIcon} />
            Export CSV
          </a>
        </div>
      </section>

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <div className={styles.metricIconWrap}>
            <Users className={styles.metricIcon} />
          </div>
          <p className={styles.metricLabel}>Visible Customers</p>
          <p className={styles.metricValue}>{summary.totalCustomers}</p>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricIconWrap}>
            <UserCheck className={styles.metricIcon} />
          </div>
          <p className={styles.metricLabel}>Active Customers</p>
          <p className={styles.metricValue}>{summary.activeCustomers}</p>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Customer List</h2>
            <p className={styles.panelSubtitle}>
              {hasFilters
                ? `${summary.totalCustomers} matching customers`
                : `${summary.totalCustomers} total registered customers`}
            </p>
          </div>
        </div>

        <form className={styles.controls} action="/customers">
          <div className={styles.search}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by name, email, or ID"
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterWrap}>
            <Filter className={styles.filterIcon} />
            <select name="status" defaultValue={status} className={styles.select}>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="New">New</option>
              <option value="Idle">Idle</option>
            </select>
          </div>

          <button type="submit" className={styles.btnSecondary}>
            Apply
          </button>

          {hasFilters && (
            <Link href="/customers" className={styles.btnGhost}>
              Clear
            </Link>
          )}
        </form>

        {customers.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No customers match this view</h3>
            <p className={styles.emptyText}>
              {hasFilters
                ? 'Try a different search or clear the filters to see all registered users.'
                : 'Once users register, they will appear here automatically.'}
            </p>
            {hasFilters && (
              <Link href="/customers" className={styles.emptyBtn}>
                Clear Filters
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Customer</th>
                    <th className={styles.th}>Email</th>
                    <th className={styles.th}>Wallets</th>
                    <th className={styles.th}>Bank Accounts</th>
                    <th className={styles.th}>Transactions</th>
                    <th className={styles.th}>Balance</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, index) => {
                    const isCurrentUser = customer.id === currentUser.id;

                    return (
                      <tr
                        key={customer.id}
                        className={[
                          styles.tr,
                          index % 2 === 1 ? styles.trAlt : '',
                          isCurrentUser ? styles.trCurrent : '',
                        ].join(' ').trim()}
                      >
                        <td className={styles.td}>
                          <div className={styles.customerCell}>
                            <div className={styles.avatar}>
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={styles.customerMeta}>
                              <span className={styles.name}>{customer.name}</span>
                              <span className={styles.customerId}>{customer.id}</span>
                            </div>
                            {isCurrentUser && <span className={styles.currentBadge}>You</span>}
                          </div>
                        </td>
                        <td className={`${styles.td} ${styles.email}`}>{customer.email}</td>
                        <td className={styles.td}>{customer.walletCount}</td>
                        <td className={styles.td}>{customer.bankAccountCount}</td>
                        <td className={styles.td}>{customer.transactionCount}</td>
                        <td className={`${styles.td} ${styles.balance}`}>${formatCurrency(customer.totalBalance)}</td>
                        <td className={styles.td}>
                          <span className={`${styles.statusBadge} ${statusClasses[customer.status]}`}>
                            {customer.status}
                          </span>
                        </td>
                        <td className={`${styles.td} ${styles.joined}`}>{formatJoinedDate(customer.joined)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
