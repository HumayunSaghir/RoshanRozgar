'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { AIChip, Notice, Stars } from '@/components/ui';
import { useAuth, useLang } from '@/components/Providers';
import { api } from '@/lib/api';
import { TAG_LABELS } from '@/lib/trades';

export default function WorkerReviews() {
  const { tr } = useLang();
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reviews/mine').then((d) => { setItems(d.reviews); setStats(d.stats); }).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('Reviews')}</h1>
      {(stats || user) && (
        <p className="mt-2 flex items-center gap-2 text-lg text-neutral-600">
          <Star className="h-5 w-5 fill-star text-star" aria-hidden /> <b className="text-text">{(stats || user).rating.toFixed(1)}</b> ({tr('{n} reviews', { n: (stats || user).reviewCount })}) · {tr('{n} jobs done', { n: (stats || user).jobsDone })}
        </p>
      )}
      {(stats || user)?.aiReviewSummary && (
        <div className="mt-5 rounded-3xl bg-blue-50 p-5">
          <AIChip className="!bg-transparent !p-0">{tr('AI summary of your reviews')}</AIChip>
          <p className="mt-2 text-xl font-bold">{(stats || user).aiReviewSummary}</p>
          <p className="t-body-sm mt-1 text-neutral-600">{tr('Customers see this on your profile.')}</p>
        </div>
      )}
      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
      <ul className="mt-6 space-y-3">
        {(items || []).map((r) => (
          <li key={r.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold">{r.customerName.split(' ')[0]}{r.customerArea ? ` · ${r.customerArea}` : ''}</p>
              <span className="rounded-md bg-green-50 px-2.5 py-1 text-sm font-bold text-green-800">{tr('Verified booking')}</span>
            </div>
            <Stars value={r.rating} size={18} />
            {r.comment && <p className="mt-1">{r.comment}</p>}
            {r.tags?.length > 0 && <p className="t-body-sm mt-1 text-neutral-500">{r.tags.map((t) => tr(TAG_LABELS[t] || t)).join(' · ')}</p>}
          </li>
        ))}
        {items && !items.length && <li className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-600">{tr('No reviews yet. Customers can review you once a job is completed.')}</li>}
      </ul>
    </div>
  );
}
