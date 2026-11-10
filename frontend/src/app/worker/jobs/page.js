'use client';

import BookingList from '@/components/BookingList';
import { useLang } from '@/components/Providers';

export default function WorkerJobs() {
  const { tr } = useLang();
  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="t-heading-xl text-[1.875rem] sm:text-[2.5rem]">{tr('Jobs')}</h1>
      <p className="mb-6 mt-1 text-neutral-600">{tr('All your requests and bookings.')}</p>
      <BookingList role="worker" empty={tr('No jobs yet. Stay available and requests will appear here.')} />
    </div>
  );
}
