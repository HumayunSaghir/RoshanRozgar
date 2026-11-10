'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Minus, Plus, Send, X } from 'lucide-react';
import Shell from '@/components/Shell';
import AreaPicker from '@/components/AreaPicker';
import { useAuth, useLang, useLoc } from '@/components/Providers';
import { AIChip, Button, Card, Chip, MicButton, Notice, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { TRADES } from '@/lib/trades';
import { fmtTime, useVoiceRecorder } from '@/lib/voice';

const WHEN = [
  ['now', 'Now'],
  ['tonight', 'This evening'],
  ['tomorrow', 'Tomorrow'],
];
const MAX_PHOTOS = 4;

// Shrinks a photo to at most 1600px (JPEG) so uploads stay fast on mobile data.
async function shrinkImage(file, max = 1600) {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export default function NewJobPage() {
  const router = useRouter();
  const { tr } = useLang();
  const { user, ready } = useAuth();
  const { loc } = useLoc();
  const rec = useVoiceRecorder();
  const fileRef = useRef(null);

  const [trade, setTrade] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(0);
  const [when, setWhen] = useState('now');
  const [photos, setPhotos] = useState([]); // [{ url, preview }]
  const [audioUrl, setAudioUrl] = useState('');
  const [transcriptUrdu, setTranscriptUrdu] = useState('');
  const [aiSource, setAiSource] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && !user) router.push('/login');
  }, [ready, user, router]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyAI = (res) => {
    if (res.trade && !trade) setTrade(res.trade);
    if (res.title && !title) setTitle(res.title);
    if (res.summary && !description) setDescription(res.summary);
    if (res.urgency && ['now', 'tonight', 'tomorrow'].includes(res.urgency)) setWhen(res.urgency);
    setAiSource(res.source || '');
  };

  const toggleMic = async () => {
    setError('');
    if (rec.state === 'listening') {
      const r = await rec.stop();
      if (!r.blob && !r.transcript) {
        setError(tr('We could not hear you. Please try again.'));
        return;
      }
      setAnalyzing(true);
      try {
        const fd = new FormData();
        if (r.blob) fd.append('audio', r.blob, 'voice.wav');
        if (r.transcript) fd.append('transcript', r.transcript);
        const res = await api.form('/ai/job', fd);
        applyAI(res);
        setAudioUrl(res.audioUrl || '');
        setTranscriptUrdu(res.transcriptUrdu || r.transcript || '');
        if (r.transcript && !description && !res.summary) setDescription(r.transcript);
      } catch (e) {
        setError(tr(e.message));
      } finally {
        setAnalyzing(false);
      }
      return;
    }
    const ok = await rec.start();
    if (!ok) setError(tr('Microphone access was denied. Please type your message.'));
  };

  const pickPhotos = async (e) => {
    const files = [...(e.target.files || [])].slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      for (const f of files) {
        const small = await shrinkImage(f);
        const fd = new FormData();
        fd.append('image', small);
        if (title || description) fd.append('text', `${title} ${description}`.trim());
        const res = await api.form('/ai/job', fd);
        const url = res.imageUrls?.[0];
        if (url) setPhotos((p) => [...p, { url, preview: URL.createObjectURL(small) }]);
        applyAI(res);
      }
    } catch (err) {
      setError(tr(err.message));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (i) => {
    setPhotos((p) => {
      URL.revokeObjectURL(p[i].preview);
      return p.filter((_, idx) => idx !== i);
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!trade) return setError(tr('Please choose a trade'));
    if (title.trim().length < 3) return setError(tr('Please add a short title for the job'));
    setBusy(true);
    try {
      const res = await api.post('/jobs', {
        trade,
        title: title.trim(),
        description: description.trim(),
        budget: budget || undefined,
        whenLabel: when,
        address: { area: loc.area, lat: loc.lat, lng: loc.lng, text: loc.label },
        audioUrl,
        transcriptUrdu,
        imageUrls: photos.map((p) => p.url),
      });
      router.push(`/jobs/${res.job.id}`);
    } catch (err) {
      setError(tr(err.message));
      setBusy(false);
    }
  };

  const listening = rec.state === 'listening';
  const field = 'mt-1 w-full rounded-2xl border-2 border-neutral-300 bg-white px-4 text-lg outline-none focus:border-green-800';

  if (ready && user && user.role !== 'customer') {
    return (
      <Shell>
        <div className="container-rr max-w-[720px] py-10">
          <Notice tone="info" title="Only customers can post jobs">Log in with a customer account to post a job and receive bids.</Notice>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="container-rr max-w-[820px] pb-16 pt-8">
        <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('Post a job')}</h1>
        <p className="mb-6 mt-1 text-neutral-600">{tr('Describe the work once. Nearby workers send you their price and you choose.')}</p>

        <form onSubmit={submit} noValidate>
          <Card className="space-y-6 p-5 sm:p-8">
            <section aria-labelledby="pj-voice">
              <div className="flex items-center gap-4 rounded-2xl bg-neutral-50 p-4">
                <MicButton size={64} state={analyzing ? 'processing' : rec.state} onClick={toggleMic} label={listening ? tr('Stop and send') : tr('Tap to speak')} />
                <div className="min-w-0">
                  <p id="pj-voice" className="text-lg font-bold">{tr('Speak to fill the form')}</p>
                  <p className="text-neutral-600" aria-live="polite">
                    {listening ? `${tr('Listening…')} ${fmtTime(rec.seconds)}` : analyzing ? tr('Understanding…') : tr('Describe the problem and AI will fill in the details.')}
                  </p>
                </div>
              </div>
              {(listening ? rec.transcript : transcriptUrdu) && (
                <p lang="ur" dir="rtl" className="urdu mt-3 rounded-xl bg-white p-3 text-lg">{listening ? rec.transcript : transcriptUrdu}</p>
              )}
              {aiSource && !listening && (
                <div className="mt-3"><AIChip>{tr('AI filled in some details')}{aiSource === 'rules' ? ` · ${tr('rules')}` : ''}</AIChip></div>
              )}
            </section>

            <section>
              <p className="font-bold" id="pj-trade">{tr('What kind of worker do you need?')}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="pj-trade">
                {TRADES.map(({ id, label, Icon }) => (
                  <Chip key={id} selected={trade === id} icon={Icon} onClick={() => setTrade(id)}>{tr(label)}</Chip>
                ))}
              </div>
            </section>

            <section>
              <label htmlFor="pj-title" className="font-bold">{tr('Job title')}</label>
              <input id="pj-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder={tr('e.g. Fix a leaking kitchen tap')} className={cx(field, 'h-14')} />
            </section>

            <section>
              <label htmlFor="pj-desc" className="font-bold">{tr('Details (optional)')}</label>
              <textarea id="pj-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1200} rows={4} placeholder={tr('Tell workers what needs to be done')} className={cx(field, 'py-3')} />
            </section>

            <section aria-labelledby="pj-photos">
              <p id="pj-photos" className="font-bold">{tr('Photos (optional)')}</p>
              <ul className="mt-2 flex flex-wrap gap-3">
                {photos.map((p, i) => (
                  <li key={p.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={p.preview} alt={tr('Job photo {n}', { n: i + 1 })} className="h-24 w-24 rounded-2xl object-cover" />
                    <button type="button" onClick={() => removePhoto(i)} aria-label={tr('Remove photo {n}', { n: i + 1 })} className="absolute -right-2 -top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-text text-white shadow-medium hover:bg-neutral-700">
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <li>
                    <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-neutral-300 text-sm font-bold text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed">
                      <Camera className="h-6 w-6" aria-hidden />
                      {uploading ? tr('Uploading…') : tr('Add photo')}
                    </button>
                  </li>
                )}
              </ul>
              <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label={tr('Job photos')} onChange={pickPhotos} />
            </section>

            <section aria-labelledby="pj-when">
              <p id="pj-when" className="font-bold">{tr('When do you need them?')}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="pj-when">
                {WHEN.map(([k, label]) => <Chip key={k} selected={when === k} onClick={() => setWhen(k)}>{tr(label)}</Chip>)}
              </div>
            </section>

            <section aria-labelledby="pj-budget">
              <p id="pj-budget" className="font-bold">{tr('Your budget (optional)')}</p>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" aria-label={tr('Decrease')} disabled={budget <= 0} onClick={() => setBudget((b) => Math.max(0, b - 100))} className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"><Minus className="h-6 w-6" aria-hidden /></button>
                <p className="min-w-[140px] text-center text-2xl font-bold" aria-live="polite">{budget ? `Rs ${budget.toLocaleString('en-US')}` : tr('Open to offers')}</p>
                <button type="button" aria-label={tr('Increase')} onClick={() => setBudget((b) => (b === 0 ? 500 : b + 100))} className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-neutral-300 hover:bg-neutral-50"><Plus className="h-6 w-6" aria-hidden /></button>
              </div>
            </section>

            <section>
              <p className="mb-1 font-bold">{tr('Where is the work?')}</p>
              <AreaPicker />
            </section>

            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" icon={Send} full loading={busy} disabled={uploading || analyzing || busy}>{tr('Post job')}</Button>
          </Card>
        </form>
      </div>
    </Shell>
  );
}
