'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Check, Keyboard, ShieldCheck } from 'lucide-react';
import Shell from '@/components/Shell';
import PhoneOtp from '@/components/PhoneOtp';
import ProfileEditor from '@/components/ProfileEditor';
import { useAuth, useLang } from '@/components/Providers';
import PhotoUploader from '@/components/PhotoUploader';
import AvatarUploader from '@/components/AvatarUploader';
import { AIChip, AudioButton, Button, Card, MicButton, Notice, cx } from '@/components/ui';
import { api, assetUrl } from '@/lib/api';
import { fmtTime, useVoiceRecorder, voiceSupport } from '@/lib/voice';

const STEPS = ['Phone', 'Voice intro', 'Review profile'];

function Stepper({ step }) {
  const { tr } = useLang();
  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label={tr('Steps')}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-4" aria-current={current ? 'step' : undefined}>
            {i > 0 && <span className="h-px w-5 bg-neutral-300 sm:w-10" aria-hidden />}
            <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold sm:h-12 sm:w-12', done || current ? 'border-green-800 bg-green-800 text-white' : 'border-neutral-300 bg-white text-neutral-500')}>
              {done ? <Check className="h-5 w-5" aria-hidden /> : n}
            </span>
            <span className={cx('hidden text-base sm:inline sm:text-lg', current ? 'font-bold text-green-800' : done ? 'text-text' : 'text-neutral-500')}>{tr(label)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Join() {
  const { tr } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const { user, ready, refresh, logout } = useAuth();
  const rec = useVoiceRecorder();
  const photoRef = useRef(null);
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState({ name: '', trade: '', experienceYears: 0, area: '', rate: 0, skills: [], workingHours: { from: '08:00', to: '21:00' } });
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [source, setSource] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [areaNames, setAreaNames] = useState([]);

  useEffect(() => {
    api.get('/areas').then((d) => setAreaNames(d.areas.map((a) => a.name))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (user?.role === 'worker') {
      if (user.profileComplete && params.get('edit') !== '1') {
        router.replace('/worker/dashboard');
        return;
      }
      setStep((s) => (s < 2 ? 2 : s));
      setPhotos(user.workPhotos || []);
      setFields((f) => ({ ...f, name: f.name || user.name || '', workingHours: user.workingHours || f.workingHours }));
    }
  }, [ready, user, params, router]);

  const analyze = async ({ blob, transcript: heard }) => {
    if (!blob && !heard) {
      setError(tr('We could not hear you. Try again or type your details below.'));
      return;
    }
    setError('');
    setAnalyzing(true);
    try {
      const fd = new FormData();
      if (blob) fd.append('audio', blob, 'voice.wav');
      if (heard) fd.append('transcript', heard);
      const r = await api.form('/ai/worker-profile', fd);
      const areaName = (r.area || '').split(',')[0].trim();
      setFields((f) => ({
        ...f,
        name: r.name || f.name,
        trade: r.trade || f.trade,
        experienceYears: r.experienceYears || f.experienceYears,
        area: areaNames.includes(areaName) ? areaName : f.area,
        rate: r.rate || f.rate,
        skills: r.skills?.length ? r.skills : f.skills,
      }));
      setTranscript(r.transcriptUrdu || heard || '');
      setAudioUrl(r.audioUrl || '');
      setSource(r.source);
      setAnalyzed(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleMic = async () => {
    setError('');
    if (rec.state === 'listening') {
      const r = await rec.stop();
      await analyze(r);
      return;
    }
    const ok = await rec.start();
    if (!ok) {
      setTyping(true);
      setError(tr('Microphone access was denied. Type your details in the box below instead.'));
    }
  };

  const uploadPhotos = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('image', f));
      const r = await api.form('/worker/photos', fd);
      setPhotos(r.workPhotos);
    } catch (err) {
      setError(err.message);
    }
  };

  const missing = [!fields.name && tr('Name'), !fields.trade && tr('Trade'), !fields.area && tr('Area'), !(fields.rate > 0) && tr('Rate')].filter(Boolean);

  const save = async () => {
    if (missing.length) {
      setError(tr('Please fill in first: {list}', { list: missing.join(', ') }));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.put('/worker/profile', { ...fields, voiceTranscript: transcript, voiceIntroUrl: audioUrl });
      const u = await refresh();
      router.push(u?.verification?.status === 'none' ? '/worker/verification?first=1' : '/worker/dashboard');
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const listening = rec.state === 'listening';
  const support = typeof window !== 'undefined' ? voiceSupport() : { record: true };
  const filledCount = [fields.name, fields.trade, fields.experienceYears, fields.area, fields.rate].filter(Boolean).length;

  if (ready && user && user.role !== 'worker') {
    return (
      <div className="container-rr py-16">
        <Notice tone="info" title={tr('You are signed in as a customer')}>{tr('To become a worker, log out first and join with a new phone number.')}</Notice>
        <Button onClick={logout} className="mt-4">{tr('Log out')}</Button>
      </div>
    );
  }

  return (
    <div className="container-rr pb-16 pt-6 sm:pt-10">
      <Stepper step={step} />

      {step === 1 && (
        <div className="flex justify-center pt-8">
          <Card className="w-full max-w-[560px] p-6 sm:p-10">
            <PhoneOtp role="worker" onDone={(u) => { if (u.profileComplete) router.replace('/worker/dashboard'); else setStep(2); }} />
          </Card>
        </div>
      )}

      {step >= 2 && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {step === 2 && (
            <Card className="order-1 p-5 sm:p-10">
              <div className="flex items-start justify-between gap-4">
                <h1 className="t-heading-lg text-[1.75rem] sm:text-[2.25rem]">{tr('Tell us your name, trade, experience and area')}</h1>
                <AudioButton text="Tell us your name, trade, experience and area" />
              </div>

              <div className="flex flex-col items-center py-6">
                <div className="relative flex h-[200px] w-[200px] items-center justify-center rounded-full bg-green-50" aria-hidden={false}>
                  <span className="absolute inset-4 rounded-full bg-green-100" aria-hidden />
                  <MicButton state={analyzing ? 'processing' : analyzed && !listening ? 'idle' : rec.state} size={120} onClick={toggleMic} className="relative" disabled={!support.record && !typing} />
                </div>
                <p className="mt-4 text-2xl font-bold text-green-800" aria-live="polite">
                  {listening ? tr('Listening… {time}', { time: fmtTime(rec.seconds) }) : analyzing ? tr('Understanding…') : analyzed ? tr('Done!') : tr('Tap the mic and speak')}
                </p>
                <p className="text-neutral-600">{listening ? tr('Tap again to stop') : analyzed ? tr('Tap the mic to record again') : tr('Speak in Urdu — about 20 seconds is enough')}</p>
              </div>

              <PhotoUploader photos={photos} onChange={setPhotos} label={tr('Or add photos of your work')} />
              <p className="mt-4 text-center font-bold text-green-700">{tr('No typing needed')}</p>

              <button type="button" onClick={() => setTyping((t) => !t)} className="mx-auto mt-2 flex min-h-11 items-center gap-2 font-bold text-neutral-600 hover:text-green-800">
                <Keyboard className="h-5 w-5" aria-hidden /> {tr('Type your details instead')}
              </button>
              {typing && (
                <div className="mt-2">
                  <label htmlFor="typed" className="sr-only">{tr('Describe yourself')}</label>
                  <textarea id="typed" value={typed} onChange={(e) => setTyped(e.target.value)} rows={3} placeholder={tr('My name is Arif, I have been an electrician for 12 years in G-9, Rs 800 per visit.')} className="w-full rounded-2xl border-2 border-neutral-300 p-4 text-lg outline-none focus:border-green-800" />
                  <Button onClick={() => analyze({ transcript: typed })} loading={analyzing} disabled={!typed.trim()} full variant="quiet" className="mt-2">{tr('Build my profile')}</Button>
                </div>
              )}

              <Notice tone="tip" icon={ShieldCheck} className="mt-5" title={tr('Your phone number is only shown to your customers')}>{tr('after a booking is confirmed')}</Notice>
              {error && <Notice tone="error" className="mt-3">{error}</Notice>}
            </Card>
          )}

          {step === 3 && (
            <Card className="order-1 p-5 sm:p-10">
              <h1 className="t-heading-lg text-[1.75rem] sm:text-[2.25rem]">{tr('Review profile')}</h1>
              <p className="mt-1 text-neutral-600">{tr('Does everything look right? Tap any row to edit it.')}</p>
              <div className="mt-4 rounded-2xl border border-neutral-200 p-4"><AvatarUploader size={88} /></div>
              {transcript && <p lang="ur" className="urdu mt-4 rounded-2xl bg-neutral-50 p-4 text-xl" dir="rtl">{transcript}</p>}
              <div className="mt-5 rounded-2xl border border-neutral-200 p-4">
                <p className="font-bold">{tr('Work photos')} · {photos.length}</p>
                <div className="mt-3"><PhotoUploader photos={photos} onChange={setPhotos} /></div>
              </div>
            </Card>
          )}

          <Card className="order-2 p-5 sm:p-8">
            <AIChip>{listening || analyzing ? tr('AI is building your profile · Live') : tr('AI built your profile')}</AIChip>
            <h2 className="t-heading-md mt-3 text-[1.5rem]">{tr('From your voice')}</h2>
            <div className="mt-3 min-h-[96px] rounded-2xl bg-neutral-50 p-4" aria-live="polite">
              {listening || transcript || rec.transcript ? (
                <p lang="ur" className="urdu text-xl" dir="rtl">{listening ? rec.transcript || '...' : transcript || rec.transcript}</p>
              ) : (
                <p className="text-neutral-500">{tr('What you say will appear here as text.')}</p>
              )}
            </div>
            {source === 'rules' && analyzed && <Notice tone="info" className="mt-3">{tr('Your profile was built with browser speech recognition and rules. Please check the fields below.')}</Notice>}
            <div className="mt-4">
              <ProfileEditor value={fields} onChange={setFields} loading={analyzing ? { name: !fields.name, trade: !fields.trade, experienceYears: !fields.experienceYears, area: !fields.area, rate: !fields.rate } : {}} />
            </div>
            {step === 2 ? (
              <Button onClick={() => setStep(3)} disabled={!filledCount && !analyzed} full className="mt-5">{tr('Continue to review')}</Button>
            ) : (
              <>
                {error && <Notice tone="error" className="mt-3">{error}</Notice>}
                <Button onClick={save} loading={saving} full className="mt-5">{tr('Looks good, create my profile')}</Button>
                <button type="button" onClick={() => setStep(2)} className="mx-auto mt-2 block min-h-11 font-bold text-green-800 hover:underline">{tr('Record again')}</button>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <Shell footer={false}>
      <Suspense fallback={null}>
        <Join />
      </Suspense>
    </Shell>
  );
}
