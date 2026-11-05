import { GetObjectCommand } from '@aws-sdk/client-s3';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { studyMaterials } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { getPrivateR2Bucket, getR2Client } from '@/lib/r2';
import { verifyPrivatePdf } from '@/features/shared/storage';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const { id } = await context.params;
  const material = await db.query.studyMaterials.findFirst({
    where: eq(studyMaterials.id, id),
    columns: { id: true, uploaderId: true, objectKey: true, fileName: true, fileSize: true, mimeType: true, moderationStatus: true },
  });
  if (!material || material.moderationStatus !== 'approved') return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const bucket = getPrivateR2Bucket();
  if (!bucket || !(await verifyPrivatePdf(material.uploaderId, material.objectKey, material.fileSize))) {
    return NextResponse.json({ error: 'file_unavailable' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const client = getR2Client();
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: material.objectKey }));
    if (!object.Body) return NextResponse.json({ error: 'file_unavailable' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    await db.update(studyMaterials)
      .set({ downloadCount: sql`${studyMaterials.downloadCount} + 1`, updatedAt: new Date() })
      .where(eq(studyMaterials.id, id));
    const filename = material.fileName.replace(/[\\"\r\n]/g, '_').slice(0, 120) || 'study-material.pdf';
    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    if (typeof object.ContentLength === 'number') headers.set('Content-Length', String(object.ContentLength));
    return new Response(object.Body.transformToWebStream(), { status: 200, headers });
  } catch (error) {
    console.error('Study material download failed.', { materialId: id, error });
    return NextResponse.json({ error: 'file_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
