'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BadgeCheck, Camera, Clock, IdCard, ShieldCheck, UserRound, XCircle } from 'lucide-react';
import { Button, Card, Notice, cx } from '@/components/ui';
import { useAuth, useLang } from '@/components/Providers';
import { api, assetUrl } from '@/lib/api';
import { resizeImage } from '@/lib/image';

function DocPicker({ id, label, hint, icon: Icon, file, onFile, capture }) {
  const { tr } = useLang();
  const ref = useRef(null);
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) { setUrl(''); return undefined; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div>
      <p className="font-bold">{label}</p>
      <p className="t-body-sm text-neutral-600">{hint}</p>
      <input ref={ref} id={id} type="file" accept="image/jpeg,image/png,image/webp" capture={capture} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      <button type="button" onClick={() => ref.current?.click()} aria-label={label} className={cx('mt-2 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-neutral-50 hover:bg-neutral-75', file ? 'border-green-500' : 'border-neutral-300')}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 p-4 text-center font-bold text-neutral-600"><Icon className="h-10 w-10" aria-hidden /> <span className="inline-flex items-center gap-2"><Camera className="h-5 w-5" aria-hidden /> {tr('Tap to take or choose a photo')}</span></span>
        )}
      </button>
      {file && <button type="button" onClick={() => ref.current?.click()} className="mt-1 min-h-11 font-bold text-green-800 hover:underline">{tr('Change photo')}</button>}
    </div>
  );
}

function Verification() {
  const { tr } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const { user, ready, refresh } = useAuth();
  const [idFile, setIdFile] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && user && !user.profileComplete) router.replace('/join?step=voice');
  }, [ready, user, router]);

  const v = user?.verification;
  const status = v?.status || 'none';

  // Always show the latest decision: refresh on open, on tab focus, and every 10 s while waiting.
  useEffect(() => {
    refresh();
    const onFocus = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => { document.removeEventListener('visibilitychange', onFocus); window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  useEffect(() => {
    if (status !== 'pending') return undefined;
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [status, refresh]);

  const submit = async () => {
    if (!idFile || !selfie) { setError(tr('Please add both photos.')); return; }
    setBusy(true);
    setError('');
    try {
      const [a, b] = await Promise.all([resizeImage(idFile, 1800), resizeImage(selfie, 1200)]);
      const fd = new FormData();
      fd.append('idFront', a);
      fd.append('selfie', b);
      await api.form('/worker/verification', fd);
      setIdFile(null);
      setSelfie(null);
      await refresh();
    } catch (e) {
      setError(tr(e.message));
    } finally {
      setBusy(false);
    }
  };

  if (!user) return <div className="mx-auto h-64 max-w-[760px] animate-pulse rounded-3xl bg-neutral-75" aria-hidden />;

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('Verify your identity')}</h1>
      <p className="mt-2 text-lg text-neutral-600">{tr('Customers trust verified workers more. An admin checks your documents before your profile goes live.')}</p>

      {status === 'pending' && (
        <Card className="mt-6 p-6">
          <Notice tone="info" icon={Clock} title={tr('Your documents are under approval')}>{tr('An admin is reviewing them. We will notify you as soon as there is a decision. You can keep exploring the app meanwhile.')}</Notice>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[v.idUrl, v.selfieUrl].map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={assetUrl(u)} alt={i ? tr('Selfie') : tr('ID card')} className="aspect-[4/3] w-full rounded-2xl object-cover" loading="lazy" />
            ))}
          </div>
          <Button href="/worker/dashboard" className="mt-5" full>{tr('Go to dashboard')}</Button>
        </Card>
      )}

      {status === 'approved' && (
        <Card className="mt-6 p-6">
          <Notice tone="ok" icon={BadgeCheck} title={tr('You are verified')}>{tr('Your documents are approved. Customers can find you and you can bid on jobs.')}</Notice>
          <Button href="/worker/find-jobs" className="mt-5" full>{tr('Find jobs')}</Button>
        </Card>
      )}

      {(status === 'none' || status === 'rejected') && (
        <Card className="mt-6 p-5 sm:p-8">
          {status === 'rejected' && (
            <Notice tone="error" icon={XCircle} className="mb-6" title={tr('Your documents were not approved')}>
              {v.adminComment ? <><b>{tr('Reason from admin')}:</b> {v.adminComment}</> : tr('Please upload clearer photos and try again.')}
              <span className="mt-1 block">{tr('Upload new photos below to submit again.')}</span>
            </Notice>
          )}
          {params.get('first') === '1' && status === 'none' && (
            <Notice tone="ok" icon={ShieldCheck} className="mb-6" title={tr('Your profile is saved')}>{tr('One last step: add your documents so we can verify you.')}</Notice>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DocPicker id="doc-id" label={tr('CNIC / ID card (front)')} hint={tr('All four corners visible, text readable.')} icon={IdCard} file={idFile} onFile={setIdFile} />
            <DocPicker id="doc-selfie" label={tr('Selfie holding your ID')} hint={tr('Your face and the card in one photo.')} icon={UserRound} file={selfie} onFile={setSelfie} capture="user" />
          </div>
          <Notice tone="tip" icon={ShieldCheck} className="mt-6">{tr('Only admins can see your documents. They are never shown to customers.')}</Notice>
          {error && <Notice tone="error" className="mt-3">{error}</Notice>}
          <Button onClick={submit} loading={busy} disabled={!idFile || !selfie} full className="mt-5">{status === 'rejected' ? tr('Submit again for approval') : tr('Submit for approval')}</Button>
          {status === 'none' && <Button href="/worker/dashboard" variant="tertiary" full className="mt-2">{tr('Do this later')}</Button>}
        </Card>
      )}
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={null}>
      <Verification />
    </Suspense>
  );
}
