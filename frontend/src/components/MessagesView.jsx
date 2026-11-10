'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Minus, Mic, Phone, Plus, Send } from 'lucide-react';
import VoiceNote from '@/components/VoiceNote';
import StatusTracker from '@/components/StatusTracker';
import WorkerCard from '@/components/WorkerCard';
import { useAuth, useLang } from '@/components/Providers';
import { Avatar, Button, MicButton, Notice, cx } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { fmtTime, useVoiceRecorder } from '@/lib/voice';
import { fmtRs, tradeById } from '@/lib/trades';

// Server-generated system lines arrive in English; translate the known shapes.
function sysLine(tr, text) {
  const busy = / is now Busy for other customers$/.exec(text || '');
  if (busy) return tr('{name} is now Busy for other customers', { name: text.slice(0, busy.index) });
  return tr(text);
}

const QUICK = ['When can you come?', 'How much will it cost?', 'I will send the address'];

function OfferBubble({ m, mine, canAct, onAgree, onCounter, acting }) {
  const { tr } = useLang();
  const status = m.offer.status;
  return (
    <div className={cx('max-w-[420px] rounded-3xl border-2 bg-white p-4', status === 'agreed' ? 'border-green-500' : 'border-neutral-200', mine ? 'ml-auto' : '')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-neutral-600">{tr('Price offer')}</p>
        {status === 'agreed' && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 font-bold text-green-800"><Check className="h-4 w-4" aria-hidden /> {tr('Agreed')}</span>}
        {status === 'countered' && <span className="rounded-full bg-neutral-75 px-3 py-1 text-sm font-bold text-neutral-600">{tr('Countered')}</span>}
      </div>
      <p className="mt-1 text-[2rem] font-bold leading-tight">{fmtRs(m.offer.amount)}</p>
      <p className="text-neutral-600">{tr(m.offer.whenLabel === 'now' ? 'Now' : m.offer.whenLabel === 'tonight' ? 'This evening' : 'Tomorrow')}</p>
      {status === 'pending' && canAct && (
        <div className="mt-3 flex gap-2">
          <Button size="lg" className="flex-1" icon={Check} loading={acting} onClick={onAgree}>{tr('Agree')}</Button>
          <Button size="lg" variant="secondary" className="flex-1" onClick={onCounter}>{tr('Counter')}</Button>
        </div>
      )}
      {status === 'pending' && !canAct && <p className="t-body-sm mt-2 text-neutral-500">{tr('Waiting for a reply…')}</p>}
      {status === 'agreed' && <p className="mt-2 text-center font-bold text-green-700">{tr('You both agreed on the price')}</p>}
    </div>
  );
}

function Chat({ base = '/messages' }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, refresh } = useAuth();
  const { tr } = useLang();
  const bid = params.get('b');
  const [list, setList] = useState(null);
  const [chat, setChat] = useState(null);
  const [text, setText] = useState('');
  const [counter, setCounter] = useState(false);
  const [amount, setAmount] = useState(0);
  const [msg, setMsg] = useState('');
  const [conflict, setConflict] = useState(null);
  const [acting, setActing] = useState(false);
  const rec = useVoiceRecorder();
  const endRef = useRef(null);
  const isWorker = user?.role === 'worker';

  const loadList = useCallback(async () => {
    try {
      const d = await api.get('/bookings/mine');
      setList(d.bookings);
    } catch {
      setList([]);
    }
  }, []);
  const loadChat = useCallback(async () => {
    if (!bid) return setChat(null);
    try {
      setChat(await api.get(`/bookings/${bid}/messages`));
    } catch (e) {
      setMsg(tr(e.message));
    }
  }, [bid, tr]);

  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => {
    setConflict(null);
    setCounter(false);
    loadChat();
    const t = setInterval(loadChat, 5000);
    return () => clearInterval(t);
  }, [loadChat]);
  useEffect(() => {
    if (!bid && list?.length && window.matchMedia('(min-width: 1024px)').matches) router.replace(`${base}${qs({ b: list[0].id })}`);
  }, [bid, list, router, base]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat?.messages?.length]);

  const booking = chat?.booking;
  const other = booking ? (isWorker ? booking.customer : booking.worker) : null;
  const messages = chat?.messages || [];
  const pending = [...messages].reverse().find((m) => m.type === 'offer' && m.offer?.status === 'pending');
  const closed = booking && ['completed', 'cancelled', 'declined'].includes(booking.status);

  const run = async (fn) => {
    setActing(true);
    setMsg('');
    try {
      await fn();
      await Promise.all([loadChat(), loadList(), refresh()]);
    } catch (e) {
      if (e.data?.code === 'SLOT_TAKEN') setConflict(e.data.alternatives || []);
      else setMsg(tr(e.message));
    } finally {
      setActing(false);
    }
  };

  const sendText = (t) => {
    const v = (t ?? text).trim();
    if (!v) return;
    setText('');
    return run(() => api.post(`/bookings/${bid}/messages`, { text: v }));
  };

  const toggleMic = async () => {
    if (rec.state === 'listening') {
      const r = await rec.stop();
      if (!r.blob && !r.transcript) return setMsg(tr('We could not hear you. Please try again.'));
      const fd = new FormData();
      if (r.blob) fd.append('audio', r.blob, 'voice.wav');
      if (r.transcript) fd.append('transcript', r.transcript);
      fd.append('duration', String(r.seconds));
      run(() => api.form(`/bookings/${bid}/messages`, fd));
      return;
    }
    const ok = await rec.start();
    if (!ok) setMsg(tr('Microphone access was denied. Please type your message.'));
  };

  const agree = (m) => run(() => api.post(`/bookings/${bid}/offers/${m.id}/agree`, {}));
  const sendCounter = () => run(async () => { await api.post(`/bookings/${bid}/offers`, { amount }); setCounter(false); });
  const confirm = async () => {
    setActing(true);
    setMsg('');
    try {
      await api.post(`/bookings/${bid}/confirm`, {});
      router.push(`/bookings/${bid}`);
    } catch (e) {
      if (e.data?.code === 'SLOT_TAKEN') setConflict(e.data.alternatives || []);
      else setMsg(tr(e.message));
      setActing(false);
    }
  };
  const cancel = () => run(() => api.post(`/bookings/${bid}/cancel`, {}));

  const preview = (b) => {
    const l = b.lastMessage;
    if (!l) return b.aiSummary.title || tr(tradeById(b.trade)?.label);
    if (l.type === 'voice') return `${tr('Voice note')}${l.duration ? ` · ${fmtTime(l.duration)}` : ''}`;
    if (l.type === 'offer') return `${tr('Offer')} ${fmtRs(l.offer?.amount)}`;
    return l.text;
  };

  const actions = booking ? (
    <>
        {conflict && (
          <div className="mt-5 rounded-2xl border-2 border-red-200 bg-red-50 p-4" role="alert">
            <p className="t-heading-sm text-red-800">{tr('This worker was just booked')}</p>
            <p className="mt-1 text-red-800">{tr('Another customer booked this worker first. These workers are free:')}</p>
            <div className="mt-3 space-y-3">
              {conflict.map((w) => <WorkerCard key={w.id} worker={w} onOpen={(id) => router.push(`/workers/${id}${qs({ when: booking.whenLabel })}`)} />)}
              {!conflict.length && <p>{tr('No one else is free right now. Try a different time.')}</p>}
            </div>
            <Button full className="mt-3" href={`/workers${qs({ trade: booking.trade, when: booking.whenLabel })}`}>{tr('Choose another worker')}</Button>
          </div>
        )}
        {!isWorker && booking.status === 'agreed' && !conflict && (
          <>
            <Notice tone="tip" className="mt-5" title={tr('{name} becomes Busy once you confirm', { name: booking.worker.name.replace('Ustad ', '').split(' ')[0] })}>{tr('No one else can book them for this time')}</Notice>
            <Button full icon={Check} className="mt-4" loading={acting} onClick={confirm}>{tr('Confirm booking')}</Button>
          </>
        )}
        {!isWorker && booking.status === 'requested' && <Notice tone="info" className="mt-5">{tr('Both of you must agree on a price first.')}</Notice>}
        {isWorker && booking.status === 'requested' && pending && pending.sender !== user?.id && <Notice tone="info" className="mt-5">{tr('Agree to the offer or send a counter-offer in the chat.')}</Notice>}
        {!isWorker && booking.status === 'confirmed' && <Button full className="mt-5" href={`/bookings/${booking.id}`}>{tr('View booking')}</Button>}
        {!isWorker && ['confirmed', 'on_the_way'].includes(booking.status) && <Notice tone="info" className="mt-4">{tr('Your worker marks "On the way" and "Done" here as the job progresses.')}</Notice>}
        {!isWorker && ['requested', 'agreed', 'confirmed'].includes(booking.status) && (
          <button type="button" onClick={cancel} className="mx-auto mt-3 block min-h-11 text-neutral-600 hover:text-red-600">{tr('Cancel free until worker leaves')}</button>
        )}
    </>
  ) : null;

  const statusBar = booking && isWorker && ['confirmed', 'on_the_way'].includes(booking.status) ? (
    <div className="flex flex-wrap items-center gap-3 border-b border-green-200 bg-green-50 px-4 py-3 lg:px-6">
      <p className="min-w-0 flex-1 font-bold text-green-800">{tr(booking.status === 'confirmed' ? 'Booking confirmed. Tap when you leave.' : 'You are on the way. Tap when the job is done.')}</p>
      {booking.status === 'confirmed' && <Button size="lg" loading={acting} onClick={() => run(() => api.post(`/bookings/${bid}/status`, { status: 'on_the_way' }))}>{tr('I am on my way')}</Button>}
      <Button size="lg" variant={booking.status === 'confirmed' ? 'secondary' : 'primary'} icon={Check} loading={acting} onClick={() => run(() => api.post(`/bookings/${bid}/status`, { status: 'completed' }))}>{tr('Mark job complete')}</Button>
    </div>
  ) : booking && isWorker && booking.status === 'agreed' ? (
    <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 font-bold text-blue-800 lg:px-6" role="status">{tr('Price agreed. Waiting for the customer to confirm the booking. Then you can mark "On the way" and "Done" here.')}</div>
  ) : null;

  const showChatMobile = Boolean(bid);

  return (
    <div className="grid min-h-[calc(100vh-72px)] lg:min-h-[calc(100vh-100px)] lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_400px]">
      {/* inbox */}
      <aside className={cx('border-neutral-200 bg-white p-4 lg:border-r lg:p-6', showChatMobile && 'hidden lg:block')} aria-label={tr('Conversations')}>
        <h1 className="t-heading-md mb-4 text-[1.5rem]">{tr('Messages')}</h1>
        <ul className="space-y-2">
          {(list || []).map((b) => {
            const o = isWorker ? b.customer : b.worker;
            return (
              <li key={b.id}>
                <Link href={`${base}${qs({ b: b.id })}`} aria-current={b.id === bid ? 'true' : undefined} className={cx('flex min-h-[88px] items-center gap-4 rounded-2xl p-4', b.id === bid ? 'bg-green-50' : 'hover:bg-neutral-50')}>
                  <Avatar initials={o.initials} size={56} />
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-bold">{o.name}</span>
                    <span className="block truncate text-neutral-600">{preview(b)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          {list && !list.length && (
            <li className="rounded-2xl bg-neutral-50 p-5 text-neutral-600">
              {tr('No conversations yet.')} {isWorker ? tr('Customer requests will appear here.') : <><Link href="/workers" className="font-bold text-green-800 underline">{tr('Find a worker')}</Link> {tr('and tap "Chat" to start.')}</>}
            </li>
          )}
          {!list && <li className="h-24 animate-pulse rounded-2xl bg-neutral-75" aria-hidden />}
        </ul>
      </aside>

      {/* conversation */}
      <section className={cx('flex min-h-[70vh] min-w-0 flex-col bg-neutral-25', !showChatMobile && 'hidden lg:flex')} aria-label={tr('Chat')}>
        {booking ? (
          <>
            <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 lg:px-6">
              <Link href={base} aria-label={tr('Back')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-neutral-50 lg:hidden"><ArrowLeft className="h-6 w-6" aria-hidden /></Link>
              <Avatar initials={other.initials} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{other.name}</p>
                <p className="flex items-center gap-2 text-green-700">
                  {!isWorker && <><span className="h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden /> {tr(booking.status === 'confirmed' ? 'Booked' : 'Available')} · {booking.distanceKm ?? ''} {tr('km')}</>}
                  {isWorker && <span className="text-neutral-600">{booking.address.area}</span>}
                </p>
              </div>
              {other.phone ? (
                <a href={`tel:${other.phone}`} aria-label={tr('Call')} className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-800 hover:bg-green-100"><Phone className="h-6 w-6" aria-hidden /></a>
              ) : (
                <span title={tr('The phone number is shared after the booking is confirmed')} className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-75 text-neutral-400"><Phone className="h-6 w-6" aria-hidden /></span>
              )}
            </div>

            {statusBar}
            <details className="border-b border-neutral-200 bg-white 2xl:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-bold">{tr('Booking summary')} <ChevronDown className="h-5 w-5" aria-hidden /></summary>
              <div className="px-4 pb-4"><Summary booking={booking} isWorker={isWorker} />{actions}</div>
            </details>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 lg:px-6" aria-live="polite">
              <p className="text-center text-neutral-500">{tr('Voice notes are transcribed automatically')}</p>
              {messages.map((m) => {
                const mine = m.sender === user?.id;
                if (m.type === 'system') return <p key={m.id} className="text-center text-sm font-bold text-neutral-500">{sysLine(tr, m.text)}</p>;
                if (m.type === 'offer') {
                  return (
                    <div key={m.id} className="flex">
                      <OfferBubble m={m} mine={mine} acting={acting} canAct={!mine && !closed && booking.status === 'requested'} onAgree={() => agree(m)} onCounter={() => { setAmount(m.offer.amount); setCounter(true); }} />
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={cx('flex', mine && 'justify-end')}>
                    <div className="max-w-[520px] min-w-[240px]">
                      {m.type === 'voice' ? (
                        <VoiceNote id={m.id} audioUrl={m.audioUrl} duration={m.duration} transcriptUrdu={m.transcriptUrdu} transcriptRoman={m.transcriptRoman} source={m.transcriptSource} tone={mine ? 'mine' : 'grey'} label={mine ? tr('You') : other.name.replace('Ustad ', '').split(' ')[0]} />
                      ) : (
                        <p className={cx('rounded-3xl px-5 py-3 text-lg', mine ? 'bg-green-50' : 'bg-neutral-50')}>{m.text}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {counter && (
              <div className="mx-4 mb-3 rounded-2xl border-2 border-neutral-200 bg-white p-4 lg:mx-6">
                <p className="font-bold">{tr('Set your price')}</p>
                <div className="mt-2 flex items-center justify-center gap-4">
                  <button type="button" aria-label={tr('Decrease')} onClick={() => setAmount((a) => Math.max(100, a - 100))} className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-neutral-300"><Minus className="h-6 w-6" aria-hidden /></button>
                  <span className="min-w-28 text-center text-3xl font-bold">{fmtRs(amount)}</span>
                  <button type="button" aria-label={tr('Increase')} onClick={() => setAmount((a) => a + 100)} className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-neutral-300"><Plus className="h-6 w-6" aria-hidden /></button>
                </div>
                <div className="mt-3 flex gap-3">
                  <Button className="flex-1" loading={acting} onClick={sendCounter}>{tr('Send offer')}</Button>
                  <Button variant="tertiary" onClick={() => setCounter(false)}>{tr('Back')}</Button>
                </div>
              </div>
            )}

            {msg && <Notice tone="error" className="mx-4 mb-3 lg:mx-6">{msg}</Notice>}

            {!closed && (
              <div className="border-t border-neutral-200 bg-white px-4 pb-4 pt-3 lg:px-6">
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-3" role="group" aria-label={tr('Quick replies')}>
                  {QUICK.map((q) => (
                    <button key={q} type="button" onClick={() => sendText(tr(q))} className="h-12 shrink-0 rounded-full border-2 border-neutral-300 bg-white px-5 font-bold hover:bg-neutral-50">{tr(q)}</button>
                  ))}
                  {!pending && booking.status === 'requested' && (
                    <button type="button" onClick={() => { setAmount(booking.offeredPrice || 1000); setCounter(true); }} className="h-12 shrink-0 rounded-full border-2 border-green-500 bg-green-50 px-5 font-bold text-green-800">{tr('Set price')}</button>
                  )}
                </div>
                {rec.state === 'listening' && <p className="mb-2 font-bold text-green-800" role="status"><span className="rr-pulse mr-2 inline-block h-3 w-3 rounded-full bg-red-500" aria-hidden />{tr('Listening…')} {fmtTime(rec.seconds)} {rec.transcript && <span lang="ur" className="urdu mr-2 font-normal" dir="rtl">{rec.transcript}</span>}</p>}
                <form onSubmit={(e) => { e.preventDefault(); sendText(); }} className="flex items-center gap-3">
                  <label htmlFor="msg" className="sr-only">{tr('Type a message')}</label>
                  <input id="msg" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr('Type a message (optional)...')} className="h-14 min-w-0 flex-1 rounded-full bg-neutral-50 px-6 text-lg outline-none focus:ring-2 focus:ring-green-800" />
                  {text.trim() ? (
                    <Button type="submit" size="icon" icon={Send} aria-label={tr('Send')} className="!h-14 !w-14" />
                  ) : (
                    <MicButton size={56} state={rec.state} onClick={toggleMic} label={rec.state === 'listening' ? tr('Stop and send') : tr('Tap to speak')} />
                  )}
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-neutral-600">{tr('Select a conversation.')}</div>
        )}
      </section>

      {/* booking summary */}
      <aside className="hidden border-l border-neutral-200 bg-white p-6 2xl:block" aria-label={tr('Booking summary')}>
        {booking ? (
          <>
            <Summary booking={booking} isWorker={isWorker} />
            {actions}
          </>
        ) : null}
      </aside>
    </div>
  );
}

function Summary({ booking, isWorker }) {
  const { tr } = useLang();
  const other = isWorker ? booking.customer : booking.worker;
  const rows = [
    [tr(isWorker ? 'Customer' : 'Worker'), other.name],
    [tr('Job'), booking.aiSummary.title || tr(tradeById(booking.trade)?.label)],
    [tr('Time'), tr(booking.whenText)],
    [tr('Price'), booking.price ? fmtRs(booking.price) : booking.offeredPrice ? `${fmtRs(booking.offeredPrice)} (${tr('offer')})` : '-'],
    [tr('Address'), booking.address.text],
    [tr('Payment'), tr('Cash (mock)')],
  ];
  return (
    <div>
      <h2 className="t-heading-md text-[1.5rem]">{tr('Booking summary')}</h2>
      <dl className="mt-5 space-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4">
            <dt className="text-lg text-neutral-600">{k}</dt>
            <dd className="text-right text-lg font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6"><StatusTracker status={booking.status} /></div>
    </div>
  );
}

export default function MessagesView({ base = '/messages' }) {
  return (
    <Suspense fallback={null}>
      <Chat base={base} />
    </Suspense>
  );
}
