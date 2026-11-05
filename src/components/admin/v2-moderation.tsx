'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type PendingMaterial = {
  id: string;
  title: string;
  university: string;
  program: string;
  subject: string;
  moderationStatus: string;
  createdAt: string;
  uploader: { username: string };
};

type CampusAlert = {
  id: string;
  title: string;
  trustLabel: 'official' | 'community' | 'unverified';
  category: string;
  createdAt: string;
  publisher: { username: string };
};

type V2Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: string;
  targetType: 'housing_listing' | 'roommate_request' | 'study_material' | 'campus_alert' | 'service_listing';
  targetId: string;
};

type Data = { pendingMaterials: PendingMaterial[]; recentAlerts: CampusAlert[]; reports: V2Report[] };
type Action = Record<string, string | boolean>;

export function V2Moderation() {
  const t = useTranslations('AdminV2');
  const locale = useLocale();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/v2', { cache: 'no-store' });
    if (!response.ok) throw new Error('load_failed');
    setData((await response.json()) as Data);
  }, []);

  useEffect(() => {
    void load().catch(() => setError(t('loadError')));
  }, [load, t]);

  async function run(action: Action) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/v2', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action) });
      if (!response.ok) throw new Error('action_failed');
      await load();
    } catch {
      setError(t('actionError'));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <section className="rounded-2xl border border-divider bg-white p-4 text-sm text-ink-muted">{error || t('loading')}</section>;

  function targetLabel(type: V2Report['targetType']): string {
    const labels: Record<V2Report['targetType'], string> = {
      housing_listing: t('housing'), roommate_request: t('roommate'), study_material: t('material'),
      campus_alert: t('alert'), service_listing: t('service'),
    };
    return labels[type];
  }

  function removalAction(report: V2Report): Action {
    if (report.targetType === 'housing_listing') return { action: 'remove_housing', listingId: report.targetId };
    if (report.targetType === 'roommate_request') return { action: 'remove_roommate_request', requestId: report.targetId };
    if (report.targetType === 'study_material') return { action: 'remove_material', materialId: report.targetId };
    if (report.targetType === 'campus_alert') return { action: 'remove_alert', alertId: report.targetId };
    return { action: 'remove_service', serviceId: report.targetId };
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-extrabold text-ink">{t('reports')}</h2><span className="rounded-full bg-royal-soft px-3 py-1 text-xs font-bold text-royal-dark">{data.reports.filter((row) => row.status === 'open' || row.status === 'reviewing').length}</span></div>
        {data.reports.length === 0 ? <p className="rounded-2xl border border-divider bg-white p-4 text-sm text-ink-muted">{t('noReports')}</p> : data.reports.map((report) => (
          <article className="space-y-3 rounded-2xl border border-divider bg-white p-4 shadow-card" key={report.id}>
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-ink">{targetLabel(report.targetType)} · {report.reason}</h3><p className="mt-1 text-xs text-ink-muted">{t('reportedBy', { name: report.reporter })} · {new Date(report.createdAt).toLocaleDateString(locale)}</p></div><span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold capitalize text-ink-muted">{t(report.status === 'open' ? 'open' : report.status)}</span></div>
            {report.details && <p className="text-sm text-ink-secondary">{report.details}</p>}
            <p className="break-all text-[11px] text-ink-muted">{report.targetId}</p>
            <div className="flex flex-wrap gap-2"><button className="rounded-lg border border-divider px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void run({ action: 'resolve_report', reportId: report.id, status: 'reviewing' })} type="button">{t('review')}</button><button className="rounded-lg border border-divider px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void run({ action: 'resolve_report', reportId: report.id, status: 'resolved' })} type="button">{t('resolve')}</button><button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800" disabled={busy} onClick={() => { if (window.confirm(t('confirmRemove'))) void run(removalAction(report)); }} type="button">{t('removeContent')}</button></div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold text-ink">{t('pendingMaterials')}</h2>
        {data.pendingMaterials.length === 0 ? <p className="rounded-2xl border border-divider bg-white p-4 text-sm text-ink-muted">{t('noPendingMaterials')}</p> : data.pendingMaterials.map((material) => (
          <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-divider bg-white p-4 shadow-card" key={material.id}>
            <div className="min-w-0"><h3 className="font-bold text-ink">{material.title}</h3><p className="mt-1 text-xs text-ink-muted">{material.university} · {material.program} · {material.subject}</p><p className="text-xs text-ink-muted">{t('uploadedBy', { name: material.uploader.username })}</p></div>
            <div className="flex flex-wrap gap-2"><button className="rounded-lg bg-electric px-3 py-2 text-xs font-bold text-navy-950" disabled={busy} onClick={() => void run({ action: 'moderate_material', materialId: material.id, status: 'approved' })} type="button">{t('approve')}</button><button className="rounded-lg border border-divider px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void run({ action: 'moderate_material', materialId: material.id, status: 'rejected' })} type="button">{t('reject')}</button></div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold text-ink">{t('alertTrust')}</h2>
        {data.recentAlerts.length === 0 ? <p className="rounded-2xl border border-divider bg-white p-4 text-sm text-ink-muted">{t('noAlerts')}</p> : data.recentAlerts.map((alert) => (
          <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-divider bg-white p-4 shadow-card" key={alert.id}>
            <div className="min-w-0"><h3 className="font-bold text-ink">{alert.title}</h3><p className="mt-1 text-xs text-ink-muted">{t('uploadedBy', { name: alert.publisher.username })} · {alert.trustLabel}</p></div>
            <button className="rounded-lg border border-divider px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void run({ action: 'official_alert', alertId: alert.id, official: alert.trustLabel !== 'official' })} type="button">{alert.trustLabel === 'official' ? t('removeOfficial') : t('markOfficial')}</button>
          </article>
        ))}
      </section>
    </div>
  );
}
