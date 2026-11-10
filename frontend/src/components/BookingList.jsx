'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtRs, tradeById } from '@/lib/trades';
import { Avatar, Notice, cx } from './ui';
import { useLang } from './Providers';

const STATUS = {
  requested: ['Request sent', 'bg-yellow-50 text-yellow-800'],
  agreed: ['Price agreed', 'bg-blue-50 text-blue-800'],
  confirmed: ['Confirmed', 'bg-green-50 text-green-800'],
  on_the_way: ['On the way', 'bg-green-100 text-green-800'],
  completed: ['Completed', 'bg-neutral-75 text-neutral-700'],
  cancelled: ['Cancelled', 'bg-red-50 text-red-800'],
  declined: ['Declined', 'bg-red-50 text-red-800'],
};

export default function BookingList({ role, empty }) {
  const { tr } = useLang();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/bookings/mine').then((d) => setItems(d.bookings)).catch((e) => setError(e.message));
  }, []);

  if (error) return <Notice tone="error">{tr(error)}</Notice>;
  if (!items) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-75" aria-hidden />)}</div>;
  if (!items.length) return <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-600">{tr(empty)}</div>;

  return (
    <ul className="space-y-3">
      {items.map((b) => {
        const other = role === 'worker' ? b.customer : b.worker;
        const [label, tone] = STATUS[b.status] || STATUS.requested;
        const href = ['confirmed', 'on_the_way', 'completed'].includes(b.status) && role !== 'worker' ? `/bookings/${b.id}` : `/messages?b=${b.id}`;
        return (
          <li key={b.id}>
            <Link href={href} className="flex min-h-[88px] items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 hover:border-green-500">
              <Avatar initials={other.initials} src={other.avatarUrl} size={56} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">{other.name}</span>
                <span className="block truncate text-neutral-600">{b.aiSummary.title || tr(tradeById(b.trade)?.label)} · {b.address.area} · {tr(b.whenText)}</span>
                <span className={cx('mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-bold', tone)}>{tr(label)}</span>
              </span>
              <span className="text-right">
                <span className="block text-lg font-bold">{fmtRs(b.price || b.offeredPrice)}</span>
                <span className="t-body-sm text-neutral-500">#{b.ref}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-neutral-500" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
