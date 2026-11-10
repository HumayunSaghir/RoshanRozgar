'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, MapPin, MessageCircle, Mic, Star } from 'lucide-react';
import Shell from '@/components/Shell';
import ProblemSearch from '@/components/ProblemSearch';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/Skeleton';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <Skeleton className="h-[500px] w-full !rounded-3xl" /> });
import { useLang, useLoc } from '@/components/Providers';
import { Avatar, Button, TrustBadge } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { TRADES, fmtRs } from '@/lib/trades';
import { ArrowRight } from 'lucide-react';
import { Star as StarIcon, MapPin as PinIcon } from 'lucide-react';

function HeroPreview() {
  const { loc } = useLoc();
  const { t, tr } = useLang();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/workers${qs({ trade: 'plumber', lat: loc.lat, lng: loc.lng, area: loc.area, when: 'now' })}`)
      .then((d) => setData(d))
      .catch(() => setData({ workers: [], center: { lat: loc.lat, lng: loc.lng } }));
  }, [loc]);

  const workers = (data?.workers || []).slice(0, 5);
  const top = workers.find((w) => w.available) || workers[0];
  return (
    <div className="relative hidden lg:block">
      <MapView center={{ lat: loc.lat, lng: loc.lng }} workers={workers} selectedId={top?.id} className="h-[500px] xl:h-[520px]" />
      {top && (
        <div className="absolute inset-x-6 bottom-0 translate-y-1/3 rounded-3xl border border-neutral-200 bg-white p-4 shadow-medium xl:inset-x-10 xl:p-5">
          <div className="flex items-start gap-4">
            <Avatar initials={top.initials} src={top.avatarUrl} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="t-heading-sm">{top.name}</p>
                <p className="text-right"><span className="block text-lg font-bold">{fmtRs(top.rate)}</span><span className="t-body-sm text-neutral-500">{tr('/visit')}</span></p>
              </div>
              <p className="flex items-center gap-2 text-neutral-600">
                {tr(TRADES.find((x) => x.id === top.trade)?.label || '')}
                <StarIcon className="h-4 w-4 fill-star text-star" aria-hidden /> <b className="text-text">{top.rating.toFixed(1)} ({top.reviewCount})</b>
              </p>
              <p className="flex items-center gap-3 text-neutral-600">
                <span className="inline-flex items-center gap-1"><PinIcon className="h-4 w-4" aria-hidden />{top.distanceKm} {tr('km')}</span>
                <span className="inline-flex items-center gap-2 font-bold text-green-700"><span className="h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden />{t('status.available')}</span>
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {top.badges.slice(0, 2).map((b) => <TrustBadge key={b}>{b}</TrustBadge>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { t, tr } = useLang();
  const how = [
    { Icon: Mic, n: 1, k: 'how.1' },
    { Icon: MapPin, n: 2, k: 'how.2' },
    { Icon: MessageCircle, n: 3, k: 'how.3' },
    { Icon: Star, n: 4, k: 'how.4' },
  ];

  return (
    <Shell>
      <section className="bg-green-50">
        <div className="container-rr grid grid-cols-1 items-start gap-10 pb-16 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.94fr)] lg:gap-14 lg:pb-24 lg:pt-12 xl:gap-20">
          <div>
            <h1 className="t-display">
              <span className="block text-text">{t('hero.line1')}</span>
              <span className="block text-green-800">{t('hero.line2')}</span>
            </h1>
            <p className="t-body-lg mt-3 max-w-[640px] text-neutral-600">{t('hero.sub')}</p>
            <div className="mt-6 max-w-[760px] sm:mt-8">
              <ProblemSearch />
            </div>
            <p className="mt-6 font-bold text-green-800">{t('stats.line')}</p>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="container-rr pt-12 lg:pt-16" aria-labelledby="trades-h">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="trades-h" className="t-heading-xl">{t('trades.title')}</h2>
          <Link href="/workers" className="inline-flex min-h-11 items-center gap-1 font-bold text-green-800 hover:underline">{t('trades.all')} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <ul className="mt-6 grid grid-cols-4 gap-3 lg:grid-cols-8 lg:gap-4">
          {TRADES.map(({ id, label, short, Icon }) => (
            <li key={id}>
              <Link href={`/workers${qs({ trade: id })}`} className="flex h-full min-h-[112px] flex-col items-center justify-center gap-1 rounded-3xl border border-neutral-200 bg-white px-2 py-4 text-center transition-colors hover:border-green-500 hover:bg-green-50 cursor-pointer lg:min-h-[180px] lg:gap-3">
                <Icon className="h-8 w-8 text-green-800 lg:h-11 lg:w-11" strokeWidth={1.6} aria-hidden />
                <span className="text-[13px] font-bold leading-tight sm:text-base">
                  <span className="lg:hidden">{tr(short)}</span>
                  <span className="hidden lg:inline">{tr(label)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="container-rr scroll-mt-28 pt-12 lg:pt-20" aria-labelledby="how-h">
        <h2 id="how-h" className="t-heading-xl">{t('how.title')}</h2>
        <ol className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-5">
          {how.map(({ Icon, n, k }) => (
            <li key={n} className="relative flex items-center gap-4 rounded-3xl border border-neutral-200 bg-white p-5 lg:min-h-[230px] lg:flex-col lg:items-start lg:justify-start lg:gap-10 lg:p-7">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-800 lg:h-16 lg:w-16"><Icon className="h-6 w-6" aria-hidden /></span>
              <span className="absolute right-6 top-5 hidden text-[2.75rem] font-bold leading-none text-green-200 lg:block" aria-hidden>{n}</span>
              <div>
                <h3 className="t-heading-sm lg:text-2xl"><span className="lg:hidden">{n}. </span>{t(`${k}.t`)}</h3>
                <p className="t-body-sm mt-1 text-neutral-600 lg:mt-2 lg:text-base">{t(`${k}.d`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-rr py-12 lg:py-20" aria-labelledby="cta-h">
        <div className="rounded-3xl bg-green-800 p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:px-16 lg:py-14">
          <div>
            <h2 id="cta-h" className="t-heading-xl !text-[2rem] text-white lg:!text-[2.75rem]">{t('cta.title')}</h2>
            <p className="t-body-lg mt-1 text-green-200">{t('cta.sub')}</p>
          </div>
          <Button href="/join" variant="leaf" icon={Mic} className="mt-6 w-full lg:mt-0 lg:w-auto lg:min-w-[320px] lg:!h-[72px] lg:text-lg">{t('cta.btn')}</Button>
        </div>
      </section>
    </Shell>
  );
}
