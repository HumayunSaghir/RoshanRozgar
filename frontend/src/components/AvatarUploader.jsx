'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { resizeImage } from '@/lib/image';
import { useAuth, useLang } from './Providers';
import { Avatar, Notice } from './ui';

// Profile picture for the signed-in user (worker or customer). Uploads to Cloudinary through the API.
export default function AvatarUploader({ size = 112, className }) {
  const { tr } = useLang();
  const { user, refresh } = useAuth();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;
  const initials = (user.initials || (user.name || 'U')[0]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(tr('Please choose image files (jpg, png or webp).')); return; }
    setBusy(true);
    setError('');
    try {
      const small = await resizeImage(file, 640, 0.85);
      const fd = new FormData();
      fd.append('image', small);
      await api.form('/auth/me/avatar', fd);
      await refresh();
    } catch (err) {
      setError(tr(err.message));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await api.del('/auth/me/avatar');
      await refresh();
    } catch (err) {
      setError(tr(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar initials={initials} src={user.avatarUrl} size={size} />
          {busy && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70"><Loader2 className="h-6 w-6 animate-spin text-green-800" aria-hidden /></span>}
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} aria-label={user.avatarUrl ? tr('Change profile photo') : tr('Add a profile photo')} className="absolute -bottom-1 -right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-green-800 text-white shadow-soft hover:bg-green-700 disabled:opacity-60">
            <Camera className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-w-0">
          <p className="font-bold">{tr('Profile photo')}</p>
          <p className="t-body-sm text-neutral-600">{tr('A clear face photo builds trust.')}</p>
          {user.avatarUrl && !busy && (
            <button type="button" onClick={remove} className="mt-1 inline-flex min-h-11 items-center gap-1 font-bold text-red-600 hover:underline"><Trash2 className="h-4 w-4" aria-hidden /> {tr('Remove photo')}</button>
          )}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} aria-label={tr('Choose a profile photo')} />
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
    </div>
  );
}
