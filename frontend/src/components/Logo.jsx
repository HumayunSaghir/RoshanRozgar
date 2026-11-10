'use client';

import Link from 'next/link';
import { useLang } from './Providers';

export default function Logo({ reversed = false, className = 'h-10 sm:h-12 lg:h-[58px]', href = '/' }) {
  const { tr } = useLang();
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={reversed ? '/brand/logo-full-reversed.png' : '/brand/logo-full.png'} alt="Roshan Rozgar" className={`${className} w-auto`} />
  );
  return href ? (
    <Link href={href} aria-label={tr('Roshan Rozgar home')} className="inline-flex shrink-0 items-center">
      {img}
    </Link>
  ) : (
    img
  );
}
