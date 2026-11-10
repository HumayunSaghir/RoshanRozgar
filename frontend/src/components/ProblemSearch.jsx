'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Check, Keyboard, Mic, Search, X } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { saveJob } from '@/lib/job';
import { useVoiceRecorder, fmtTime, voiceSupport } from '@/lib/voice';
import { AudioButton, Button, Card, Chip, MicButton, Notice, cx } from './ui';
import AreaPicker from './AreaPicker';
import { useLang, useLoc } from './Providers';

// "What needs fixing?": describe the problem by voice, photo or text. The AI turns it into a trade,
// urgency and price range, then the customer lands on nearby available workers.
export default function ProblemSearch() {
  const router = useRouter();
  const { t, tr, trLoc } = useLang();
  const { loc } = useLoc();
  const rec = useVoiceRecorder();
  const fileRef = useRef(null);
  const [mode, setMode] = useState(null); // mobile tiles: 'voice' | 'photo' | 'text'
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [when, setWhen] = useState('now');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const toggleMic = async () => {
    setError('');
    if (rec.state === 'listening') {
      const r = await rec.stop();
      setVoice(r);
      if (r.transcript) setText((prev) => (prev ? `${prev} ${r.transcript}` : r.transcript));
      return;
    }
    setMode('voice');
    const ok = await rec.start();
    if (!ok) setError(tr(rec.state === 'denied' ? 'Microphone access was denied. Type or attach a photo instead.' : 'This browser cannot record audio. Please type instead.'));
  };

  const pickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
    setMode('photo');
  };

  const submit = async () => {
    setError('');
    if (rec.state === 'listening') {
      const r = await rec.stop();
      setVoice(r);
      return run(r);
    }
    return run(voice);
  };

  const run = async (v) => {
    const typed = text.trim();
    if (!typed && !v?.blob && !v?.transcript && !image) {
      router.push(`/workers${qs({ when })}`);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      if (typed) fd.append('text', typed);
      if (v?.transcript) fd.append('transcript', v.transcript);
      if (v?.blob) fd.append('audio', v.blob, 'voice.wav');
      if (image) fd.append('image', image);
      const res = await api.form('/ai/job', fd);
      const whenLabel = touched ? when : res.urgency || 'now';
      saveJob({ ...res, text: typed, duration: v?.seconds || 0, whenLabel });
      router.push(`/workers${qs({ trade: res.trade, when: whenLabel })}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const listening = rec.state === 'listening';
  const support = typeof window !== 'undefined' ? voiceSupport() : { record: true, recognize: true };

  return (
    <Card className="p-5 shadow-soft sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-heading-md sm:text-[1.375rem]">{t('search.q')}</h2>
        <AudioButton text="What needs fixing? Speak, type or attach a photo." />
      </div>

      {/* phones: three big tiles */}
      <div className="mt-4 grid grid-cols-3 gap-3 sm:hidden">
        {[
          { id: 'voice', label: 'Speak', Icon: Mic, on: toggleMic },
          { id: 'photo', label: 'Photo', Icon: Camera, on: () => fileRef.current?.click() },
          { id: 'text', label: 'Type', Icon: Keyboard, on: () => setMode('text') },
        ].map(({ id, label, Icon, on }) => (
          <button
            key={id}
            type="button"
            onClick={on}
            aria-pressed={mode === id || (id === 'voice' && listening)}
            className={cx('flex h-[92px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 text-base font-bold transition-colors', mode === id || (id === 'voice' && listening) ? 'border-green-800 bg-green-800 text-white' : 'border-neutral-200 bg-white text-text hover:bg-neutral-50')}
          >
            <Icon className="h-6 w-6" aria-hidden />
            {tr(listening && id === 'voice' ? 'Stop' : label)}
          </button>
        ))}
      </div>

      {/* tablets and desktops: one input row */}
      <div className="mt-4 hidden items-center gap-3 rounded-2xl bg-neutral-50 p-2 pl-5 sm:flex">
        <label htmlFor="problem-text" className="sr-only">{t('search.q')}</label>
        <input
          id="problem-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={listening && rec.transcript ? rec.transcript : t('search.placeholder')}
          className="min-w-0 flex-1 bg-transparent py-3 text-lg outline-none placeholder:text-neutral-500"
        />
        <MicButton state={rec.state} size={52} onClick={toggleMic} />
        <button type="button" aria-label={tr('Attach a photo')} onClick={() => fileRef.current?.click()} className="inline-flex h-[52px] cursor-pointer w-[52px] shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 bg-white hover:bg-neutral-50">
          <Camera className="h-6 w-6" aria-hidden />
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={pickImage} aria-label={tr('Photo')} tabIndex={-1} />

      {mode === 'text' && (
        <div className="mt-3 sm:hidden">
          <label htmlFor="problem-text-m" className="sr-only">{t('search.q')}</label>
          <textarea id="problem-text-m" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t('search.placeholder')} className="w-full rounded-2xl border-2 border-neutral-200 p-4 text-lg outline-none focus:border-green-800" />
        </div>
      )}

      {listening && (
        <div className="mt-3 rounded-2xl bg-green-50 p-4" role="status" aria-live="polite">
          <p className="flex items-center gap-2 font-bold text-green-800">
            <span className="rr-pulse h-3 w-3 rounded-full bg-red-500" aria-hidden /> {tr('Listening…')} {fmtTime(rec.seconds)}
          </p>
          {rec.transcript ? <p lang="ur" className="urdu mt-1 text-lg" dir="rtl">{rec.transcript}</p> : <p className="t-body-sm text-neutral-600">{tr('Describe the problem, then tap again to stop.')}</p>}
        </div>
      )}

      {(voice || image) && !listening && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {voice && (
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 py-2 pl-4 pr-2 font-bold text-green-800">
              <Mic className="h-4 w-4" aria-hidden /> {tr('Voice')} · {fmtTime(voice.seconds)}
              <button type="button" aria-label={tr('Remove voice note')} onClick={() => { setVoice(null); rec.reset(); }} className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-full hover:bg-green-100"><X className="h-4 w-4" aria-hidden /></button>
            </span>
          )}
          {image && (
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 py-1 pl-1 pr-2 font-bold text-green-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={tr('Your photo')} className="h-9 w-9 rounded-full object-cover" /> {tr('Photo')}
              <button type="button" aria-label={tr('Remove photo')} onClick={() => { setImage(null); setPreview(''); }} className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-full hover:bg-green-100"><X className="h-4 w-4" aria-hidden /></button>
            </span>
          )}
        </div>
      )}

      {!support.record && <Notice tone="tip" className="mt-3">{tr('This browser cannot record audio. Type or attach a photo instead.')}</Notice>}
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AreaPicker className="min-w-0 sm:flex-1" />
        <div className="flex flex-wrap gap-3">
          <Chip selected={when === 'now'} onClick={() => { setWhen('now'); setTouched(true); }}>{t('when.now')}</Chip>
          <Chip selected={when === 'tonight'} onClick={() => { setWhen('tonight'); setTouched(true); }}>{t('when.tonight')}</Chip>
        </div>
      </div>

      <Button onClick={submit} loading={busy} icon={Search} full className="mt-5">
        <span className="hidden sm:inline">{t('search.cta')}</span>
        <span className="sm:hidden">{tr('Find workers')}</span>
      </Button>
      <p className="sr-only">{tr('Location')}: {trLoc(loc.label)}</p>
    </Card>
  );
}
