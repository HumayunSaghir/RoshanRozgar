'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useLang } from './Providers';

export default function Footer() {
  const { t, tr } = useLang();
  const cols = [
    { title: 'Customers', links: [['Find a worker', '/workers'], ['Booking', '/bookings'], ['Help', '/#how']] },
    { title: 'Workers', links: [['Join by voice', '/join'], ['Jobs', '/worker/jobs'], ['Safety', '/#how']] },
    { title: 'Roshan Rozgar', links: [['About', '/#how'], ['Contact', '/#how'], ['Privacy', '/#how']] },
  ];
  return (
    <footer className="mt-auto bg-green-800 text-green-100">
      <div className="container-rr py-10 lg:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <Logo reversed className="h-12 lg:h-[62px]" />
          <div className="hidden gap-16 lg:grid lg:grid-cols-3 xl:gap-24">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="mb-3 font-bold text-white">{tr(c.title)}</p>
                <ul className="space-y-2">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="text-green-300 hover:text-white">{tr(label)}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-green-300 lg:hidden">
            <Link href="/workers" className="hover:text-white">{tr('Find a worker')}</Link> · <Link href="/join" className="hover:text-white">{tr('Become a worker')}</Link> · <Link href="/#how" className="hover:text-white">{tr('Help')}</Link>
          </p>
        </div>
        <p className="t-body-sm mt-8 text-green-300 lg:mt-6">{t('footer.note')}</p>
      </div>
    </footer>
  );
}
