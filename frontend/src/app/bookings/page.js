'use client';

import Shell from '@/components/Shell';
import BookingList from '@/components/BookingList';
import { useLang } from '@/components/Providers';

export default function BookingsPage() {
  const { tr } = useLang();
  return (
    <Shell>
      <div className="container-rr max-w-[900px] pb-16 pt-8">
        <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('My bookings')}</h1>
        <p className="mb-6 mt-1 text-neutral-600">{tr('Requests, agreed prices and finished jobs.')}</p>
        <BookingList role="customer" empty="No bookings yet. Find a worker and start a conversation." />
      </div>
    </Shell>
  );
}
