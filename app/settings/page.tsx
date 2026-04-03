import type { Metadata } from 'next';
import SettingsContent from '@/features/settings/components/SettingsContent';
import { requireAuthenticatedUser } from '@/server/auth/service';

export const metadata: Metadata = {
  title: 'Settings — WalletDash',
  description: 'Update your account details and security settings.',
};


export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();

  return <SettingsContent initialUser={user} />;
}
