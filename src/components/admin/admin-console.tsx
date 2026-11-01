'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

function formatTsh(value: number): string {
  return `TSh ${Math.round(value).toLocaleString('en-TZ')}`;
}

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  listingId: string | null;
  communityPostId: string | null;
  reportedUserId: string | null;
  reporter: string;
};

type AdminData = {
  reports: Report[];
  stats?: { users: number; newUsers30Days: number; revenueTsh: number };
  orders?: {
    id: string;
    username: string;
    type: string;
    amountTsh: number;
    status: string;
    paymentMethod: string | null;
    createdAt: string;
  }[];
  plans?: {
    id: string;
    code: string;
    name: string;
    priceTsh: number;
    durationDays: number;
    active: boolean;
  }[];
  users?: {
    id: string;
    authUserId: string | null;
    username: string;
    role: string;
    banned: boolean;
    createdAt: string;
  }[];
};

type ActionPayload = Record<string, string | number>;

async function sendAction(payload: ActionPayload) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'action_failed');
}

const baseButton =
  'inline-flex min-h-9 items-center justify-center rounded-lg border border-divider bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton =
  'inline-flex min-h-9 items-center justify-center rounded-lg bg-brand-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const fieldClass =
  'min-h-10 min-w-0 rounded-lg border border-divider bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10';

