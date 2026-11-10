'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, CheckCircle2, MessageCircle, Mic, Phone, Send } from 'lucide-react';
import Shell from '@/components/Shell';
import StatusTracker from '@/components/StatusTracker';
import { AIChip, Button, Chip, MicButton, Notice, Stars, cx } from '@/components/ui';
import { useLang } from '@/components/Providers';
import { api } from '@/lib/api';
import { fmtTime, useVoiceRecorder } from '@/lib/voice';
import { TAG_LABELS, fmtRs, tradeById } from '@/lib/trades';

const TAGS = ['punctual', 'clean', 'fair_price', 'polite'];
const RATING_TEXT = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

function sysError(tr, e) {
  return tr(e.message);
}

export default function BookingPage() {
  const { id } = useParams();
  const { tr } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [aiTags, setAiTags] = useState([]);
  const [aiSource, setAiSource] = useState('');
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const rec = useVoiceRecorder();

  const load = useCallback(async () => {
    try {
      setData(await api.get(`/bookings/${id}`));
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  if (error) return <Shell><div className="container-rr py-16"><Notice tone="error" title={tr('Booking not found')}>{tr(error)}</Notice></div></Shell>;
  if (!data) return <Shell><div className="container-rr py-10"><div className="h-96 animate-pulse rounded-3xl bg-neutral-75" aria-hidden /></div></Shell>;

  const b = data.booking;
  const isCustomer = data.side === 'customer';
  const first = b.worker.name.replace('Ustad ', '').split(' ')[0];
  const canReview = isCustomer && b.status === 'completed' && !b.reviewed && !done;
  const rows = [
    [tr('Worker'), b.worker.name],
    [tr('Time'), tr(b.whenText)],
    [tr('Price'), fmtRs(b.price)],
    [tr('Address'), b.address.text],
    [tr('Payment'), tr('Cash on completion (mock)')],
  ];

  const toggleTag = (t) => setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const voiceReview = async () => {
    if (rec.state === 'listening') {
      const r = await rec.stop();
      setProcessing(true);
      try {
        const fd = new FormData();
        if (r.blob) fd.append('audio', r.blob, 'voice.wav');
        if (r.transcript) fd.append('transcript', r.transcript);
        const res = await api.form('/ai/review', fd);
        setTranscript(res.transcriptUrdu || r.transcript);
        setAudioUrl(res.audioUrl || '');
        setAiTags(res.tags || []);
        setAiSource(res.source);
        setTags((s) => [...new Set([...s, ...(res.tags || []).filter((t) => t !== 'late')])]);
        if (res.rating && !rating) setRating(res.rating);
      } catch (e) {
        setError(tr(e.message));
      } finally {
        setProcessing(false);
      }
      return;
    }
    const ok = await rec.start();
    if (!ok) setError(tr('Microphone access was denied. Use stars and tags to leave your review.'));
  };

  const submit = async () => {
    setSending(true);
    setError('');
    try {
      const allTags = [...new Set([...tags, ...aiTags.filter((t) => t === 'late')])];
      await api.post('/reviews', { bookingId: b.id, rating, tags: allTags, transcriptUrdu: transcript, comment: transcript, audioUrl });
      setDone(true);
      await load();
    } catch (e) {
      setError(tr(e.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell>
      <div className="container-rr pb-16 pt-8 lg:pt-12">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-14">
          <section aria-labelledby="bk-h">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-500 text-white"><CheckCircle2 className="h-8 w-8" aria-hidden /></span>
              <div>
                <h1 id="bk-h" className="t-heading-xl text-[1.75rem] sm:text-[2.5rem]">
                  {tr(b.status === 'completed' ? 'Job completed!' : b.status === 'cancelled' ? 'Booking cancelled' : b.status === 'declined' ? 'Worker declined the request' : 'Booking confirmed!')}
                </h1>
                <p className="text-lg text-neutral-600">{tr('Reference')} #{b.ref}</p>
              </div>
            </div>

            <div className="mt-8"><StatusTracker status={b.status} /></div>

            <dl className="mt-8 space-y-4 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4">
                  <dt className="text-lg text-neutral-600">{k}</dt>
                  <dd className="text-right text-lg font-bold">{v}</dd>
                </div>
              ))}
            </dl>

            {['confirmed', 'on_the_way'].includes(b.status) && <Notice tone="tip" className="mt-4" title={tr('{name} is now marked Busy for other customers', { name: first })}>{tr('The worker is reserved for your booking.')}</Notice>}

            <div className="mt-5 flex gap-3">
              {b.worker.phone ? (
                <Button variant="secondary" icon={Phone} href={`tel:${b.worker.phone}`} className="flex-1">{tr('Call')}</Button>
              ) : (
                <Button variant="secondary" icon={Phone} disabled className="flex-1">{tr('Call')}</Button>
              )}
              <Button icon={MessageCircle} href={`/messages?b=${b.id}`} className="flex-1">{tr('Chat')}</Button>
            </div>
            {b.worker.phone && <p className="t-body-sm mt-2 text-neutral-500">{tr('Worker phone:')} {b.worker.phone}</p>}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8" aria-labelledby="rv-h">
            <p className="font-bold text-green-800">{tr('After the job')}</p>
            <h2 id="rv-h" className="t-heading-xl mt-1 text-[1.5rem] sm:text-[2rem]">{tr('How was {name}\'s work?', { name: first })}</h2>
            <p className="mt-1 text-neutral-600">{tr('Your review helps the next customer decide.')}</p>

            {!canReview ? (
              <Notice tone={done || b.reviewed ? 'ok' : 'info'} icon={done || b.reviewed ? Check : undefined} className="mt-5" title={tr(done || b.reviewed ? 'Thank you! Your review was saved.' : 'Reviews open after the job is completed')}>
                {tr(done || b.reviewed ? 'It will help the next customer choose well.' : isCustomer ? 'Once the worker marks the job complete, you can leave a review here.' : 'Only the customer can leave a review.')}
              </Notice>
            ) : (
              <>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <Stars value={rating} size={40} interactive onChange={setRating} />
                  <span className="text-lg font-bold" aria-live="polite">{tr(RATING_TEXT[rating])}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={tr('Tags')}>
                  {TAGS.map((t) => <Chip key={t} selected={tags.includes(t)} onClick={() => toggleTag(t)}>{tr(TAG_LABELS[t])}</Chip>)}
                </div>

                <div className="mt-6 rounded-2xl bg-neutral-50 p-4">
                  <div className="flex items-center gap-4">
                    <MicButton size={64} state={processing ? 'processing' : rec.state} onClick={voiceReview} label={tr('Record a voice review')} />
                    <div>
                      <p className="text-lg font-bold">{tr('Record a voice review')}</p>
                      <p className="text-neutral-600">{rec.state === 'listening' ? `${tr('Listening…')} ${fmtTime(rec.seconds)}` : tr('Speak your review and AI will tag it')}</p>
                    </div>
                  </div>
                  {(rec.state === 'listening' ? rec.transcript : transcript) && (
                    <p lang="ur" className="urdu mt-3 rounded-xl bg-white p-3 text-lg" dir="rtl">{rec.state === 'listening' ? rec.transcript : transcript}</p>
                  )}
                </div>

                {aiTags.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                    <AIChip className="!bg-transparent !p-0">{tr('AI tags for the next customer')}{aiSource === 'rules' ? ` · ${tr('rules')}` : ''}</AIChip>
                    <p className="mt-2 text-lg font-bold">{aiTags.map((t) => tr(TAG_LABELS[t] || t)).join(' · ')}</p>
                    <p className="t-body-sm text-neutral-600">{tr("Added to the worker's profile summary")}</p>
                  </div>
                )}

                {error && <Notice tone="error" className="mt-4">{tr(error)}</Notice>}
                <Button icon={Send} full className="mt-5" loading={sending} disabled={!rating} onClick={submit}>{tr('Submit review')}</Button>
                {!rating && <p className="t-body-sm mt-2 text-center text-neutral-500">{tr('Choose a star rating first.')}</p>}
              </>
            )}
            <p className={cx('sr-only', error && 'not-sr-only')}>{tr(tradeById(b.trade)?.label)}</p>
          </section>
        </div>
      </div>
    </Shell>
  );
}
