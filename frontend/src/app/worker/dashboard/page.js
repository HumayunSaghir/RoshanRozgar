'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Check, ChevronRight, MapPin, MessageCircle, Mic, Minus, Phone, Plus, Star, Zap } from 'lucide-react';
import VoiceNote from '@/components/VoiceNote';
import StatusTracker from '@/components/StatusTracker';
import { useAuth, useLang } from '@/components/Providers';
import { AIChip, Avatar, Button, MicButton, Notice, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { fmtTime, useVoiceRecorder } from '@/lib/voice';
import { fmtRs, tradeById } from '@/lib/trades';

function Availability({ status, isAvailable, onToggle, busy }) {
  const { tr } = useLang();
  const on = status === 'available';
  const jobBusy = status === 'busy';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isAvailable}
      onClick={onToggle}
      disabled={busy}
      className={cx(
        'flex min-h-[88px] w-full items-center justify-between gap-4 rounded-3xl px-6 py-4 text-left transition-colors sm:min-h-[104px] sm:px-8',
        on ? 'bg-green-500 text-green-900' : jobBusy ? 'bg-red-50 text-red-800' : 'bg-neutral-75 text-neutral-700'
      )}
    >
      <span>
        <span className="block text-[1.625rem] font-bold leading-tight sm:text-[2rem]">
          {on ? tr('Ready for work') : jobBusy ? tr('Busy') : tr('Not taking jobs')}
        </span>
        <span className="mt-1 flex items-center gap-2 text-lg font-bold">
          {on ? tr('Available') : jobBusy ? tr('On a job right now') : tr('Offline')}
        </span>
      </span>
      <span className={cx('flex h-16 w-16 shrink-0 items-center justify-center rounded-full sm:h-[72px] sm:w-[72px]', on ? 'bg-white text-green-800' : 'bg-white/70 text-neutral-500')}>
        {on ? <Check className="h-8 w-8" aria-hidden /> : <span className="h-4 w-4 rounded-full bg-current" aria-hidden />}
      </span>
    </button>
  );
}

function Stat({ Icon, value, label }) {
  return (
    <div className="flex min-h-[104px] flex-col justify-between rounded-3xl border border-neutral-200 bg-white p-4 sm:min-h-[132px] sm:p-6">
      <Icon className="h-6 w-6 text-green-800" aria-hidden />
      <div>
        <p className="text-[1.75rem] font-bold leading-none sm:text-[2rem]">{value}</p>
        <p className="t-body-sm mt-1 text-neutral-600">{label}</p>
      </div>
    </div>
  );
}

