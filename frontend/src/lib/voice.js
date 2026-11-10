'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ------------------------------------------------------------------------------------------
// Recording. MediaRecorder captures the audio; the browser's SpeechRecognition (Urdu, ur-PK)
// runs alongside to give a live transcript. The audio is converted to 16 kHz mono WAV so the
// server-side AI model can read it regardless of browser codec.
// ------------------------------------------------------------------------------------------

function encodeWav(float32, sampleRate) {
  const buffer = new ArrayBuffer(44 + float32.length * 2);
  const view = new DataView(buffer);
  const write = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + float32.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, float32.length * 2, true);
  let offset = 44;
  for (let i = 0; i < float32.length; i += 1, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: 'audio/wav' });
}

export async function blobToWav(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return blob;
  const ctx = new Ctx();
  try {
    const arr = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arr);
    const target = 16000;
    const frames = Math.ceil(decoded.duration * target);
    const off = new OfflineAudioContext(1, frames, target);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    return encodeWav(rendered.getChannelData(0), target);
  } catch {
    return blob;
  } finally {
    ctx.close?.();
  }
}

const SpeechRec = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);

export function voiceSupport() {
  if (typeof window === 'undefined') return { record: false, recognize: false };
  return { record: Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder), recognize: Boolean(SpeechRec()) };
}

/**
 * useVoiceRecorder
 *   state: 'idle' | 'listening' | 'processing' | 'denied' | 'unsupported'
 *   start() begins; stop() resolves { blob, transcript, seconds } (blob is WAV, may be null)
 */
export function useVoiceRecorder() {
  const [state, setState] = useState('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const speechRef = useRef(null);
  const finalRef = useRef('');
  const interimRef = useRef('');
  const timerRef = useRef(null);
  const startedAt = useRef(0);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      speechRef.current?.stop();
    } catch {
      /* already stopped */
    }
    speechRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    const support = voiceSupport();
    if (!support.record && !support.recognize) {
      setState('unsupported');
      return false;
    }
    finalRef.current = '';
    interimRef.current = '';
    chunksRef.current = [];
    setTranscript('');
    setSeconds(0);
    try {
      if (support.record) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        streamRef.current = stream;
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
        rec.start();
        recRef.current = rec;
      }
    } catch {
      setState('denied');
      return false;
    }
    const SR = SpeechRec();
    if (SR) {
      try {
        const sr = new SR();
        sr.lang = 'ur-PK';
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i += 1) {
            const r = e.results[i];
            if (r.isFinal) finalRef.current += `${r[0].transcript} `;
            else interim += r[0].transcript;
          }
          interimRef.current = interim;
          setTranscript(`${finalRef.current}${interim}`.trim());
        };
        sr.onend = () => {
          // Chrome ends recognition after silence; restart while still recording.
          if (speechRef.current === sr && recRef.current?.state === 'recording') {
            try {
              sr.start();
            } catch {
              /* ignore */
            }
          }
        };
        sr.onerror = () => {};
        sr.start();
        speechRef.current = sr;
      } catch {
        /* recognition is optional */
      }
    }
    startedAt.current = Date.now();
    timerRef.current = setInterval(() => setSeconds(Math.round((Date.now() - startedAt.current) / 1000)), 250);
    setState('listening');
    return true;
  }, []);

  const stop = useCallback(async () => {
    setState('processing');
    const secs = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    const rec = recRef.current;
    let blob = null;
    if (rec && rec.state !== 'inactive') {
      blob = await new Promise((resolve) => {
        rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }));
        rec.stop();
      });
    }
    const text = `${finalRef.current}${interimRef.current}`.trim();
    cleanup();
    recRef.current = null;
    if (blob) blob = await blobToWav(blob);
    setTranscript(text);
    setState('idle');
    return { blob, transcript: text, seconds: secs };
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    recRef.current = null;
    setState('idle');
    setSeconds(0);
    setTranscript('');
  }, [cleanup]);

  return { state, seconds, transcript, start, stop, reset, setState };
}

// ------------------------------------------------------------------------------------------
// Listening: reads instructions aloud with the browser's text-to-speech (Urdu voice when the
// device has one, otherwise the default voice). Every instruction has a play button.
// ------------------------------------------------------------------------------------------
// speak(text, lang): lang 'ur' uses an Urdu voice when the device has one, otherwise the closest
// available voice; lang 'en' uses an English voice.
export function speak(text, lang = 'en') {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return false;
  window.speechSynthesis.cancel();
  const voices = window.speechSynthesis.getVoices();
  let voice = null;
  let code = 'en-US';
  if (lang === 'ur') {
    voice = voices.find((v) => v.lang.toLowerCase().startsWith('ur')) || voices.find((v) => v.lang.startsWith('hi')) || null;
    code = voice ? voice.lang : 'ur-PK';
  } else {
    voice = voices.find((v) => v.lang === 'en-IN') || voices.find((v) => v.lang.startsWith('en')) || null;
    if (voice) code = voice.lang;
  }
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = code;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
