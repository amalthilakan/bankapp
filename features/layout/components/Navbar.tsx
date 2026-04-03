'use client';

import { Search, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import type { User } from '@/shared/types';

import styles from './Navbar.module.css';

function getUserInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/customers', label: 'Customers' },
    { href: '/settings', label: 'Settings' },
  ];

  useEffect(() => {
    if (pathname === '/login') {
      return;
    }

    let cancelled = false;

    async function loadSession() {
      const response = await fetch('/api/auth/session');

      if (response.status === 401) {
        router.replace('/login');
        router.refresh();
        return;
      }

      const json = await response.json();

      if (!cancelled && json.success) {
        setUser(json.data);
      }
    }

    function handleUserUpdated(event: Event) {
      const nextUser = (event as CustomEvent<User>).detail;

      if (!cancelled && nextUser) {
        setUser(nextUser);
      }
    }

    loadSession();
    window.addEventListener('bankapp:user-updated', handleUserUpdated as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener('bankapp:user-updated', handleUserUpdated as EventListener);
    };
  }, [pathname, router]);

  function handleLogout() {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.replace('/login');
      router.refresh();
    });
  }

  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <div className={styles.avatar}>
          {user ? getUserInitials(user.name) : '...'}
        </div>
        <div className={styles.userMeta}>
          <span className={styles.name}>{user?.name ?? 'Loading user'}</span>
          <span className={styles.email}>{user?.email ?? 'Checking session...'}</span>
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.navLinks}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${
              pathname === item.href
                ? styles.navLinkActive
                : styles.navLinkInactive
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className={styles.spacer} />
      <div className={styles.search}>
        <Search className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search"
          className={styles.searchInput}
        />
      </div>
      <button className={styles.logoutBtn} onClick={handleLogout} disabled={isPending}>
        <LogOut className={styles.logoutIcon} />
        {isPending ? 'Signing out...' : 'Logout'}
      </button>
    </nav>
  );
}
