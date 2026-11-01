import { redirect, notFound } from 'next/navigation';

const routeShortcuts = ['upload-notes', 'lost-found', 'rooms'] as const;
type Shortcut = (typeof routeShortcuts)[number];

export default async function RouteShortcutPage({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale, rest } = await params;
  if (rest.length !== 1 || !routeShortcuts.includes(rest[0] as Shortcut)) {
    notFound();
  }

  const shortcut = rest[0] as Shortcut;
  if (shortcut === 'upload-notes') {
    redirect(`/${locale}/community/new?type=material`);
  }
  if (shortcut === 'lost-found') {
    redirect(`/${locale}/community?type=lost_found`);
  }
  redirect(`/${locale}/community?type=room`);
}
