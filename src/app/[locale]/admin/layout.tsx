import type { ReactNode } from 'react';
import { requireRole } from '@/lib/session';

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(['admin', 'superadmin'] as const);
  return children;
}
