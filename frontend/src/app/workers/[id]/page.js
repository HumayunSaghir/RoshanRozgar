'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, ImageIcon, MessageCircle, Phone, Star } from 'lucide-react';
import Shell from '@/components/Shell';
import VoiceNote from '@/components/VoiceNote';
import { useAuth, useLang, useLoc } from '@/components/Providers';
import { AIChip, Avatar, Button, Chip, Notice, Stars, TrustBadge, cx } from '@/components/ui';
import { api, assetUrl, qs } from '@/lib/api';
import { loadJob } from '@/lib/job';
import { TAG_LABELS, fmtRs, tradeById } from '@/lib/trades';

const WHEN = [
  ['now', 'Now'],
  ['tonight', 'This evening'],
  ['tomorrow', 'Tomorrow'],
];

function Profile() {
  const { id } = useParams();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { loc } = useLoc();
  const { t, tr, trLoc } = useLang();
  const [when, setWhen] = useState(params.get('when') || 'now');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => setJob(loadJob()), []);
  useEffect(() => {
    let live = true;
    api.get(`/workers/${id}${qs({ lat: loc.lat, lng: loc.lng, area: loc.area, when })}`)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [id, loc, when]);

  if (error) return <div className="container-rr py-16"><Notice tone="error" title={tr('Profile not found')}>{error}</Notice></div>;
  if (!data) return <div className="container-rr py-10"><div className="h-80 animate-pulse rounded-3xl bg-neutral-75" aria-hidden /></div>;

  const { worker: w, reviews } = data;
  const trade = tradeById(w.trade);
  const status = w.status;
  const statusText = status === 'available' ? t('status.available') : t(`status.${status}`, 'Offline');
  const canBook = w.available && user?.role !== 'worker';

  const startChat = async () => {
    setMsg('');
    if (!user) {
      router.push(`/login${qs({ role: 'customer', next: `${pathname}${qs({ when })}` })}`);
      return;
    }
    setBusy(true);
    try {
      const jobData = job && (job.trade === w.trade || !job.trade) ? job : null;
      const { booking } = await api.post('/bookings', {
        workerId: w.id,
        whenLabel: when,
        trade: w.trade,
        problem: jobData
          ? { text: jobData.text, transcriptUrdu: jobData.transcriptUrdu, transcriptRoman: jobData.transcriptRoman, audioUrl: jobData.audioUrl, imageUrls: jobData.imageUrls, duration: jobData.duration }
          : { text: '' },
        aiSummary: jobData ? { title: jobData.title, summary: jobData.summary, urgency: jobData.urgency, priceMin: jobData.priceMin, priceMax: jobData.priceMax, source: jobData.source } : undefined,
        address: { area: loc.area, lat: loc.lat, lng: loc.lng, text: loc.label },
        offeredPrice: undefined,
      });
      router.push(`/messages${qs({ b: booking.id })}`);
    } catch (e) {
      setMsg(e.status === 409 ? tr('This worker is not free at that time. Choose another time or another worker.') : e.message);
      setBusy(false);
    }
  };

  return (
    <div className="container-rr pb-16 pt-6">
      <nav aria-label={tr('Breadcrumb')} className="mb-4 flex items-center gap-1 text-neutral-600">
        <Link href={`/workers${qs({ trade: w.trade })}`} className="hover:underline">{tr(trade?.plural || 'Workers')}</Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <span aria-current="page">{w.name}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,0.48fr)] xl:gap-8">
        <div className="space-y-5">
          <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
              <Avatar initials={w.initials} size={112} dot={status === 'available'} className="sm:!h-40 sm:!w-40 sm:!text-[3.75rem]" />
              <div className="min-w-0 flex-1">
                <h1 className="t-heading-xl sm:text-[2.75rem]">{w.name}</h1>
                <p className="mt-1 text-lg text-neutral-600">
                  {tr(trade?.label || '')} · {tr('{n} yrs experience', { n: w.experienceYears })} · {tr(w.area)}, {tr(w.city)}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-lg text-neutral-600">
                  <Star className="h-5 w-5 fill-star text-star" aria-hidden />
                  <b className="text-text">{w.rating.toFixed(1)}</b> ({tr('{n} reviews', { n: w.reviewCount })}) · {tr('{n} jobs on Roshan Rozgar', { n: w.jobsDone })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {w.badges.map((b) => <TrustBadge key={b}>{b}</TrustBadge>)}
                </div>
              </div>
            </div>
            <VoiceNote id={w.id} audioUrl={w.voiceIntroUrl} transcriptUrdu="" transcriptRoman={w.bio || `My name is ${w.name}. $${trade?.label || ''}, ${w.experienceYears} years of experience, ${w.area}.`} hideText className="mt-5" />
          </section>

          {w.aiReviewSummary && (
            <section className="rounded-3xl bg-blue-50 p-5 sm:p-6" aria-label={tr('AI summary')}>
              <AIChip className="!bg-transparent !p-0">{tr('AI summary of reviews')}</AIChip>
              <p className="t-heading-sm mt-3 text-[1.1875rem] sm:text-xl">{w.aiReviewSummary}</p>
              <p className="mt-2 text-neutral-600">{tr('Based on {n} verified reviews', { n: w.reviewCount })}</p>
            </section>
          )}

          <section aria-labelledby="rev-h">
            <h2 id="rev-h" className="t-heading-xl mb-3">{tr('Reviews')}</h2>
            <div className="space-y-3">
              {reviews.map((r) => (
                <article key={r.id} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-50 font-bold text-green-800" aria-hidden>{r.customerName[0]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold">{r.customerName.split(' ')[0]}{r.customerArea ? ` · ${tr(r.customerArea)}` : ''}</p>
                        {r.verifiedBooking && <span className="shrink-0 rounded-md bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800 sm:text-sm">{tr('Verified booking')}</span>}
                      </div>
                      <Stars value={r.rating} size={18} />
                      {r.comment && <p lang={/[؀-ۿ]/.test(r.comment) ? 'ur' : undefined} className={cx('mt-1', /[؀-ۿ]/.test(r.comment) && 'urdu')}>{r.comment}</p>}
                      {r.tags?.length > 0 && <p className="t-body-sm mt-1 text-neutral-500">{r.tags.map((x) => tr(TAG_LABELS[x] || x)).join(' · ')}</p>}
                    </div>
                  </div>
                </article>
              ))}
              {!reviews.length && <p className="text-neutral-600">{tr('No reviews yet.')}</p>}
            </div>
          </section>

          <section aria-labelledby="photos-h">
            <h2 id="photos-h" className="t-heading-xl mb-3">{tr('Work photos')}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(w.workPhotos?.length ? w.workPhotos : [null, null, null, null]).map((p, i) => (
                <li key={p || i} className="flex aspect-[1.4] items-center justify-center overflow-hidden rounded-2xl bg-neutral-50">
                  {p ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={assetUrl(p)} alt={tr('Work photo {n}', { n: i + 1 })} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-neutral-400" aria-label={tr('No photo')} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8 lg:sticky lg:top-[124px]">
          <p className="flex items-baseline gap-2">
            <span className="text-[2.5rem] font-bold leading-none">{fmtRs(w.rate)}</span>
            <span className="text-neutral-600">{tr('/visit · cash')}</span>
          </p>
          <p className={cx('mt-3 flex items-center gap-2 font-bold', status === 'available' ? 'text-green-700' : status === 'busy' ? 'text-red-600' : 'text-neutral-500')}>
            <span className={cx('h-2.5 w-2.5 rounded-full', status === 'available' ? 'bg-green-500' : status === 'busy' ? 'bg-red-500' : 'bg-neutral-400')} aria-hidden />
            {statusText} · {w.distanceKm} {tr('km')} · ~{w.etaMin} {tr('min')}
          </p>

          <p className="mt-5 text-lg font-bold">{tr('When do you need them?')}</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={tr('When do you need them?')}>
            {WHEN.map(([k, label]) => <Chip key={k} selected={when === k} onClick={() => setWhen(k)}>{tr(label)}</Chip>)}
          </div>

          <p className="mt-5 font-bold">{tr('Your request')}</p>
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-neutral-50 p-4">
            {trade && <trade.Icon className="h-6 w-6 shrink-0 text-blue-500" aria-hidden />}
            <div className="min-w-0">
              <p className="truncate font-bold">{job?.title || job?.summary || job?.text || tr('No problem described yet')}</p>
              <p className="t-body-sm text-neutral-500">{tr(job?.audioUrl ? 'Voice note' : job ? 'Text' : 'You can describe it in the chat')}{job?.duration ? ` · ${job.duration}s` : ''}</p>
            </div>
          </div>

          {!w.available && <Notice tone="tip" className="mt-4" title={tr(status === 'busy' ? 'This worker is busy right now' : 'This worker is unavailable right now')}>{tr('Choose another time or')} <Link href={`/workers${qs({ trade: w.trade, when })}`} className="font-bold underline">{tr('see other workers')}</Link>.</Notice>}
          {user?.role === 'worker' && <Notice tone="info" className="mt-4">{tr('Worker accounts cannot make bookings.')}</Notice>}
          {msg && <Notice tone="error" className="mt-4">{msg}</Notice>}

          <Button onClick={startChat} loading={busy} disabled={!canBook} icon={MessageCircle} full className="mt-5">{t('chat')}</Button>
          <Button variant="secondary" icon={Phone} full className="mt-3" disabled aria-describedby="call-note">{t('call')}</Button>
          <p id="call-note" className="t-body-sm mt-2 text-center text-neutral-500">{tr('The phone number is shared after the booking is confirmed · Payment: cash on completion (mock)')}</p>
        </aside>
      </div>
    </div>
  );
}

export default function WorkerProfilePage() {
  return (
    <Shell>
      <Suspense fallback={<div className="container-rr py-10"><div className="h-80 animate-pulse rounded-3xl bg-neutral-75" aria-hidden /></div>}>
        <Profile />
      </Suspense>
    </Shell>
  );
}
