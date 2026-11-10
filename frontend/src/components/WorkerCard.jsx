'use client';

import { MapPin, Star } from 'lucide-react';
import { useLang } from './Providers';
import { Avatar, TrustBadge, cx, StatusDot } from './ui';
import { fmtRs, tradeById } from '@/lib/trades';

// Compact worker card used in search results. Busy workers are shown greyed out at the bottom.
export default function WorkerCard({ worker, selected, onSelect, onOpen }) {
  const { t, tr } = useLang();
  const busy = !worker.available;
  const { dot, text } = StatusDot(worker.status);
  const trade = tradeById(worker.trade);
  const label = worker.status === 'available' ? t('status.available') : t(`status.${worker.status}`, 'Offline');

  return (
    <article
      className={cx(
        'cursor-pointer rounded-3xl border bg-white p-4 transition-colors sm:p-5',
        selected ? 'border-2 border-green-500 bg-green-50' : 'border-neutral-200 hover:border-neutral-300',
        busy && 'opacity-60'
      )}
      onClick={() => onSelect?.(worker.id)}
    >
      <div className="flex items-start gap-4">
        <Avatar initials={worker.initials} src={worker.avatarUrl} size={72} muted={busy} className="sm:!h-20 sm:!w-20" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="t-heading-sm truncate sm:text-xl">
              <button type="button" onClick={(e) => { e.stopPropagation(); onOpen?.(worker.id); }} className="cursor-pointer text-left hover:underline">
                {worker.name}
              </button>
            </h3>
            <p className="shrink-0 text-right">
              <span className="block text-lg font-bold sm:text-xl">{fmtRs(worker.rate)}</span>
              <span className="t-body-sm text-neutral-500">{t('visit')}</span>
            </p>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 text-neutral-600">
            <span>
              {tr(trade?.label || worker.trade)}
              {worker.experienceYears ? ` · ${tr('{n} yrs', { n: worker.experienceYears })}` : ''}
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-text">
              <Star className="h-4 w-4 fill-star text-star" aria-hidden />
              {worker.rating.toFixed(1)} ({worker.reviewCount})
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-neutral-600">
              <MapPin className="h-4 w-4" aria-hidden />
              {worker.distanceKm} {tr('km')}
            </span>
            <span className={cx('inline-flex items-center gap-2 font-bold', text)}>
              <span className={cx('h-2.5 w-2.5 rounded-full', dot)} aria-hidden />
              {label}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 sm:pl-24">
        {worker.badges.slice(0, 3).map((b) => (
          <TrustBadge key={b} muted={busy}>{b}</TrustBadge>
        ))}
      </div>
    </article>
  );
}
