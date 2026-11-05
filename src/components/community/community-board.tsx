
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, House, Search, ShieldAlert } from 'lucide-react';
import { Link } from '@/i18n/navigation';

type Post = {
  id: string;
  type: 'material' | 'room' | 'lost_found';
  title: string;
  description: string;
  course: string | null;
  year: number | null;
  meetingPlace: string | null;
  photoUrl: string | null;
  postStatus: string;
  lostFoundType: string | null;
  createdAt: string;
  author: { username: string; createdAt: string };
  answers: { body: string; createdAt: string; username: string }[];
};

export function CommunityBoard({
  posts,
  loggedIn,
}: {
  posts: Post[];
  loggedIn: boolean;
}) {
  const t = useTranslations('Community');
  const [busy, setBusy] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [notice, setNotice] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  async function download(id: string) {
    if (!loggedIn) {
      setNotice(t('loginDownload'));
      return;
    }

    setBusy(id);

    try {
      const response = await fetch(`/api/community/${id}/download`, {
        cache: 'no-store',
      });

      if (!response.ok) throw new Error();

      const file = await response.blob();
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `chuo-market-material-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setNotice(t('actionError'));
    } finally {
      setBusy('');
    }
  }

  async function answer(id: string) {
    if (!loggedIn) {
      setNotice(t('loginDownload'));
      return;
    }

    const body = (answerDrafts[id] ?? '').trim();
    if (body.length < 2) return;

    setBusy(id);

    try {
      const response = await fetch(`/api/community/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });

      if (!response.ok) throw new Error();

      setAnswerDrafts((current) => ({ ...current, [id]: '' }));
      setNotice(t('answerReward'));
    } catch {
      setNotice(t('actionError'));
    } finally {
      setBusy('');
    }
  }

  async function report(id: string) {
    if (!loggedIn) {
      setNotice(t('loginReport'));
      return;
    }

    setBusy(id);

    try {
      const response = await fetch(`/api/community/${id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'other',
          details: 'Community post reported by user.',
        }),
      });

      if (!response.ok) throw new Error();

      setNotice(t('reportSuccess'));
    } catch {
      setNotice(t('actionError'));
    } finally {
      setBusy('');
    }
  }

  const visiblePosts = posts.filter((post) => {
    if (post.type !== 'material') return !courseFilter && !yearFilter;

    return (
      (!courseFilter ||
        (post.course ?? '').toLowerCase().includes(courseFilter.toLowerCase())) &&
      (!yearFilter || String(post.year ?? '') === yearFilter)
    );
  });

  const materialYears = Array.from(
    new Set(
      posts
        .filter((post) => post.type === 'material' && post.year)
        .map((post) => String(post.year)),
    ),
  )
    .sort()
    .reverse();

  const cards = [
    {
      type: 'material',
      title: t('materials'),
      description: t('materialsDescription'),
      Icon: BookOpen,
      href: '/community/new?type=material',
    },
    {
      type: 'room',
      title: t('rooms'),
      description: t('roomsDescription'),
      Icon: House,
      href: '/community/new?type=room',
    },
    {
      type: 'lost_found',
      title: t('lostFound'),
      description: t('lostFoundDescription'),
      Icon: Search,
      href: '/community/new?type=lost_found',
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          {t('eyebrow')}
        </p>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="text-sm text-slate-500">{t('intro')}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ type, title, description, Icon, href }) => (
          <Link
            className="rounded-2xl border border-divider bg-white p-4 shadow-card transition hover:border-brand-300 hover:shadow-card-hover"
            href={href}
            key={type}
          >
            <Icon className="mb-4 h-6 w-6 text-slate-600" />
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {description}
            </p>
            <span className="mt-4 inline-block text-xs font-bold text-brand-700">
              {t('postFree')} →
            </span>
          </Link>
        ))}
      </div>

      {notice && (
        <p
          aria-live="polite"
          className="rounded-xl border border-divider bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold">{t('recentPosts')}</h2>

        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label={t('courseFilter')}
            className="min-w-0 rounded-xl border border-divider bg-white p-3 text-sm"
            onChange={(event) => setCourseFilter(event.target.value)}
            placeholder={t('courseFilter')}
            value={courseFilter}
          />

          <select
            aria-label={t('yearFilter')}
            className="min-w-0 rounded-xl border border-divider bg-white p-3 text-sm"
            onChange={(event) => setYearFilter(event.target.value)}
            value={yearFilter}
          >
            <option value="">{t('allYears')}</option>
            {materialYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {visiblePosts.length === 0 ? (
          <p className="rounded-2xl border border-divider bg-white p-5 text-sm text-slate-500">
            {t('empty')}
          </p>
        ) : (
          <div className="grid gap-3">
            {visiblePosts.map((post) => (
              <article
                className="rounded-2xl border border-divider bg-white p-4 shadow-card"
                key={post.id}
              >
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>{t(`types.${post.type}`)}</span>
                  {post.lostFoundType && (
                    <span>· {t(post.lostFoundType)}</span>
                  )}
                  <span>
                    · {post.postStatus === 'resolved' ? t('resolved') : t('open')}
                  </span>
                </div>

                <h3 className="mt-2 font-bold">{post.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                  {post.description}
                </p>

                {post.type === 'material' && (
                  <p className="mt-2 text-xs text-slate-600">
                    {post.course} · {post.year}
                  </p>
                )}

                {post.meetingPlace && (
                  <p className="mt-2 text-xs text-slate-600">
                    {t('location')}: {post.meetingPlace}
                  </p>
                )}

                {post.answers.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-xl bg-canvas p-3">
                    <p className="text-xs font-bold text-slate-600">
                      {t('answers')}
                    </p>
                    {post.answers.map((answer, index) => (
                      <div
                        className="border-t border-divider pt-2 text-xs"
                        key={`${post.id}-${index}`}
                      >
                        <p className="whitespace-pre-wrap text-brand-700">
                          {answer.body}
                        </p>
                        <p className="mt-1 text-slate-400">
                          @{answer.username}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {post.photoUrl && (
                 <div className="relative mt-3 h-56 w-full overflow-hidden rounded-xl">
                    {/* Private R2 image served through our authenticated API */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={t('postPhoto')}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={post.photoUrl}
                    />
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <label className="block text-xs text-slate-500">
                    {t('answerPrompt')}
                    <textarea
                      className="mt-1 w-full rounded-xl border border-divider bg-canvas p-2 text-sm"
                      maxLength={2000}
                      onChange={(event) =>
                        setAnswerDrafts((current) => ({
                          ...current,
                          [post.id]: event.target.value,
                        }))
                      }
                      value={answerDrafts[post.id] ?? ''}
                    />
                  </label>

                  <button
                    className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-bold"
                    disabled={
                      busy === post.id ||
                      !(answerDrafts[post.id] ?? '').trim()
                    }
                    onClick={() => void answer(post.id)}
                    type="button"
                  >
                    {t('submitAnswer')} · +5 {t('points')}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    @{post.author.username} ·{' '}
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex gap-3">
                    <button
                      className="text-xs font-semibold text-slate-600 underline"
                      disabled={busy === post.id}
                      onClick={() => void report(post.id)}
                      type="button"
                    >
                      <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                      {t('report')}
                    </button>

                    {post.type === 'material' && (
                      <button
                        className="text-xs font-semibold text-brand-700 underline"
                        disabled={busy === post.id}
                        onClick={() => void download(post.id)}
                        type="button"
                      >
                        {busy === post.id ? t('working') : t('download')}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
