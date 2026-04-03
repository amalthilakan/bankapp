'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import type { User } from '@/shared/types';

import styles from '@/app/settings/page.module.css';

interface SettingsContentProps {
  initialUser: User;
}

type ProfileFormState = {
  name: string;
  email: string;
};

type PasswordVisibilityState = {
  current: boolean;
  next: boolean;
  confirm: boolean;
};

function getUserInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatJoinDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SettingsContent({ initialUser }: SettingsContentProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState<ProfileFormState>({
    name: initialUser.name,
    email: initialUser.email,
  });
  const [profilePending, setProfilePending] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState<PasswordVisibilityState>({
    current: false,
    next: false,
    confirm: false,
  });
  const [passwordPending, setPasswordPending] = useState(false);

  const hasProfileChanges = useMemo(
    () => profile.name.trim() !== user.name || profile.email.trim() !== user.email,
    [profile.email, profile.name, user.email, user.name]
  );

  function handleUnauthorized() {
    router.replace('/login');
    router.refresh();
  }

  function broadcastUserUpdate(nextUser: User) {
    window.dispatchEvent(new CustomEvent<User>('bankapp:user-updated', { detail: nextUser }));
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfilePending(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const json = await response.json();

      if (!response.ok || !json.success) {
        toast.error(json.error || 'Failed to update profile.');
        return;
      }

      setUser(json.data);
      setProfile({
        name: json.data.name,
        email: json.data.email,
      });
      toast.success('Profile updated successfully.');
      broadcastUserUpdate(json.data);
      router.refresh();
    } catch {
      toast.error('Something went wrong while saving your profile.');
    } finally {
      setProfilePending(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setPasswordPending(true);

    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const json = await response.json();

      if (!response.ok || !json.success) {
        toast.error(json.error || 'Failed to update password.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully.');
    } catch {
      toast.error('Something went wrong while updating your password.');
    } finally {
      setPasswordPending(false);
    }
  }

  function toggleVisibility(key: keyof PasswordVisibilityState) {
    setPasswordVisibility((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroHeader}>
          <p className={styles.eyebrow}>Account Settings</p>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>
            Update your personal details, keep your password fresh, and manage the information tied to your account.
          </p>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.avatar}>{getUserInitials(user.name)}</div>
          <div className={styles.profileInfo}>
            <p className={styles.profileName}>{user.name}</p>
            <p className={styles.profileEmail}>{user.email}</p>
            <p className={styles.profileMeta}>Member since {formatJoinDate(user.createdAt)}</p>
          </div>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.iconWrap}>
              <UserRound className={styles.panelIcon} />
            </div>
            <div>
              <h2 className={styles.panelTitle}>Personal Details</h2>
              <p className={styles.panelDesc}>Change the name and email shown across your workspace.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleProfileSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Full Name</span>
              <input
                className={styles.input}
                name="name"
                type="text"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                placeholder="Alicia Koch"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Email Address</span>
              <input
                className={styles.input}
                name="email"
                type="email"
                value={profile.email}
                onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>



            <button
              className={styles.submitButton}
              type="submit"
              disabled={profilePending || !hasProfileChanges}
            >
              <Save className={styles.submitIcon} />
              {profilePending ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.iconWrap}>
              <ShieldCheck className={styles.panelIcon} />
            </div>
            <div>
              <h2 className={styles.panelTitle}>Password & Security</h2>
              <p className={styles.panelDesc}>Use your current password to set a new one for this account.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handlePasswordSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Current Password</span>
              <div className={styles.passwordField}>
                <input
                  className={styles.input}
                  name="currentPassword"
                  type={passwordVisibility.current ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => toggleVisibility('current')}
                  aria-label={passwordVisibility.current ? 'Hide current password' : 'Show current password'}
                >
                  {passwordVisibility.current ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                </button>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>New Password</span>
              <div className={styles.passwordField}>
                <input
                  className={styles.input}
                  name="newPassword"
                  type={passwordVisibility.next ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => toggleVisibility('next')}
                  aria-label={passwordVisibility.next ? 'Hide new password' : 'Show new password'}
                >
                  {passwordVisibility.next ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                </button>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Confirm New Password</span>
              <div className={styles.passwordField}>
                <input
                  className={styles.input}
                  name="confirmPassword"
                  type={passwordVisibility.confirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat the new password"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => toggleVisibility('confirm')}
                  aria-label={passwordVisibility.confirm ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {passwordVisibility.confirm ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                </button>
              </div>
            </label>

            <div className={styles.tipCard}>
              <LockKeyhole className={styles.tipIcon} />
              <p className={styles.tipText}>Choose a password that is at least 8 characters long and different from your current one.</p>
            </div>



            <button className={styles.submitButton} type="submit" disabled={passwordPending}>
              <ShieldCheck className={styles.submitIcon} />
              {passwordPending ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
