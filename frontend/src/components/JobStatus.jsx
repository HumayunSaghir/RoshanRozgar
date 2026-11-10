'use client';

import { useLang } from './Providers';
import { cx } from './ui';

const TONES = {
  open: ['Open for bids', 'bg-green-50 text-green-800'],
  awarded: ['Awarded', 'bg-blue-50 text-blue-800'],
  cancelled: ['Cancelled', 'bg-red-50 text-red-800'],
  expired: ['Expired', 'bg-neutral-75 text-neutral-700'],
};

export default function JobStatus({ status, className }) {
  const { tr } = useLang();
  const [label, tone] = TONES[status] || TONES.open;
  return <span className={cx('inline-block rounded-full px-3 py-0.5 text-sm font-bold', tone, className)}>{tr(label)}</span>;
}
