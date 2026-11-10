'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, List, Map as MapIcon } from 'lucide-react';
import Shell from '@/components/Shell';
import WorkerCard from '@/components/WorkerCard';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/Skeleton';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <Skeleton className="h-[500px] w-full !rounded-3xl" /> });
import AreaPicker from '@/components/AreaPicker';
import { useLang, useLoc } from '@/components/Providers';
import { AIChip, Button, Chip, Notice, cx } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { loadJob } from '@/lib/job';
import { TRADES, fmtRs, tradeById } from '@/lib/trades';

const WHEN = [
  ['now', 'Now'],
  ['tonight', 'This evening'],
  ['tomorrow', 'Tomorrow'],
];
const SORTS = [
  ['distance', 'Nearest first'],
  ['rating', 'Rating'],
  ['price', 'Lowest price'],
];

function Results() {
  const router = useRouter();
  const params = useSearchParams();
  const { tr, trLoc } = useLang();
  const { loc } = useLoc();
  const trade = params.get('trade') || '';
  const when = params.get('when') || 'now';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const [f, setF] = useState({ available: true, km3: false, rating4: false, cheap: false, verified: true });
  const [sort, setSort] = useState('distance');
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('list');

  useEffect(() => setJob(loadJob()), []);

  useEffect(() => {
    let live = true;
    setData(null);
    setError('');
    api.get(`/workers${qs({ trade, lat: loc.lat, lng: loc.lng, area: loc.area, when, maxKm: 40 })}`)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [trade, when, loc]);

  const list = useMemo(() => {
    if (!data) return [];
    let w = data.workers.filter((x) => (!f.km3 || x.distanceKm < 3) && (!f.rating4 || x.rating >= 4) && (!f.cheap || x.rate < 1000) && (!f.verified || x.badges.includes('Phone verified')));
    const cmp = { distance: (a, b) => a.distanceKm - b.distanceKm, rating: (a, b) => b.rating - a.rating, price: (a, b) => a.rate - b.rate }[sort];
    w = [...w].sort(cmp);
    if (f.available) w = [...w.filter((x) => x.available), ...w.filter((x) => !x.available)];
    return w;
  }, [data, f, sort]);

  useEffect(() => {
    if (list.length && !list.find((w) => w.id === selected)) setSelected((list.find((w) => w.available) || list[0]).id);
  }, [list, selected]);

  const setParam = (k, v) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`/workers?${p.toString()}`);
  };
  const open = (id) => router.push(`/workers/${id}${qs({ when })}`);

  const tradeObj = tradeById(trade);
  const place = trLoc(loc.label.split(',')[0]);
  const availableCount = list.filter((w) => w.available).length;
  const whenText = tr(WHEN.find(([k]) => k === when)?.[1] || 'Now');
  const toggle = (k) => setF((s) => ({ ...s, [k]: !s[k] }));
  const showJobLine = job && job.trade === trade;

  return (
    <div className="container-rr pb-28 pt-6 sm:pt-8 lg:pb-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] lg:gap-14 xl:gap-16">
        <div className={cx('min-w-0', view === 'map' && 'hidden lg:block')}>
          {showJobLine && <AIChip><span className="sm:hidden">AI: {tr(tradeObj?.label || '')} · {whenText}</span><span className="hidden sm:inline">{tr('AI understood your request')}</span></AIChip>}
          <h1 className="t-heading-xl mt-2 text-[1.875rem] sm:text-[2.5rem]">
            {tr('{what} near {place}', { what: tr(tradeObj ? tradeObj.plural : 'Workers'), place })}
          </h1>
          {showJobLine ? (
            <p className="mt-1 text-lg text-neutral-600">
              {job.text || job.transcriptRoman ? `"${(job.text || job.transcriptRoman).slice(0, 80)}" · ` : ''}
              {whenText} · {tr('Estimate')} {fmtRs(job.priceMin)}–{Math.round(job.priceMax).toLocaleString('en-US')}
            </p>
          ) : (
            <div className="mt-1 max-w-sm"><AreaPicker /></div>
          )}

          {!trade && (
            <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={tr('Trade')}>
              {TRADES.map((x) => (
                <Chip key={x.id} onClick={() => setParam('trade', x.id)} icon={x.Icon}>{tr(x.label)}</Chip>
              ))}
            </div>
          )}

          <div className="mt-4" role="group" aria-label={tr('When do you need them?')}>
            <p className="mb-2 font-bold">{tr('When do you need them?')}</p>
            <div className="flex flex-wrap gap-2">
              {WHEN.map(([k, label]) => (
                <Chip key={k} selected={when === k} onClick={() => setParam('when', k === 'now' ? '' : k)}>{tr(label)}</Chip>
              ))}
            </div>
          </div>

          <div className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={tr('Filters')}>
            <Chip selected={f.available} onClick={() => toggle('available')}>{when === 'now' ? tr('Available now') : tr('{when} available', { when: whenText })}</Chip>
            <Chip selected={f.km3} onClick={() => toggle('km3')}>{tr('Under 3 km')}</Chip>
            <Chip selected={f.rating4} onClick={() => toggle('rating4')}>{tr('4+ rating')}</Chip>
            <Chip selected={f.cheap} onClick={() => toggle('cheap')} className="hidden sm:inline-flex">{tr('Under Rs 1,000')}</Chip>
            <Chip selected={f.verified} onClick={() => toggle('verified')} className="hidden sm:inline-flex">{tr('Phone verified')}</Chip>
          </div>

          <div className="mt-5 flex rounded-full bg-neutral-75 p-1.5 lg:hidden" role="tablist" aria-label={tr('View')}>
            {[['list', 'List', List], ['map', 'Map', MapIcon]].map(([k, label, Icon]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cx('flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full font-bold', view === k ? 'bg-white shadow-soft' : 'text-neutral-600')}>
                <Icon className="h-5 w-5" aria-hidden /> {tr(label)}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-lg font-bold" aria-live="polite">
              {data ? tr('{count} {what} · {avail} available {when}', { count: list.length, what: tr(tradeObj ? tradeObj.plural : 'Workers').toLowerCase(), avail: availableCount, when: when === 'now' ? tr('now') : whenText.toLowerCase() }) : tr('Searching…')}
            </p>
            <label className="flex items-center gap-1 font-bold text-green-800">
              <span className="sr-only sm:not-sr-only">{tr('Sort')}:</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="min-h-11 cursor-pointer rounded-lg bg-transparent pr-1 font-bold text-green-800">
                {SORTS.map(([k, label]) => <option key={k} value={k}>{tr(label)}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-3 space-y-4">
            {error && <Notice tone="error" title={tr('Could not load workers')}>{error}</Notice>}
            {!data && !error && [0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-neutral-75" aria-hidden />)}
            {data && list.map((w) => (
              <WorkerCard key={w.id} worker={w} selected={selected === w.id} onSelect={setSelected} onOpen={open} />
            ))}
            {data && !list.length && (
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-center">
                <p className="t-heading-sm">{tr('No one is available right now')}</p>
                <p className="mt-1 text-neutral-600">{tr('Try removing filters or choosing another time.')}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" size="lg" onClick={() => setF({ available: false, km3: false, rating4: false, cheap: false, verified: false })}>{tr('Clear filters')}</Button>
                  {when === 'now' && <Button size="lg" onClick={() => setParam('when', 'tonight')}>{tr('Try this evening')}</Button>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={cx('lg:sticky lg:top-[124px] lg:self-start', view === 'list' && 'hidden lg:block')}>
          {data && (
            <MapView center={{ lat: loc.lat, lng: loc.lng }} workers={list} selectedId={selected} onSelect={setSelected} onOpen={open} className="h-[560px] lg:h-[calc(100vh-170px)] lg:max-h-[760px] lg:min-h-[520px]" />
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center lg:hidden">
        <Button onClick={() => setView((v) => (v === 'list' ? 'map' : 'list'))} icon={view === 'list' ? MapIcon : List} className="shadow-strong">
          {tr(view === 'list' ? 'Show map' : 'Show list')}
        </Button>
      </div>
      <p className="sr-only"><ArrowDown /> </p>
    </div>
  );
}

export default function WorkersPage() {
  return (
    <Shell footer={false}>
      <Suspense fallback={<div className="container-rr space-y-4 py-10" aria-hidden>{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-neutral-75" />)}</div>}>
        <Results />
      </Suspense>
    </Shell>
  );
}
