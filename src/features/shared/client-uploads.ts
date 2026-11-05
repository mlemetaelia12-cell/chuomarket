'use client';

const MAX_IMAGE_BYTES = 200 * 1024;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_COUNT = 4;

type DecodedImage = {
  element: HTMLImageElement;
  dispose: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('image_decode_failed'));
      image.src = objectUrl;
    });
    return { element: image, dispose: () => URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('image_encode_failed'));
    }, 'image/webp', quality);
  });
}

async function convertToWebp(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > MAX_INPUT_BYTES) {
    throw new Error('invalid_image');
  }

  const decoded = await decodeImage(file);
  try {
    const longestSide = Math.max(decoded.element.naturalWidth, decoded.element.naturalHeight);
    if (!longestSide) throw new Error('image_decode_failed');

    const canvas = document.createElement('canvas');
    const dimensions = [1600, 1280, 1024, 800];
    const qualities = [0.86, 0.76, 0.66, 0.56];

    for (const maxSide of dimensions) {
      const scale = Math.min(1, maxSide / longestSide);
      canvas.width = Math.max(1, Math.round(decoded.element.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(decoded.element.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('image_encode_failed');
      context.drawImage(decoded.element, 0, 0, canvas.width, canvas.height);

      for (const quality of qualities) {
        const blob = await canvasToWebp(canvas, quality);
        if (blob.size <= MAX_IMAGE_BYTES) {
          return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
        }
      }
    }
    throw new Error('image_too_large_after_compression');
  } finally {
    decoded.dispose();
  }
}

export async function uploadPublicWebpImages(
  feature: 'housing' | 'services',
  files: File[],
): Promise<string[]> {
  if (files.length > MAX_IMAGE_COUNT) throw new Error('too_many_images');
  const keys: string[] = [];

  for (const originalFile of files) {
    const file = await convertToWebp(originalFile);
    const signedResponse = await fetch('/api/v2/uploads/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feature, contentType: 'image/webp', size: file.size }),
    });
    const signed = (await signedResponse.json()) as { uploadUrl?: string; objectKey?: string };
    if (!signedResponse.ok || !signed.uploadUrl || !signed.objectKey) throw new Error('sign_failed');

    const uploadResponse = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: file,
    });
    if (!uploadResponse.ok) throw new Error('upload_failed');
    keys.push(signed.objectKey);
  }

  return keys;
}
