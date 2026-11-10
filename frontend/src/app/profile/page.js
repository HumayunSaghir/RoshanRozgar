'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth, useLang, useLoc } from '@/components/Providers';
import AreaPicker from '@/components/AreaPicker';
import AvatarUploader from '@/components/AvatarUploader';
import { Button, Card, Notice } from '@/components/ui';
import { api } from '@/lib/api';

export default function CustomerProfile() {
  const { user, refresh, logout } = useAuth();
  const { loc } = useLoc();
  const { tr } = useLang();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setName(user.name || '');
  }, [user]);

  const save = async () => {
    setError('');
    try {
      await api.put('/auth/me', { name, area: loc.area });
      await refresh();
      setSaved(true);
    } catch (e) {
      setError(tr(e.message));
    }
  };

  return (
    <Shell>
      <div className="container-rr max-w-[640px] pb-16 pt-8">
        <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('My profile')}</h1>
        <Card className="mt-6 space-y-5 p-6">
          <AvatarUploader />
          <p className="text-neutral-600">{tr('Phone')}: <b className="text-text">{user?.phone}</b></p>
          <div>
            <label htmlFor="n" className="font-bold">{tr('Name')}</label>
            <input id="n" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} className="mt-1 h-14 w-full rounded-2xl border-2 border-neutral-300 px-4 text-lg outline-none focus:border-green-800" autoComplete="name" />
          </div>
          <div>
            <p className="mb-1 font-bold">{tr('Your area')}</p>
            <AreaPicker />
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          {saved && <Notice tone="ok" title={tr('Saved')} />}
          <div className="flex gap-3">
            <Button onClick={save}>{tr('Save')}</Button>
            <Button variant="secondary" onClick={logout}>{tr('Logout')}</Button>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
