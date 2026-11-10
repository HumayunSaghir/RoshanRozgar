'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { assetUrl } from '@/lib/api';
import { fmtTime, speak, stopSpeaking } from '@/lib/voice';
import { cx } from './ui';
import { useLang } from './Providers';

function bars(seed, n = 28) {
  let s = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  return Array.from({ length: n }, () => {
    s = (s * 48271) % 2147483647;
    return 8 + (s % 22);
  });
}

// A voice note: play button, waveform, duration, and an Urdu transcript with a Roman caption.
// If the audio file is not available (seeded notes), the transcript is read aloud instead.
export default function VoiceNote({ id, audioUrl, duration = 0, transcriptUrdu, transcriptRoman, source, mine, label, tone = 'grey', hideText, className }) {
  const { tr, lang } = useLang();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const heights = useMemo(() => bars(id || transcriptRoman || 'x'), [id, transcriptRoman]);

  useEffect(() => () => {
    audioRef.current?.pause();
    stopSpeaking();
  }, []);

  // Show one language only: Urdu script in Urdu mode, otherwise the readable (Latin) text.
  const shown = lang === 'ur' ? transcriptUrdu || transcriptRoman : transcriptRoman || transcriptUrdu;
  const shownIsUrdu = lang === 'ur' ? Boolean(transcriptUrdu) : !transcriptRoman && Boolean(transcriptUrdu);

  const toggle = () => {
    if (playing) {
      audioRef.current?.pause();
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    if (audioUrl) {
      const a = new Audio(assetUrl(audioUrl));
      audioRef.current = a;
      a.onended = () => setPlaying(false);
      a.onerror = () => setPlaying(false);
      a.play().catch(() => setPlaying(false));
    } else {
      const ok = speak(shown, lang === 'ur' && transcriptUrdu ? 'ur' : 'en');
      if (!ok) return setPlaying(false);
      const t = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(t);
          setPlaying(false);
        }
      }, 400);
    }
  };

  return (
    <div className={cx('rounded-2xl p-4', tone === 'mine' ? 'bg-green-50' : 'bg-neutral-50', className)}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={toggle} aria-label={tr(playing ? 'Pause' : 'Play voice note')} className="flex cursor-pointer h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-800 text-white hover:bg-green-700">
          {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />}
        </button>
        <div className="flex h-8 flex-1 items-center gap-[3px]" aria-hidden>
          {heights.map((h, i) => (
            <span key={i} className={cx('w-[3px] rounded-full', playing ? 'bg-green-800' : 'bg-neutral-400')} style={{ height: h }} />
          ))}
        </div>
        {duration > 0 && <span className="t-body-sm shrink-0 text-neutral-500">{fmtTime(duration)}</span>}
      </div>
      {!hideText && shown ? (
        <p lang={shownIsUrdu ? 'ur' : undefined} dir={shownIsUrdu ? 'rtl' : undefined} className={cx('mt-2 text-text', shownIsUrdu ? 'urdu text-lg' : 'text-base')}>
          {label ? `${tr(label)}: ` : ''}
          {shown}
        </p>
      ) : null}
      {!hideText && !shown && label && <p className="t-body-sm mt-1 text-neutral-600">{tr(label)}</p>}
    </div>
  );
}
