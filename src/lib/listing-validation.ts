import 'server-only';

import { r2PublicUrl } from '@/lib/r2';

export function areOwnedListingImages(images: string[], ownerId: string): boolean {
  if (!r2PublicUrl) return images.length === 0;
  const expectedPrefix = `${r2PublicUrl}/listings/${ownerId}/`;

  return images.every((imageUrl) => {
    try {
      const parsed = new URL(imageUrl);
      return parsed.protocol === 'https:'
        && imageUrl.startsWith(expectedPrefix)
        && parsed.pathname.endsWith('.webp');
    } catch {
      return false;
    }
  });
}
