import { AdminConsole } from '@/components/admin/admin-console';
import { requireRole } from '@/lib/session';

export default async function SuperadminPage() {
  await requireRole(['superadmin'] as const);
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-divider bg-white p-6 shadow-card sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Chuo Market · Platform operations
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">Superadmin workspace</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Platform-level reports, users, subscription plan pricing and order oversight.
        </p>
      </header>
      <AdminConsole superadmin />
    </section>
  );
}
