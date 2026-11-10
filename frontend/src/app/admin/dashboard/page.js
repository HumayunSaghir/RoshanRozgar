'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Check, Clock, Phone, ShieldCheck, Users, X, XCircle } from 'lucide-react';
import { Avatar, Button, Card, Notice, cx } from '@/components/ui';
import { useLang } from '@/components/Providers';
import { api, assetUrl } from '@/lib/api';
import { tradeById } from '@/lib/trades';

const TABS = [
  { id: 'pending', label: 'Pending', Icon: Clock },
  { id: 'approved', label: 'Approved', Icon: BadgeCheck },
  { id: 'rejected', label: 'Rejected', Icon: XCircle },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function DocThumb({ url, label, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen({ url, label })} className="group relative block overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 text-left" aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assetUrl(url)} alt={label} loading="lazy" decoding="async" className="aspect-[4/3] max-h-72 w-full object-cover transition group-hover:scale-[1.02]" />
      <span className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-1.5 text-sm font-bold text-white">{label}</span>
    </button>
  );
}

function Applicant({ w, onDone, onOpen }) {
  const { tr, trLoc } = useLang();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const act = async (kind) => {
    if (kind === 'reject' && comment.trim().length < 3) { setError(tr('Please tell the worker why the documents were rejected')); return; }
    setBusy(kind);
    setError('');
    try {
      await api.post(`/admin/workers/${w.id}/${kind}`, kind === 'reject' ? { comment } : {});
      onDone();
    } catch (e) {
      setError(tr(e.message));
      setBusy('');
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-start gap-4">
        <Avatar initials={w.initials} src={w.avatarUrl} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{w.name || tr('Unnamed worker')}</p>
          <p className="text-neutral-600">{tr(tradeById(w.trade)?.label || w.trade)} · {trLoc(w.area)} · {tr('{n} years of experience', { n: w.experienceYears })}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" aria-hidden /> {w.phone}</span>
            {w.submittedAt && <span>{tr('Submitted')}: {fmtDate(w.submittedAt)}</span>}
            {w.attempts > 1 && <span className="font-bold text-yellow-800">{tr('Attempt {n}', { n: w.attempts })}</span>}
          </p>
        </div>
      </div>

      {w.idUrl && w.selfieUrl && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DocThumb url={w.idUrl} label={tr('ID card')} onOpen={onOpen} />
          <DocThumb url={w.selfieUrl} label={tr('Selfie with ID')} onOpen={onOpen} />
        </div>
      )}

      {w.status === 'rejected' && w.adminComment && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-red-800"><b>{tr('Reason')}:</b> {w.adminComment}</p>}
      {w.status !== 'pending' && w.reviewedAt && <p className="mt-2 text-sm text-neutral-500">{tr('Reviewed')}: {fmtDate(w.reviewedAt)}</p>}

      {w.status === 'pending' && (
        <div className="mt-4">
          {!rejecting ? (
            <div className="flex flex-wrap gap-3">
              <Button icon={Check} size="lg" loading={busy === 'approve'} disabled={Boolean(busy)} onClick={() => act('approve')} className="flex-1 sm:flex-none">{tr('Approve')}</Button>
              <Button icon={X} size="lg" variant="secondary" disabled={Boolean(busy)} onClick={() => setRejecting(true)} className="flex-1 sm:flex-none">{tr('Reject')}</Button>
            </div>
          ) : (
            <div className="rounded-2xl bg-red-50 p-4">
              <label htmlFor={`c-${w.id}`} className="font-bold text-red-800">{tr('Reason for rejection (the worker will see this)')}</label>
              <textarea id={`c-${w.id}`} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={300} placeholder={tr('Example: The ID photo is blurry. Please upload a clearer picture.')} className="mt-2 w-full rounded-2xl border-2 border-neutral-300 bg-white p-3 text-lg outline-none focus:border-green-800" />
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="danger" size="lg" icon={X} loading={busy === 'reject'} disabled={Boolean(busy)} onClick={() => act('reject')} className="flex-1 sm:flex-none">{tr('Reject and notify')}</Button>
                <Button variant="secondary" size="lg" disabled={Boolean(busy)} onClick={() => { setRejecting(false); setError(''); }} className="flex-1 sm:flex-none">{tr('Cancel')}</Button>
              </div>
            </div>
          )}
          {error && <Notice tone="error" className="mt-3">{error}</Notice>}
        </div>
      )}
    </Card>
  );
}

export default function AdminDashboard() {
  const { tr } = useLang();
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(null);

  const load = useCallback(() => {
    api.get(`/admin/workers?status=${tab}`).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message));
  }, [tab]);
  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    if (!doc) return undefined;
    const esc = (e) => e.key === 'Escape' && setDoc(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [doc]);

  const c = data?.counts;
  const stats = [
    { label: 'Waiting for review', n: c?.pending, Icon: Clock, tone: 'bg-yellow-50 text-yellow-800' },
    { label: 'Verified workers', n: c?.approved, Icon: ShieldCheck, tone: 'bg-green-50 text-green-800' },
    { label: 'Rejected', n: c?.rejected, Icon: XCircle, tone: 'bg-red-50 text-red-800' },
    { label: 'Not submitted yet', n: c?.none, Icon: Users, tone: 'bg-neutral-75 text-neutral-700' },
  ];

  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('Worker verification')}</h1>
      <p className="mt-1 text-lg text-neutral-600">{tr('Review each worker’s ID and selfie. Approved workers appear in search and can bid on jobs.')}</p>

      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, n, Icon, tone }) => (
          <li key={label} className={cx('rounded-2xl p-4', tone)}>
            <Icon className="h-6 w-6" aria-hidden />
            <p className="mt-2 text-3xl font-bold">{n ?? '–'}</p>
            <p className="text-sm font-bold">{tr(label)}</p>
          </li>
        ))}
      </ul>

      <div role="tablist" aria-label={tr('Filter')} className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 px-5 font-bold', tab === id ? 'border-green-800 bg-green-800 text-white' : 'border-neutral-300 bg-white hover:bg-neutral-50')}>
            <Icon className="h-5 w-5" aria-hidden /> {tr(label)} {c && <span className={cx('rounded-full px-2 text-sm', tab === id ? 'bg-white/20' : 'bg-neutral-100')}>{c[id]}</span>}
          </button>
        ))}
      </div>

      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
      <ul className="mt-4 space-y-4">
        {!data && !error && [0, 1].map((i) => <li key={i} className="h-60 animate-pulse rounded-3xl bg-neutral-75" aria-hidden />)}
        {(data?.workers || []).map((w) => <li key={w.id}><Applicant w={w} onDone={load} onOpen={setDoc} /></li>)}
        {data && !data.workers.length && <li className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-600">{tr('Nothing here yet.')}</li>}
      </ul>

      {doc && (
        <div role="dialog" aria-modal="true" aria-label={doc.label} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setDoc(null)}>
          <div className="relative max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(doc.url)} alt={doc.label} className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
            <button type="button" autoFocus onClick={() => setDoc(null)} aria-label={tr('Close')} className="absolute -top-3 -right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white shadow-strong"><X className="h-6 w-6" aria-hidden /></button>
          </div>
        </div>
      )}
    </div>
  );
}
