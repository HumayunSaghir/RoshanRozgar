'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import Shell from '@/components/Shell';
import JobStatus from '@/components/JobStatus';
import { RowSkeleton } from '@/components/Skeleton';
import { useAuth, useLang } from '@/components/Providers';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { fmtRs, tradeById } from '@/lib/trades';

export default function MyJobsPage() {
  const router = useRouter();
  const { tr, trLoc } = useLang();
  const { user, ready } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && !user) router.push('/login');
  }, [ready, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    api.get('/jobs/mine').then((d) => setJobs(d.jobs)).catch((e) => setError(e.message));
  }, [user]);

  const whenText = (w) => tr(w === 'now' ? 'Now' : w === 'tonight' ? 'This evening' : 'Tomorrow');

  return (
    <Shell>
      <div className="container-rr max-w-[900px] pb-16 pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('My jobs')}</h1>
            <p className="mt-1 text-neutral-600">{tr('Jobs you posted and the bids you received.')}</p>
          </div>
          <Button href="/jobs/new" icon={Plus} size="lg">{tr('Post a job')}</Button>
        </div>

        {ready && user && user.role !== 'customer' && <Notice tone="info" title="Only customers can post jobs">Log in with a customer account to post a job and receive bids.</Notice>}
        {error && <Notice tone="error">{tr(error)}</Notice>}

        {!jobs && !error && user?.role === 'customer' && (
          <div className="space-y-3" role="status" aria-busy="true">
            <span className="sr-only">{tr('Loading…')}</span>
            {[0, 1, 2].map((i) => <RowSkeleton key={i} />)}
          </div>
        )}

        {jobs && !jobs.length && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
            <p className="text-lg font-bold">{tr('You have not posted any jobs yet.')}</p>
            <p className="mt-1 text-neutral-600">{tr('Post a job and nearby workers will send you their prices.')}</p>
            <Button href="/jobs/new" icon={Plus} className="mt-5">{tr('Post a job')}</Button>
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="flex min-h-[88px] items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 hover:border-green-500">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-bold">{j.title}</span>
                    <span className="block truncate text-neutral-600">{tr(tradeById(j.trade)?.label || j.trade)} · {trLoc(j.address.area)} · {whenText(j.whenLabel)}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <JobStatus status={j.status} />
                      <span className="t-body-sm text-neutral-600">{j.bidCount === 1 ? tr('1 bid') : tr('{n} bids', { n: j.bidCount })}</span>
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-lg font-bold">{j.budget ? fmtRs(j.budget) : tr('Open budget')}</span>
                    <span className="t-body-sm text-neutral-500">#{j.ref}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-neutral-500" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
