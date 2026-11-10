'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, MapPin, MessageCircle, Star, X } from 'lucide-react';
import Shell from '@/components/Shell';
import JobStatus from '@/components/JobStatus';
import Recommendations from '@/components/Recommendations';
import { Skeleton } from '@/components/Skeleton';
import { useAuth, useLang } from '@/components/Providers';
import { Avatar, Button, Card, Notice, TrustBadge } from '@/components/ui';
import { api, assetUrl } from '@/lib/api';
import { fmtRs, tradeById } from '@/lib/trades';

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { tr, trLoc } = useLang();
  const { user, ready } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [acting, setActing] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (ready && !user) router.push('/login');
  }, [ready, user, router]);

  const load = useCallback(async () => {
    try {
      setData(await api.get(`/jobs/${id}`));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    if (!user) return undefined;
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load, user]);

  const accept = async (bid) => {
    setActing(bid.id);
    setMsg('');
    try {
      const r = await api.post(`/jobs/${id}/bids/${bid.id}/accept`, {});
      router.push(`/messages?b=${r.bookingId}`);
    } catch (e) {
      setMsg(e.data?.code === 'WORKER_BUSY' ? tr('This worker is not free at that time. Choose another bid.') : tr(e.message));
      setActing('');
      load();
    }
  };

  const cancel = async () => {
    setActing('cancel');
    setMsg('');
    try {
      await api.post(`/jobs/${id}/cancel`, {});
      setConfirmCancel(false);
      await load();
    } catch (e) {
      setMsg(tr(e.message));
    } finally {
      setActing('');
    }
  };

  if (error && !data) {
    return <Shell><div className="container-rr max-w-[720px] py-16"><Notice tone="error" title="Job not found">{error}</Notice></div></Shell>;
  }
  if (!data) {
    return (
      <Shell>
        <div className="container-rr max-w-[900px] space-y-4 py-8" role="status" aria-busy="true">
          <span className="sr-only">{tr('Loading…')}</span>
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-40 w-full !rounded-3xl" />
          <Skeleton className="h-24 w-full !rounded-3xl" />
        </div>
      </Shell>
    );
  }
  if (data.role !== 'customer') {
    return <Shell><div className="container-rr max-w-[720px] py-16"><Notice tone="info" title="Only customers can post jobs">Log in with a customer account to post a job and receive bids.</Notice></div></Shell>;
  }

  const { job, bids } = data;
  const open = job.status === 'open';
  const live = bids.filter((b) => b.status === 'pending' || b.status === 'accepted');
  const lowest = live.length ? Math.min(...live.map((b) => b.price)) : null;
  const topRating = live.length ? Math.max(...live.map((b) => b.worker.rating || 0)) : null;
  const whenText = tr(job.whenLabel === 'now' ? 'Now' : job.whenLabel === 'tonight' ? 'This evening' : 'Tomorrow');

  return (
    <Shell>
      <div className="container-rr max-w-[900px] pb-16 pt-8">
        <p className="mb-2"><Link href="/jobs" className="font-bold text-green-800 hover:underline">← {tr('My jobs')}</Link></p>

        <Card className="p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="t-heading-xl text-[1.75rem] sm:text-[2.25rem]">{job.title}</h1>
              <p className="mt-1 text-neutral-600">{tr(tradeById(job.trade)?.label || job.trade)} · #{job.ref}</p>
            </div>
            <JobStatus status={job.status} />
          </div>
          {job.description && <p className="mt-4 text-lg">{job.description}</p>}
          {job.transcriptUrdu && <p lang="ur" dir="rtl" className="urdu mt-3 rounded-xl bg-neutral-50 p-3 text-lg">{job.transcriptUrdu}</p>}
          {job.audioUrl && <audio controls preload="none" src={assetUrl(job.audioUrl)} className="mt-3 w-full" aria-label={tr('Voice note')} />}
          {job.imageUrls.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3">
              {job.imageUrls.map((u, i) => (
                <li key={u}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src={assetUrl(u)} alt={tr('Job photo {n}', { n: i + 1 })} className="h-24 w-24 rounded-2xl object-cover" />
                </li>
              ))}
            </ul>
          )}
          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              [tr('Time'), whenText],
              [tr('Budget'), job.budget ? fmtRs(job.budget) : tr('Open to offers')],
              [tr('Area'), trLoc(job.address.text || job.address.area)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-neutral-50 p-4">
                <dt className="text-neutral-600">{k}</dt>
                <dd className="text-lg font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          {job.status === 'awarded' && job.bookingId && (
            <Notice tone="ok" icon={Check} className="mt-5" title="You chose a worker">Continue in the chat to confirm the booking.</Notice>
          )}
          {job.status === 'awarded' && job.bookingId && (
            <Button href={`/messages?b=${job.bookingId}`} icon={MessageCircle} className="mt-4">{tr('Open chat')}</Button>
          )}

          {open && !confirmCancel && (
            <Button variant="tertiary" size="lg" className="mt-4" onClick={() => setConfirmCancel(true)}>{tr('Cancel job')}</Button>
          )}
          {open && confirmCancel && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4" role="alertdialog" aria-label={tr('Cancel this job?')}>
              <p className="font-bold text-red-800">{tr('Cancel this job? Workers who bid will be told.')}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="danger" size="lg" icon={X} loading={acting === 'cancel'} onClick={cancel}>{tr('Yes, cancel job')}</Button>
                <Button variant="secondary" size="lg" onClick={() => setConfirmCancel(false)}>{tr('Keep job')}</Button>
              </div>
            </div>
          )}
        </Card>

        {open && <Recommendations jobId={job.id} />}

        <section className="mt-8" aria-labelledby="bids-h">
          <h2 id="bids-h" className="t-heading-md flex items-center gap-3 text-[1.5rem]">
            {tr('Bids')}
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-green-800 px-2 text-sm text-white">{live.length}</span>
          </h2>
          {msg && <Notice tone="error" className="mt-3">{msg}</Notice>}

          {!live.length && (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-600">
              {open ? tr('No bids yet. Nearby workers have been notified. New bids appear here automatically.') : tr('This job received no bids.')}
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {live.map((b) => {
              const w = b.worker;
              const isLowest = live.length > 1 && b.price === lowest;
              const isBest = live.length > 1 && (w.rating || 0) === topRating && topRating > 0;
              const accepted = b.status === 'accepted';
              return (
                <li key={b.id} className={`rounded-3xl border-2 bg-white p-5 ${accepted ? 'border-green-500' : 'border-neutral-200'}`}>
                  <div className="flex items-start gap-4">
                    <Avatar initials={w.initials} size={56} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold">{w.name}</p>
                      <p className="flex flex-wrap items-center gap-x-3 text-neutral-600">
                        <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-star text-star" aria-hidden /> {Number(w.rating || 0).toFixed(1)} ({w.reviewCount})</span>
                        <span>{tr('{n} jobs done', { n: w.jobsDone })}</span>
                        {w.distanceKm !== undefined && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden /> {tr('{n} km away', { n: w.distanceKm })}</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isLowest && <TrustBadge>{tr('Lowest price')}</TrustBadge>}
                        {isBest && <TrustBadge>{tr('Best rated')}</TrustBadge>}
                        {accepted && <TrustBadge>{tr('Accepted')}</TrustBadge>}
                      </div>
                    </div>
                    <p className="text-right text-[1.5rem] font-bold leading-tight">{fmtRs(b.price)}</p>
                  </div>
                  {b.message && <p className="mt-3 rounded-2xl bg-neutral-50 p-3 text-lg">“{b.message}”</p>}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {open && <Button size="lg" icon={Check} loading={acting === b.id} disabled={Boolean(acting)} onClick={() => accept(b)}>{tr('Accept bid')}</Button>}
                    <Button size="lg" variant="secondary" href={`/workers/${w.id}`}>{tr('View profile')}</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
