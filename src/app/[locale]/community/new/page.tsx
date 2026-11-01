import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { CommunityPostForm } from '@/components/community/community-post-form';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

const allowed = ['material', 'room', 'lost_found'] as const;
type Kind = (typeof allowed)[number];
export default async function NewCommunityPostPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const kind = allowed.includes(params.type as Kind) ? params.type as Kind : 'material';
  const [user, locale] = await Promise.all([requireMarketplaceUser(), getLocale()]);
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations('Community');
  return <section className="mx-auto max-w-xl space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">{t('eyebrow')}</p><h1 className="mt-2 text-2xl font-extrabold">{t(`create.${kind}`)}</h1></div><CommunityPostForm kind={kind} /></section>;
}
