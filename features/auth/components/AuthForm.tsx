'use client';

import { FormEvent, useState, useTransition } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

import styles from '@/app/login/page.module.css';

type Mode = 'login' | 'register';

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
          setError(json.error || 'Authentication failed.');
          return;
        }

        router.replace('/');
        router.refresh();
      } catch {
        setError('Something went wrong. Please try again.');
      }
    });
  }

  return (
    <div className={styles.formCard}>
      <div className={styles.formHeader}>
        <p className={styles.eyebrow}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
        <h1 className={styles.title}>
          {mode === 'login' ? 'Sign in to WalletDash' : 'Start your own secure workspace'}
        </h1>
        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Use your email and password to access your personal dashboard.'
            : 'Each new user gets a separate MongoDB-backed wallet profile.'}
        </p>
      </div>

      <div className={styles.modeSwitch}>
        <button
          type="button"
          className={`${styles.modeButton} ${mode === 'login' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${mode === 'register' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('register')}
        >
          Create account
        </button>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {mode === 'register' ? (
          <label className={styles.field}>
            <span className={styles.label}>Full name</span>
            <input className={styles.input} name="name" type="text" placeholder="Alicia Koch" required />
          </label>
        ) : null}

        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input className={styles.input} name="email" type="email" placeholder="you@example.com" required />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Password</span>
          <div className={styles.passwordField}>
            <input
              className={styles.input}
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              required
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
            </button>
          </div>
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.submitButton} type="submit" disabled={isPending}>
          {isPending ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