export default function WorkerDashboard() {
  const { tr, lang } = useLang();
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [counter, setCounter] = useState(false);
  const [amount, setAmount] = useState(0);
  const [msg, setMsg] = useState('');
  const [acting, setActing] = useState(false);
  const rec = useVoiceRecorder();

  const load = useCallback(async () => {
    try {
      const d = await api.get('/worker/dashboard');
      setData(d);
      setSel((s) => (s && d.requests.find((r) => r.id === s) ? s : d.requests[0]?.id || null));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    setCounter(false);
    setMsg('');
    if (!sel) return setDetail(null);
    api.get(`/bookings/${sel}/messages`).then((d) => {
      setDetail(d);
      setAmount(d.booking.offeredPrice || 0);
    }).catch(() => setDetail(null));
  }, [sel]);

  if (error) return <Notice tone="error" title={tr('Could not load the dashboard')}>{error}</Notice>;
  if (!data) return <div className="h-96 animate-pulse rounded-3xl bg-neutral-75" aria-hidden />;

  const first = (data.worker.name || '').replace(/^Ustad\s+/, '').split(' ')[0];
  const today = new Date().toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).replace(',', ' ·');
  const selected = data.requests.find((r) => r.id === sel);
  const messages = detail?.messages || [];
  const voiceMsg = messages.find((m) => m.type === 'voice' && m.sender === selected?.customer.id);
  const pendingOffer = [...messages].reverse().find((m) => m.type === 'offer' && m.offer?.status === 'pending');
  const offerFromCustomer = pendingOffer && pendingOffer.sender === selected?.customer.id;
  const agreed = selected && ['agreed'].includes(selected.status);
  const ai = selected?.aiSummary;

  const toggleAvail = async () => {
    setToggling(true);
    try {
      await api.put('/worker/availability', { isAvailable: !data.worker.isAvailable });
      await load();
      await refresh();
    } finally {
      setToggling(false);
    }
  };

  const act = async (fn) => {
    setActing(true);
    setMsg('');
    try {
      await fn();
      await load();
      if (sel) setDetail(await api.get(`/bookings/${sel}/messages`));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setActing(false);
    }
  };

  const accept = () => act(() => api.post(`/bookings/${sel}/offers/${pendingOffer.id}/agree`, {}));
  const decline = () => act(async () => { await api.post(`/bookings/${sel}/decline`, {}); setSel(null); });
  const sendCounter = () => act(async () => { await api.post(`/bookings/${sel}/offers`, { amount }); setCounter(false); });

  const voiceCounter = async () => {
    if (rec.state === 'listening') {
      const r = await rec.stop();
      const fd = new FormData();
      if (r.blob) fd.append('audio', r.blob, 'voice.wav');
      if (r.transcript) fd.append('transcript', r.transcript);
      fd.append('duration', String(r.seconds));
      act(async () => {
        try {
          await api.form(`/bookings/${sel}/offers`, fd);
          setCounter(false);
        } catch (e) {
          if (e.status === 422) setMsg(`${e.message} ${e.data?.transcript ? tr('(Heard: "{text}")', { text: e.data.transcript }) : ''}`);
          else throw e;
        }
      });
      return;
    }
    const ok = await rec.start();
    if (!ok) setMsg(tr('Microphone access was denied. Use +/- to set the price.'));
  };

  const setStatus = (b, status) => act(() => api.post(`/bookings/${b.id}/status`, { status }));
  const job = data.schedule[0];

  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.75rem]">{tr('Assalam-o-Alaikum, {name}', { name: first })}</h1>
      <p className="mt-1 text-lg text-neutral-600">{tr('Today')} · {today}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)]">
        <Availability status={data.status} isAvailable={data.worker.isAvailable} onToggle={toggleAvail} busy={toggling} />
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Stat Icon={Briefcase} value={data.stats.today} label={tr('Jobs today')} />
          <Stat Icon={Star} value={data.stats.rating.toFixed(1)} label={tr('Rating ({n})', { n: data.stats.reviewCount })} />
          <Stat Icon={Zap} value={fmtRs(data.stats.weekEarnings)} label={tr('This week')} />
        </div>
      </div>

      <div className={`mt-8 grid grid-cols-1 items-start gap-8 ${selected ? 'xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)]' : ''}`}>
        <div>
          <h2 className="t-heading-md flex items-center gap-3 text-[1.5rem]">
            {tr('New requests')}
            {data.requests.length > 0 && <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-500 px-2 text-sm text-white" aria-label={tr('{n} new', { n: data.requests.length })}>{data.requests.length}</span>}
          </h2>
          <ul className="mt-4 space-y-3">
            {data.requests.map((r) => {
              const td = tradeById(r.trade);
              const on = r.id === sel;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setSel(r.id)} aria-pressed={on} className={cx('flex min-h-[88px] w-full items-center gap-4 rounded-2xl border-2 p-4 text-left', on ? 'border-green-500 bg-green-50' : 'border-neutral-200 bg-white hover:border-neutral-300')}>
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-800">{td && <td.Icon className="h-7 w-7" aria-hidden />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-bold">{r.aiSummary.title || tr('{trade} job', { trade: tr(td?.label || '') })} · {tr(r.address.area || '')}</span>
                      <span className="block text-neutral-600">{r.distanceKm} {tr('km')} · {tr(r.whenText)}{r.status === 'agreed' ? ` · ${tr('Price agreed')}` : ''}</span>
                    </span>
                    <span className="text-lg font-bold">{fmtRs(r.status === 'agreed' ? r.price : r.offeredPrice)}</span>
                    <ChevronRight className="h-5 w-5 text-neutral-500" aria-hidden />
                  </button>
                </li>
              );
            })}
            {!data.requests.length && <li className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-600">{tr('No new requests right now. Stay available and customers will find you.')}</li>}
          </ul>

          <h2 className="t-heading-md mt-8 text-[1.5rem]">{tr("Today's schedule")}</h2>
          <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
            {job ? (
              <>
                <StatusTracker status={job.status} />
                <p className="mt-5 text-lg font-bold">{tr(job.whenText)} · {job.aiSummary.title || tr(tradeById(job.trade)?.label || '')} · {tr(job.address.area || '')} · {fmtRs(job.price)}</p>
                <p className="mt-1 text-neutral-600">{tr('Customer')}: {job.customer.name}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button size="lg" variant="secondary" icon={MapPin} href={`https://www.google.com/maps/dir/?api=1&destination=${job.address.lat},${job.address.lng}`} target="_blank" rel="noreferrer">{tr('Open map')}</Button>
                  {job.customer.phone && <Button size="lg" variant="secondary" icon={Phone} href={`tel:${job.customer.phone}`}>{tr('Call')}</Button>}
                  <Button size="lg" variant="secondary" icon={MessageCircle} href={`/messages?b=${job.id}`}>{tr('Chat')}</Button>
                  {job.status === 'confirmed' && <Button size="lg" loading={acting} onClick={() => setStatus(job, 'on_the_way')}>{tr('I am on my way')}</Button>}
                  <Button size="lg" loading={acting} onClick={() => setStatus(job, 'completed')} icon={Check}>{tr('Mark job complete')}</Button>
                </div>
              </>
            ) : (
              <p className="text-neutral-600">{tr('No confirmed jobs today.')}</p>
            )}
          </div>
        </div>

        {selected && (
        <section aria-label={tr('Request detail')} className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 xl:sticky xl:top-[124px]">
          {selected && (
            <>
              <div className="flex items-center gap-4">
                <Avatar initials={selected.customer.initials} size={64} className="!bg-blue-100 !text-blue-800" />
                <div className="min-w-0 flex-1">
                  <p className="t-heading-sm text-[1.375rem]">{selected.customer.name}</p>
                  <p className="text-neutral-600">{tr(selected.address.area || '')} · {tr('{n} km away', { n: selected.distanceKm })} · {new Date(selected.createdAt).toLocaleTimeString(lang === 'ur' ? 'ur-PK' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-800" title={tr('The phone number is shared after the booking is confirmed')}><Phone className="h-6 w-6" aria-hidden /></span>
              </div>

              {voiceMsg ? (
                <VoiceNote id={voiceMsg.id} audioUrl={voiceMsg.audioUrl} duration={voiceMsg.duration} transcriptUrdu={voiceMsg.transcriptUrdu} transcriptRoman={voiceMsg.transcriptRoman} className="mt-4" />
              ) : (
                selected.problem.text && <p className="mt-4 rounded-2xl bg-neutral-50 p-4 text-lg">{selected.problem.text}</p>
              )}

              {(ai.summary || ai.title) && (
                <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                  <AIChip className="!bg-transparent !p-0">{tr('AI summary')}{ai.source === 'rules' ? ` · ${tr('rules')}` : ''}</AIChip>
                  <p className="mt-2 text-xl font-bold">{ai.summary || ai.title}</p>
                  {ai.priceMax > 0 && <p className="text-neutral-600">{tr(selected.whenText)} · {tr('Estimate')} {fmtRs(ai.priceMin)}–{ai.priceMax.toLocaleString('en-US')}</p>}
                </div>
              )}

              <div className="mt-4 rounded-2xl border-2 border-neutral-200 p-4">
                <p className="text-neutral-600">{agreed ? tr('Price agreed') : offerFromCustomer ? tr('Customer offer') : tr('Your offer')}</p>
                <p className="mt-1 text-[2rem] font-bold">{fmtRs(agreed ? selected.price : pendingOffer?.offer?.amount || selected.offeredPrice)}</p>
              </div>

              {msg && <Notice tone="error" className="mt-3">{msg}</Notice>}

              {agreed ? (
                <Notice tone="ok" icon={Check} className="mt-4" title={tr('You both agreed on the price')}>{tr('You will be marked Busy once the customer confirms.')}</Notice>
              ) : counter ? (
                <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                  <p className="font-bold">{tr('Set your price')}</p>
                  <div className="mt-3 flex items-center justify-center gap-4">
                    <button type="button" aria-label={tr('Decrease')} onClick={() => setAmount((a) => Math.max(100, a - 100))} className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-neutral-300 bg-white"><Minus className="h-6 w-6" aria-hidden /></button>
                    <span className="min-w-28 text-center text-3xl font-bold">{fmtRs(amount)}</span>
                    <button type="button" aria-label={tr('Increase')} onClick={() => setAmount((a) => a + 100)} className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-neutral-300 bg-white"><Plus className="h-6 w-6" aria-hidden /></button>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <MicButton size={56} state={rec.state} onClick={voiceCounter} />
                    <span className="text-neutral-600">{rec.state === 'listening' ? tr('Listening… {time}', { time: fmtTime(rec.seconds) }) : tr('Or say the amount aloud')}</span>
                  </div>
                  <div className="mt-3 flex gap-3">
                    <Button className="flex-1" loading={acting} onClick={sendCounter}>{tr('Send')}</Button>
                    <Button variant="tertiary" onClick={() => setCounter(false)}>{tr('Back')}</Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button full icon={Check} className="mt-4" loading={acting} disabled={!offerFromCustomer} onClick={accept}>{tr('Accept')}</Button>
                  {!offerFromCustomer && pendingOffer && <p className="t-body-sm mt-2 text-center text-neutral-500">{tr('Waiting for the customer to reply.')}</p>}
                  <div className="mt-3 flex items-center gap-3">
                    <Button variant="secondary" icon={Mic} className="flex-1" onClick={() => setCounter(true)}>{tr('Counter by voice')}</Button>
                    <Button variant="tertiary" onClick={decline} loading={acting}>{tr('Decline')}</Button>
                  </div>
                </>
              )}
              <Link href={`/messages?b=${selected.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-green-800 hover:underline"><MessageCircle className="h-5 w-5" aria-hidden /> {tr('Open chat')}</Link>
            </>
          )}
        </section>
        )}
      </div>
      <p className="sr-only">{user?.name}</p>
    </div>
  );
}
