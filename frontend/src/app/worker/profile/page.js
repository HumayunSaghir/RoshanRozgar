'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Mic } from 'lucide-react';
import ProfileEditor from '@/components/ProfileEditor';
import PhotoUploader from '@/components/PhotoUploader';
import AvatarUploader from '@/components/AvatarUploader';
import { useAuth, useLang } from '@/components/Providers';
import { Button, Notice, TrustBadge } from '@/components/ui';
import { api, assetUrl } from '@/lib/api';

export default function WorkerProfileEdit() {
  const { tr } = useLang();
  const { user, refresh } = useAuth();
  const photoRef = useRef(null);
  const [fields, setFields] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && !fields) {
      setFields({ name: user.name, trade: user.trade, experienceYears: user.experienceYears, area: user.area, rate: user.rate, skills: user.skills || [], workingHours: user.workingHours });
      setPhotos(user.workPhotos || []);
    }
  }, [user, fields]);

  if (!fields) return <div className="h-80 animate-pulse rounded-3xl bg-neutral-75" aria-hidden />;

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/worker/profile', fields);
      await refresh();
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('image', f));
    try {
      setPhotos((await api.form('/worker/photos', fd)).workPhotos);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-[800px]">
      <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('My profile')}</h1>
      <AvatarUploader className="mt-4" />
      <p className="mt-4 text-neutral-600">{tr('Phone')}: {user.phone} · {tr('shown to customers only after a booking is confirmed.')}</p>
      <div className="mt-3 flex flex-wrap gap-2">{user.badges.map((b) => <TrustBadge key={b}>{/^\d+ jobs done$/.test(b) ? tr('{n} jobs done', { n: parseInt(b, 10) }) : tr(b)}</TrustBadge>)}</div>

      <div className="mt-6"><ProfileEditor value={fields} onChange={(v) => { setFields(v); setSaved(false); }} /></div>

      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="font-bold">{tr('Work photos')} · {photos.length}</p>
        <div className="mt-3"><PhotoUploader photos={photos} onChange={setPhotos} /></div>
      </div>

      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
      {saved && <Notice tone="ok" className="mt-4" title={tr('Profile saved')} />}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button loading={saving} onClick={save}>{tr('Save')}</Button>
        <Button variant="secondary" icon={Mic} href="/join?edit=1">{tr('Re-record by voice')}</Button>
      </div>
      <p className="mt-4"><Link href="/worker/dashboard" className="font-bold text-green-800 hover:underline">{tr('Back to dashboard')}</Link></p>
    </div>
  );
}