export function AdminConsole({ superadmin }: { superadmin: boolean }) {
  const locale = useLocale();
  const sw = locale === 'sw';
  const copy = sw
    ? {
        loading: 'Inapakia eneo la usimamizi…',
        loadError: 'Imeshindikana kupakia taarifa za usimamizi.',
        actionError: 'Hatua haikukamilika. Jaribu tena.',
        saved: 'Mabadiliko yamehifadhiwa.',
        reports: 'Foleni ya ripoti',
        noReports: 'Hakuna ripoti mpya.',
        submittedBy: 'imetumwa na',
        listing: 'Tangazo',
        post: 'Chapisho la jamii',
        user: 'Mtumiaji',
        unspecified: 'Haijabainishwa',
        reviewing: 'Inakaguliwa',
        resolved: 'Imetatuliwa',
        dismissed: 'Imepuuzwa',
        removeListing: 'Futa tangazo',
        removePost: 'Futa chapisho',
        ban: 'Zuia akaunti',
        confirmListing: 'Una uhakika unataka kufuta tangazo hili kabisa?',
        confirmPost: 'Una uhakika unataka kufuta chapisho hili kabisa?',
        overview: 'Muhtasari wa jukwaa',
        allUsers: 'Watumiaji wote',
        newUsers: 'Watumiaji wapya · siku 30',
        revenue: 'Mapato yaliyokamilika',
        pricing: 'Bei za mipango',
        days: 'siku',
        save: 'Hifadhi bei',
        users: 'Usimamizi wa watumiaji',
        active: 'Hai',
        banned: 'Imezuiwa',
        demote: 'Ondoa mamlaka ya admin',
        promote: 'Mpe mamlaka ya admin',
        unban: 'Ruhusu akaunti',
        newPassword: 'Nenosiri jipya (herufi 8 au zaidi)',
        resetPassword: 'Badilisha nenosiri',
        orders: 'Malipo ya hivi karibuni',
        buyer: 'Mnunuzi',
        type: 'Aina',
        amount: 'Kiasi',
        status: 'Hali',
        date: 'Tarehe',
        actionFailed: 'Hatua haikukamilika.',
      }
    : {
        loading: 'Loading admin workspace…',
        loadError: 'Could not load admin data.',
        actionError: 'The action could not be completed. Please try again.',
        saved: 'Changes saved.',
        reports: 'Reports queue',
        noReports: 'No reports found.',
        submittedBy: 'submitted by',
        listing: 'Listing',
        post: 'Community post',
        user: 'User',
        unspecified: 'Not specified',
        reviewing: 'Reviewing',
        resolved: 'Resolved',
        dismissed: 'Dismissed',
        removeListing: 'Remove listing',
        removePost: 'Remove post',
        ban: 'Ban account',
        confirmListing: 'Permanently remove this listing?',
        confirmPost: 'Permanently remove this community post?',
        overview: 'Platform overview',
        allUsers: 'Total users',
        newUsers: 'New users · 30 days',
        revenue: 'Completed revenue',
        pricing: 'Plan pricing',
        days: 'days',
        save: 'Save price',
        users: 'User management',
        active: 'Active',
        banned: 'Banned',
        demote: 'Demote to user',
        promote: 'Promote to admin',
        unban: 'Unban account',
        newPassword: 'New password (8+ characters)',
        resetPassword: 'Reset password',
        orders: 'Recent payments',
        buyer: 'Buyer',
        type: 'Type',
        amount: 'Amount',
        status: 'Status',
        date: 'Date',
        actionFailed: 'The action could not be completed.',
      };

  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin', { cache: 'no-store' });
    if (!response.ok) throw new Error('load_failed');
    setData((await response.json()) as AdminData);
  }, []);

  useEffect(() => {
    void load().catch(() => setError(copy.loadError));
  }, [copy.loadError, load]);

  async function run(payload: ActionPayload) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await sendAction(payload);
      await load();
      setNotice(copy.saved);
    } catch {
      setError(copy.actionError);
    } finally {
      setBusy(false);
    }
  }

  const statusLabels: Record<string, string> = {
    reviewing: copy.reviewing,
    resolved: copy.resolved,
    dismissed: copy.dismissed,
  };

  if (!data) {
    return (
      <div
        className="rounded-2xl border border-divider bg-white p-5 text-sm text-slate-500 shadow-card"
        role="status"
      >
        {error || copy.loading}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-extrabold text-ink">{copy.reports}</h2>
          <span className="rounded-full bg-orange-soft px-3 py-1 text-xs font-bold text-orange-dark">
            {data.reports.length}
          </span>
        </div>
        {data.reports.length === 0 ? (
          <div className="rounded-2xl border border-divider bg-white p-5 text-sm text-slate-500">
            {copy.noReports}
          </div>
        ) : (
          <div className="grid gap-3">
            {data.reports.map((report) => (
              <article
                className="space-y-3 rounded-2xl border border-divider bg-white p-4 shadow-card sm:p-5"
                key={report.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-ink">{report.reason}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {copy.submittedBy} @{report.reporter} ·{' '}
                      {new Date(report.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                    {statusLabels[report.status] ?? report.status}
                  </span>
                </div>
                {report.details && (
                  <p className="text-sm leading-6 text-slate-600">{report.details}</p>
                )}
                <p className="break-all text-xs text-slate-400">
                  {report.listingId
                    ? `${copy.listing}: ${report.listingId}`
                    : report.communityPostId
                      ? `${copy.post}: ${report.communityPostId}`
                      : `${copy.user}: ${report.reportedUserId ?? copy.unspecified}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['reviewing', 'resolved', 'dismissed'] as const).map((status) => (
                    <button
                      className={baseButton}
                      disabled={busy}
                      key={status}
                      onClick={() =>
                        void run({ action: 'resolve_report', reportId: report.id, status })
                      }
                      type="button"
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                  {report.listingId && (
                    <button
                      className="inline-flex min-h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(copy.confirmListing))
                          void run({ action: 'delete_listing', listingId: report.listingId! });
                      }}
                      type="button"
                    >
                      {copy.removeListing}
                    </button>
                  )}
                  {report.communityPostId && (
                    <button
                      className="inline-flex min-h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(copy.confirmPost))
                          void run({
                            action: 'delete_community_post',
                            postId: report.communityPostId!,
                          });
                      }}
                      type="button"
                    >
                      {copy.removePost}
                    </button>
                  )}
                  {report.reportedUserId && (
                    <button
                      className={baseButton}
                      disabled={busy}
                      onClick={() =>
                        void run({ action: 'ban_user', userId: report.reportedUserId! })
                      }
                      type="button"
                    >
                      {copy.ban}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {superadmin && (
        <>
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-ink">{copy.overview}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [copy.allUsers, data.stats?.users ?? 0],
                [copy.newUsers, data.stats?.newUsers30Days ?? 0],
                [copy.revenue, formatTsh(data.stats?.revenueTsh ?? 0)],
              ].map(([label, value]) => (
                <article
                  className="rounded-2xl border border-divider bg-white p-4 shadow-card"
                  key={String(label)}
                >
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-ink">{copy.pricing}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {data.plans?.map((plan) => (
                <form
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-divider bg-white p-4 shadow-card"
                  key={plan.id}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void run({
                      action: 'update_plan',
                      planId: plan.id,
                      priceTsh: Number(form.get('priceTsh')),
                    });
                  }}
                >
                  <div className="min-w-32 flex-1">
                    <strong className="text-sm text-ink">{plan.name}</strong>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan.code} · {plan.durationDays} {copy.days}
                    </p>
                  </div>
                  <label className="sr-only" htmlFor={`plan-price-${plan.id}`}>
                    {plan.name}
                  </label>
                  <input
                    className={`${fieldClass} w-32`}
                    defaultValue={plan.priceTsh}
                    id={`plan-price-${plan.id}`}
                    min="0"
                    name="priceTsh"
                    type="number"
                  />
                  <button className={primaryButton} disabled={busy} type="submit">
                    {copy.save}
                  </button>
                </form>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-ink">{copy.users}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {data.users?.map((user) => (
                <article
                  className="space-y-3 rounded-2xl border border-divider bg-white p-4 shadow-card"
                  key={user.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <strong className="text-sm text-ink">@{user.username}</strong>
                      <p className="mt-1 text-xs text-slate-500">
                        {user.role} · {user.banned ? copy.banned : copy.active}
                      </p>
                    </div>
                    {user.banned ? (
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                        {copy.banned}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {copy.active}
                      </span>
                    )}
                  </div>
                  {user.role !== 'superadmin' && user.authUserId && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={baseButton}
                        disabled={busy}
                        onClick={() =>
                          void run({
                            action: 'set_role',
                            userId: user.id,
                            role: user.role === 'admin' ? 'user' : 'admin',
                          })
                        }
                        type="button"
                      >
                        {user.role === 'admin' ? copy.demote : copy.promote}
                      </button>
                      <button
                        className={baseButton}
                        disabled={busy}
                        onClick={() =>
                          void run({
                            action: user.banned ? 'unban_user' : 'ban_user',
                            userId: user.id,
                          })
                        }
                        type="button"
                      >
                        {user.banned ? copy.unban : copy.ban}
                      </button>
                    </div>
                  )}
                  {user.authUserId && (
                    <form
                      className="flex flex-wrap gap-2 border-t border-divider pt-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const newPassword = passwords[user.id] ?? '';
                        if (newPassword.length < 8) return;
                        void run({
                          action: 'reset_password',
                          authUserId: user.authUserId!,
                          newPassword,
                        }).then(() => {
                          setPasswords((current) => ({ ...current, [user.id]: '' }));
                        });
                      }}
                    >
                      <input
                        autoComplete="new-password"
                        className={`${fieldClass} min-w-0 flex-1`}
                        maxLength={128}
                        minLength={8}
                        onChange={(event) =>
                          setPasswords((current) => ({ ...current, [user.id]: event.target.value }))
                        }
                        placeholder={copy.newPassword}
                        type="password"
                        value={passwords[user.id] ?? ''}
                      />
                      <button
                        className={baseButton}
                        disabled={busy || (passwords[user.id] ?? '').length < 8}
                        type="submit"
                      >
                        {copy.resetPassword}
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-ink">{copy.orders}</h2>
            <div className="overflow-x-auto rounded-2xl border border-divider bg-white shadow-card">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-canvas text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">{copy.buyer}</th>
                    <th className="p-3 font-semibold">{copy.type}</th>
                    <th className="p-3 font-semibold">{copy.amount}</th>
                    <th className="p-3 font-semibold">{copy.status}</th>
                    <th className="p-3 font-semibold">{copy.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders?.map((order) => (
                    <tr className="border-t border-divider" key={order.id}>
                      <td className="p-3 font-medium text-ink">@{order.username}</td>
                      <td className="p-3 text-slate-600">{order.type}</td>
                      <td className="p-3 font-semibold tabular-nums text-ink">
                        {formatTsh(order.amountTsh)}
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.orders?.length && (
                <p className="p-4 text-sm text-slate-500">{copy.noReports}</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
