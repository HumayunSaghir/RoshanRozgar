'use client';

import { Check } from 'lucide-react';
import { cx } from './ui';
import { useLang } from './Providers';

const STEPS = ['Requested', 'Agreed', 'On the way', 'Done'];
const INDEX = { requested: 0, agreed: 1, confirmed: 1, on_the_way: 2, completed: 3 };

// Booking progress: Requested -> Agreed -> On the way -> Done
export default function StatusTracker({ status, className }) {
  const { tr } = useLang();
  const current = INDEX[status] ?? 0;
  return (
    <ol className={cx('flex w-full items-start', className)} aria-label={tr('Booking progress')}>
      {STEPS.map((label, i) => {
        const done = i <= current && !(status === 'requested' && i > 0);
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === current ? 'step' : undefined}>
            {i > 0 && <span className={cx('absolute left-0 right-1/2 top-[19px] h-[3px]', i <= current ? 'bg-green-800' : 'bg-neutral-200')} aria-hidden />}
            {i < STEPS.length - 1 && <span className={cx('absolute left-1/2 right-0 top-[19px] h-[3px]', i < current ? 'bg-green-800' : 'bg-neutral-200')} aria-hidden />}
            <span className={cx('relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2', done ? 'border-green-800 bg-green-800 text-white' : 'border-neutral-300 bg-white')}>
              {done && <Check className="h-5 w-5" aria-hidden />}
            </span>
            <span className={cx('mt-2 text-sm', done ? 'font-bold text-green-800' : 'text-neutral-500')}>{tr(label)}</span>
          </li>
        );
      })}
    </ol>
  );
}
