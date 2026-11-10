'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import { resizeImage } from '@/lib/image';
import { useLang } from './Providers';
import { Button, Notice } from './ui';

// Uploads work photos to the API (Cloudinary) and shows each one as soon as it is ready.
export default function PhotoUploader({ photos, onChange, label }) {
  const { tr } = useLang();
  const inputRef = useRef(null);
  const [pending, setPending] = useState([]); // local previews while uploading
  const [error, setError] = useState('');

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/')).slice(0, 6);
    e.target.value = '';
    if (!files.length) {
      setError(tr('Please choose image files (jpg, png or webp).'));
      return;
    }
    setError('');
    const previews = files.map((f) => ({ id: `${f.name}-${f.size}-${Math.random()}`, url: URL.createObjectURL(f) }));
    setPending((p) => [...p, ...previews]);
    try {
      const small = await Promise.all(files.map((f) => resizeImage(f)));
      const fd = new FormData();
      small.forEach((f) => fd.append('image', f));
      const r = await api.form('/worker/photos', fd);
      onChange(r.workPhotos);
    } catch (err) {
      setError(tr(err.message));
    } finally {
      setPending((p) => p.filter((x) => !previews.some((y) => y.id === x.id)));
      previews.forEach((x) => URL.revokeObjectURL(x.url));
    }
  };

  return (
    <div>
      {(photos.length > 0 || pending.length > 0) && (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <li key={p} className="aspect-square overflow-hidden rounded-xl bg-neutral-75">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={assetUrl(p)} alt={tr('Work photo')} className="h-full w-full object-cover" />
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-neutral-75">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover opacity-50" />
              <span className="absolute inset-0 flex items-center justify-center"><Loader2 className="rr-spin h-7 w-7 text-green-800" aria-label={tr('Uploading…')} /></span>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" icon={Camera} full onClick={() => inputRef.current?.click()} loading={pending.length > 0}>
        {label || tr('Add a photo')}{photos.length ? ` (${photos.length})` : ''}
      </Button>
      <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label={tr('Work photos')} onChange={onFiles} />
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
    </div>
  );
}
