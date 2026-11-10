// Shrinks a photo in the browser before upload: phone cameras produce 5-12 MB files that are slow on mobile data
// and can exceed the server limit. Falls back to the original file if the browser cannot decode it.
export async function resizeImage(file, maxSide = 1600, quality = 0.82) {
  if (typeof window === 'undefined' || !file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file.size > 11 * 1024 * 1024 && blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
    return new File([blob], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
