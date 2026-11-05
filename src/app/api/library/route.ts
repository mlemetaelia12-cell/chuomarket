import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { studyMaterials, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { verifyPrivatePdf } from '@/features/shared/storage';

const schema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(1200),
  university: z.string().trim().min(2).max(160),
  program: z.string().trim().min(2).max(160),
  studyYear: z.number().int().min(1).max(8),
  subject: z.string().trim().min(2).max(160),
  materialType: z.enum(['notes', 'past_paper', 'study_guide', 'assignment', 'revision']),
  objectKey: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const search = (params.get('q') ?? '').trim().slice(0, 100);
  const university = (params.get('university') ?? '').trim().slice(0, 160);
  const program = (params.get('program') ?? '').trim().slice(0, 160);
  const subject = (params.get('subject') ?? '').trim().slice(0, 160);
  const year = Number(params.get('year'));
  const type = params.get('type');
  const sort = params.get('sort');
  const conditions = [eq(studyMaterials.moderationStatus, 'approved')];
  if (search) conditions.push(or(ilike(studyMaterials.title, `%${search}%`), ilike(studyMaterials.description, `%${search}%`), ilike(studyMaterials.subject, `%${search}%`))!);
  if (university) conditions.push(eq(studyMaterials.university, university));
  if (program) conditions.push(eq(studyMaterials.program, program));
  if (subject) conditions.push(ilike(studyMaterials.subject, `%${subject}%`));
  if (Number.isInteger(year) && year >= 1 && year <= 8) conditions.push(eq(studyMaterials.studyYear, year));
  if (['notes', 'past_paper', 'study_guide', 'assignment', 'revision'].includes(type ?? '')) conditions.push(eq(studyMaterials.materialType, type as 'notes' | 'past_paper' | 'study_guide' | 'assignment' | 'revision'));
  const orderBy = sort === 'popular' ? [desc(studyMaterials.downloadCount), desc(studyMaterials.createdAt)] : [desc(studyMaterials.createdAt)];
  const rows = await db.select({
    id: studyMaterials.id, title: studyMaterials.title, description: studyMaterials.description,
    university: studyMaterials.university, program: studyMaterials.program, studyYear: studyMaterials.studyYear,
    subject: studyMaterials.subject, materialType: studyMaterials.materialType, createdAt: studyMaterials.createdAt,
    downloadCount: studyMaterials.downloadCount, author: users.username,
  }).from(studyMaterials).innerJoin(users, eq(studyMaterials.uploaderId, users.id))
    .where(and(...conditions)).orderBy(...orderBy).limit(80);
  return NextResponse.json({ materials: rows }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'library-material-create', 4, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_material', issues: parsed.error.flatten() }, { status: 400 });
  if (!(await verifyPrivatePdf(user.id, parsed.data.objectKey, parsed.data.fileSize))) return NextResponse.json({ error: 'invalid_private_file' }, { status: 400 });

  const safeFileName = parsed.data.fileName.replace(/[\\/\r\n\u0000-\u001f]/g, '').slice(0, 120) || 'study-material.pdf';
  const [created] = await db.insert(studyMaterials).values({
    uploaderId: user.id, title: parsed.data.title, description: parsed.data.description,
    university: parsed.data.university, program: parsed.data.program, studyYear: parsed.data.studyYear,
    subject: parsed.data.subject, materialType: parsed.data.materialType, objectKey: parsed.data.objectKey,
    fileName: safeFileName, fileSize: parsed.data.fileSize, mimeType: 'application/pdf', moderationStatus: 'pending',
  }).returning({ id: studyMaterials.id });
  return NextResponse.json({ id: created.id, status: 'pending' }, { status: 201 });
}
