'use client';

import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import { useRouter } from '@/i18n/navigation';

export function ProfileActions() {
  const t = useTranslations('Auth');
  const router = useRouter();
  async function logout() {
    await authClient.signOut();
    router.replace('/login');
    router.refresh();
  }
  return <button className="rounded-full border border-brand-700 px-5 py-3 text-sm font-semibold text-brand-100" onClick={logout} type="button">{t('logout')}</button>;
}
