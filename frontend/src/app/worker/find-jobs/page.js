'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Clock, MapPin, Gavel } from 'lucide-react';
import { Notice, cx } from '@/components/ui';
import { ListSkeleton, RowSkeleton, Skeleton } from '@/components/Skeleton';
import { useLang } from '@/components/Providers';
import { api } from '@/lib/api';
import { fmtRs, tradeById } from '@/lib/trades';

const WHEN = { now: 'Now', tonight: 'This evening', tomorrow: 'Tomorrow' };
const BID_STATUS = {
  pending: ['Bid sent', 'bg-yellow-50 text-yellow-800'],
  accepted: ['Accepted', 'bg-green-50 text-green-800'],
  rejected: ['Not selected', 'bg-red-50 text-red-800'],
};

function JobCard({ job, bid, tr }) {
  const trade = tradeById(job.trade);
  const myBid = bid || job.myBid;
  const [label, tone] = myBid ? BID_STATUS[myBid.status] || BID_STATUS.pending : [];
  return (
    <li>
      <Link href={`/worker/find-jobs/${job.id}`} className="block rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-green-500 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{job.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-neutral-600">
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden /> {tr(job.address.area || '')}{job.distanceKm !== undefined ? ` · ${tr('{n} km away', { n: job.distanceKm })}` : ''}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden /> {tr(WHEN[job.whenLabel] || 'Now')}</span>
            </p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-neutral-500" aria-hidden />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {trade && <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-800">{tr(trade.label)}</span>}
          <span className="rounded-full bg-neutral-75 px-3 py-1 text-sm font-bold text-neutral-700">{job.budget > 0 ? tr('Budget {amount}', { amount: fmtRs(job.budget) }) : tr('Open budget')}</span>
          <span className="rounded-full bg-neutral-75 px-3 py-1 text-sm font-bold text-neutral-700">{tr('{n} bids', { n: job.bidCount })}</span>
          {myBid && (
            <span className={cx('rounded-full px-3 py-1 text-sm font-bold', tone)}>{tr('You bid {amount}', { amount: fmtRs(myBid.price) })} · {tr(label)}</span>
          )}
        </div>
      </Link>
    </li>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5" aria-hidden>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2"><Skeleton className="h-7 w-20 !rounded-full" /><Skeleton className="h-7 w-24 !rounded-full" /></div>
    </div>
  );
}

export default function FindJobsPage() {
  const { tr } = useLang();
  const [tab, setTab] = useState('open');
  const [jobs, setJobs] = useState(null);
  const [bids, setBids] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [f, b] = await Promise.all([api.get('/jobs/feed'), api.get('/jobs/bids/mine')]);
      setJobs(f.jobs);
      setBids(b.bids);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const tabs = [
    ['open', 'Open jobs', jobs?.length],
    ['bids', 'My bids', bids?.length],
  ];

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('Find jobs')}</h1>
      <p className="mb-6 mt-1 text-neutral-600">{tr('Jobs posted by customers near you. Send a price to win the work.')}</p>

      <div role="tablist" aria-label={tr('Job lists')} className="mb-5 flex gap-2">
        {tabs.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cx('inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border-2 px-5 font-bold transition-colors', tab === id ? 'border-green-800 bg-green-800 text-white' : 'border-neutral-300 bg-white text-text hover:bg-neutral-50')}
          >
            {tr(label)}
            {count !== undefined && <span className={cx('inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-sm', tab === id ? 'bg-white text-green-800' : 'bg-neutral-75 text-neutral-700')}>{count}</span>}
          </button>
        ))}
      </div>

      {error && <Notice tone="error" className="mb-4">{tr(error)}</Notice>}

      {tab === 'open' && (
        jobs === null ? <ListSkeleton count={4} Item={CardSkeleton} /> : jobs.length ? (
          <ul className="space-y-3">{jobs.map((j) => <JobCard key={j.id} job={j} tr={tr} />)}</ul>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-600">
            <Gavel className="mx-auto mb-3 h-8 w-8 text-green-800" aria-hidden />
            <p className="font-bold text-text">{tr('No open jobs right now')}</p>
            <p>{tr('New jobs for your trade will appear here. You will also get a notification.')}</p>
          </div>
        )
      )}

      {tab === 'bids' && (
        bids === null ? <ListSkeleton count={3} Item={RowSkeleton} /> : bids.length ? (
          <ul className="space-y-3">{bids.map((b) => <JobCard key={b.id} job={b.job} bid={b} tr={tr} />)}</ul>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-600">
            <p className="font-bold text-text">{tr('You have not bid on any job yet')}</p>
            <p>{tr('Open a job and send your price.')}</p>
          </div>
        )
      )}
    </div>
  );
}
