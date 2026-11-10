'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, Mic, Minus, Plus, Send } from 'lucide-react';
import VoiceNote from '@/components/VoiceNote';
import { Button, MicButton, Notice, cx } from '@/components/ui';
import { Skeleton } from '@/components/Skeleton';
import { useAuth, useLang } from '@/components/Providers';
import { API_BASE, api, assetUrl } from '@/lib/api';

// DELETE helper (the shared api client only exposes get/post/put/form)
async function del(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
import { fmtTime, useVoiceRecorder } from '@/lib/voice';
import { fmtRs, tradeById } from '@/lib/trades';

const WHEN = { now: 'Now', tonight: 'This evening', tomorrow: 'Tomorrow' };
const BID_STATUS = {
  pending: ['Bid sent', 'bg-yellow-50 text-yellow-800'],
  accepted: ['Accepted', 'bg-green-50 text-green-800'],
  rejected: ['Not selected', 'bg-red-50 text-red-800'],
};

export default function WorkerJobDetail() {
  const { id } = useParams();
  const { tr } = useLang();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [price, setPrice] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [zoom, setZoom] = useState('');
  const [chatId, setChatId] = useState('');
  const rec = useVoiceRecorder();

  const load = useCallback(async () => {
    try {
      const d = await api.get(`/jobs/${id}`);
      setData(d);
      setError('');
      return d;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    setPrice((p) => p || data.myBid?.price || data.job.budget || user?.rate || 1000);
    if (data.myBid?.message) setMessage((m) => m || data.myBid.message);
  }, [data, user]);

  // Once the bid is accepted, find the booking it created so we can link to the chat.
  useEffect(() => {
    if (data?.myBid?.status !== 'accepted') return;
    api.get('/bookings/mine').then((r) => {
      const hit = r.bookings.find((b) => b.aiSummary?.title === data.job.title && b.customer?.name === data.job.customer?.name);
      setChatId(hit?.id || '');
    }).catch(() => {});
  }, [data]);

  if (error && !data) return <Notice tone="error" title={tr('Job not found')}>{tr(error)}</Notice>;
  if (!data) {
    return (
      <div className="mx-auto max-w-[900px] space-y-4" role="status" aria-busy="true">
        <span className="sr-only">{tr('Loading…')}</span>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const { job, myBid, canBid, needsVerification } = data;
  const trade = tradeById(job.trade);
  const customerFirst = (job.customer?.name || tr('Customer')).split(' ')[0];
  const open = job.status === 'open';
  const editable = canBid && (!myBid || myBid.status === 'pending');
  const step = (d) => setPrice((p) => Math.max(100, (Number(p) || 0) + d));

  const toggleMic = async () => {
    if (rec.state === 'listening') {
      const r = await rec.stop();
      if (r.transcript) setMessage((m) => `${m ? `${m} ` : ''}${r.transcript}`.slice(0, 400));
      return;
    }
    const ok = await rec.start();
    if (!ok) setError(tr('Microphone access was denied. Please type your message.'));
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      await api.post(`/jobs/${id}/bids`, { price: Number(price), message });
      setDone(myBid ? 'Your bid was updated.' : 'Your bid was sent to the customer.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      await del(`/jobs/${id}/bids/mine`);
      setDone('Your bid was withdrawn.');
      setMessage('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const [statusLabel, statusTone] = myBid ? BID_STATUS[myBid.status] || BID_STATUS.pending : [];

  return (
    <div className="mx-auto max-w-[900px]">
      <Link href="/worker/find-jobs" className="mb-4 inline-flex min-h-11 items-center gap-2 font-bold text-green-800 hover:underline">
        <ArrowLeft className="h-5 w-5" aria-hidden /> {tr('All jobs')}
      </Link>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="job-h" className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            {trade && <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-800">{tr(trade.label)}</span>}
            <span className="rounded-full bg-neutral-75 px-3 py-1 text-sm font-bold text-neutral-700">#{job.ref}</span>
            {!open && <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-800">{tr(job.status === 'awarded' ? 'Awarded' : job.status === 'cancelled' ? 'Cancelled' : 'Closed')}</span>}
          </div>
          <h1 id="job-h" className="t-heading-xl mt-3 text-[1.625rem] sm:text-[2rem]">{job.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-600">
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden /> {tr(job.address.area || '')}{job.distanceKm !== undefined ? ` · ${tr('{n} km away', { n: job.distanceKm })}` : ''}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden /> {tr(WHEN[job.whenLabel] || 'Now')}</span>
          </p>
          <p className="mt-1 text-neutral-600">{tr('Posted by {name}', { name: customerFirst })} · {job.budget > 0 ? tr('Budget {amount}', { amount: fmtRs(job.budget) }) : tr('Open budget')} · {tr('{n} bids', { n: job.bidCount })}</p>

          {job.description && <p className="mt-4 whitespace-pre-line rounded-2xl bg-neutral-50 p-4 text-lg">{job.description}</p>}
          {job.audioUrl && <VoiceNote id={job.id} audioUrl={job.audioUrl} transcriptUrdu={job.transcriptUrdu} transcriptRoman={job.description} className="mt-4" />}

          {job.imageUrls?.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {job.imageUrls.map((u, i) => (
                <li key={u}>
                  <button type="button" onClick={() => setZoom(u)} className="block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl bg-neutral-75" aria-label={tr('Enlarge photo {n}', { n: i + 1 })}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={assetUrl(u)} alt={tr('Job photo {n}', { n: i + 1 })} className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="bid-h" className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7 lg:sticky lg:top-[124px]">
          <h2 id="bid-h" className="t-heading-md text-[1.5rem]">{myBid ? tr('Your bid') : tr('Send your bid')}</h2>

          {myBid && (
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[1.75rem] font-bold">{fmtRs(myBid.price)}</span>
              <span className={cx('rounded-full px-3 py-1 text-sm font-bold', statusTone)}>{tr(statusLabel)}</span>
            </p>
          )}

          {myBid?.status === 'accepted' && (
            <Notice tone="ok" className="mt-4" title={tr('The customer accepted your bid')}>{tr('Open the chat to coordinate. You will be marked Busy once the customer confirms.')}</Notice>
          )}
          {myBid?.status === 'accepted' && (
            <Button href={chatId ? `/worker/messages?b=${chatId}` : '/worker/messages'} className="mt-4" full>{tr('Open chat')}</Button>
          )}
          {myBid?.status === 'rejected' && <Notice tone="info" className="mt-4">{tr('This job went to another worker.')}</Notice>}

          {editable && open ? (
            <>
              <p className="mt-4 font-bold">{tr('Your price')}</p>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" aria-label={tr('Decrease')} onClick={() => step(-100)} className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-neutral-300 hover:bg-neutral-50"><Minus className="h-6 w-6" aria-hidden /></button>
                <div className="flex-1 text-center">
                  <label htmlFor="bid-price" className="sr-only">{tr('Your price')}</label>
                  <input id="bid-price" inputMode="numeric" value={price} onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, '')) || 0)} className="h-14 w-full rounded-2xl border-2 border-neutral-300 text-center text-[1.5rem] font-bold outline-none focus:border-green-800" />
                </div>
                <button type="button" aria-label={tr('Increase')} onClick={() => step(100)} className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-neutral-300 hover:bg-neutral-50"><Plus className="h-6 w-6" aria-hidden /></button>
              </div>
              <p className="t-body-sm mt-1 text-center text-neutral-500">{fmtRs(price)}</p>

              <label htmlFor="bid-msg" className="mt-4 block font-bold">{tr('Message (optional)')}</label>
              <div className="mt-1 flex items-start gap-2">
                <textarea id="bid-msg" rows={3} maxLength={400} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={tr('For example: I can come this evening and bring the parts.')} className="w-full rounded-2xl border-2 border-neutral-300 p-3 text-lg outline-none focus:border-green-800" />
                <MicButton size={56} state={rec.state} onClick={toggleMic} label={rec.state === 'listening' ? tr('Stop and send') : tr('Tap to speak')} />
              </div>
              {rec.state === 'listening' && <p className="mt-1 font-bold text-green-800" role="status"><Mic className="mr-1 inline h-4 w-4" aria-hidden />{tr('Listening…')} {fmtTime(rec.seconds)}</p>}

              {error && <Notice tone="error" className="mt-4">{tr(error)}</Notice>}
              {done && <Notice tone="ok" className="mt-4">{tr(done)}</Notice>}
              <Button icon={Send} full className="mt-5" loading={busy} disabled={!(price >= 50)} onClick={submit}>{myBid ? tr('Update bid') : tr('Send bid')}</Button>
              {myBid && <Button variant="tertiary" full className="mt-2" disabled={busy} onClick={withdraw}>{tr('Withdraw bid')}</Button>}
            </>
          ) : (
            !myBid && (needsVerification && open
              ? <Notice tone="tip" className="mt-4" title="Verification needed">You can bid once an admin approves your documents.</Notice>
              : <Notice tone="info" className="mt-4">{tr(!open ? 'This job is no longer open for bids.' : 'This job is for a different trade.')}</Notice>)
          )}
          {!editable && error && <Notice tone="error" className="mt-4">{tr(error)}</Notice>}
          {!editable && done && <Notice tone="ok" className="mt-4">{tr(done)}</Notice>}
        </section>
      </div>

      {zoom && (
        <div role="dialog" aria-modal="true" aria-label={tr('Photo')} className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/80 p-4" onClick={() => setZoom('')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetUrl(zoom)} alt={tr('Job photo')} className="max-h-full max-w-full rounded-2xl" />
          <button type="button" aria-label={tr('Close')} className="absolute right-4 top-4 h-12 w-12 cursor-pointer rounded-full bg-white text-xl font-bold" onClick={() => setZoom('')}>×</button>
        </div>
      )}
    </div>
  );
}
