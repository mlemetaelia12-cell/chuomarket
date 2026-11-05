
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

  return (
    <button
      className="rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
      onClick={logout}
      type="button"
    >
      {t('logout')}
    </button>
  );
}
