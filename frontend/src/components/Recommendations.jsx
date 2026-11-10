'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, MapPin, Send, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useLang } from './Providers';
import { AIChip, Avatar, Button, Notice, cx } from './ui';

const fmtRs = (n) => `Rs ${Number(n).toLocaleString('en-US')}`;

// "Top 3 workers for this job": ranked by Gemini embeddings plus distance, rating, availability and price fit.
export default function Recommendations({ jobId }) {
  const { tr } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api.get(`/jobs/${jobId}/recommendations`).then(setData).catch((e) => setError(e.message));
  }, [jobId]);
  useEffect(() => { load(); }, [load]);

  const invite = async (workerId) => {
    setBusy(workerId);
    try {
      await api.post(`/jobs/${jobId}/invite`, { workerId });
      setData((d) => ({ ...d, recommendations: d.recommendations.map((r) => (r.worker.id === workerId ? { ...r, invited: true } : r)) }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  if (error && !data) return null;
  if (data && !data.recommendations.length) return null;

  return (
    <section className="mt-8" aria-labelledby="rec-h">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="rec-h" className="t-heading-md text-[1.5rem]">{tr('Top 3 workers for this job')}</h2>
        <AIChip>{data?.method === 'embeddings' ? tr('AI matched') : tr('Smart match')}</AIChip>
      </div>
      <p className="mt-1 text-neutral-600">{tr('Ranked by how well their skills fit your job, plus distance, rating, availability and price.')}</p>
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}

      <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {!data && [0, 1, 2].map((i) => <li key={i} className="h-72 animate-pulse rounded-3xl bg-neutral-75" aria-hidden />)}
        {(data?.recommendations || []).map((r) => {
          const w = r.worker;
          return (
            <li key={w.id} className={cx('flex flex-col rounded-3xl border-2 bg-white p-5', r.rank === 1 ? 'border-green-500' : 'border-neutral-200')}>
              <div className="flex items-start gap-3">
                <Avatar initials={w.initials} src={w.avatarUrl} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-lg font-bold">{w.name} {w.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-green-700" aria-label={tr('ID verified')} />}</p>
                  <p className="flex flex-wrap items-center gap-x-3 text-sm text-neutral-600">
                    <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-star text-star" aria-hidden /> {Number(w.rating || 0).toFixed(1)} ({w.reviewCount})</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden /> {tr('{n} km away', { n: w.distanceKm })}</span>
                  </p>
                </div>
                <span className="rounded-full bg-green-800 px-2.5 py-1 text-xs font-bold text-white" aria-label={tr('Rank {n}', { n: r.rank })}>#{r.rank}</span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>{tr('Match')}</span><span className="text-green-800">{r.match}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={r.match} aria-valuemin={0} aria-valuemax={100} aria-label={tr('Match')}>
                  <div className="h-full rounded-full bg-green-700" style={{ width: `${r.match}%` }} />
                </div>
              </div>

              <ul className="mt-3 flex-1 space-y-1 text-sm text-neutral-700">
                {r.reasons.map((x) => <li key={x.t} className="flex gap-2"><span aria-hidden className="text-green-700">✓</span> {tr(x.t, x.v)}</li>)}
              </ul>
              <p className="mt-3 text-sm text-neutral-600">{tr('Usual rate')}: <b className="text-text">{fmtRs(w.rate)}</b>{r.bidPrice ? <> · {tr('Bid')}: <b className="text-green-800">{fmtRs(r.bidPrice)}</b></> : null}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {r.bidPrice ? (
                  <span className="inline-flex min-h-11 items-center rounded-xl bg-green-50 px-3 font-bold text-green-800">{tr('Already bid')}</span>
                ) : r.invited ? (
                  <span className="inline-flex min-h-11 items-center rounded-xl bg-green-50 px-3 font-bold text-green-800">{tr('Invited')}</span>
                ) : (
                  <Button size="lg" icon={Send} loading={busy === w.id} onClick={() => invite(w.id)}>{tr('Invite to bid')}</Button>
                )}
                <Button size="lg" variant="secondary" href={`/workers/${w.id}`}>{tr('View profile')}</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
