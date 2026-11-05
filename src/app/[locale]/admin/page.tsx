import { getLocale } from 'next-intl/server';
import { AdminConsole } from '@/components/admin/admin-console';
import { V2Moderation } from '@/components/admin/v2-moderation';
import { requireRole } from '@/lib/session';

export default async function AdminPage() {
  const [session, locale] = await Promise.all([
    requireRole(['admin', 'superadmin'] as const),
    getLocale(),
  ]);
  const isSwahili = locale === 'sw';
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-divider bg-white p-6 shadow-card sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Chuo Market · {isSwahili ? 'Uendeshaji' : 'Operations'}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
          {isSwahili ? 'Paneli ya msimamizi' : 'Admin panel'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isSwahili ? 'Umeingia kama' : 'Signed in as'} @{session.user.username} ·{' '}
          {session.user.role}
        </p>
      </header>
      <AdminConsole superadmin={session.user.role === 'superadmin'} />
      <V2Moderation />
    </section>
  );
}
