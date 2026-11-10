'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Home, RefreshCw, Search } from 'lucide-react';
import { useLang } from './Providers';
import Header from './Header';
import Footer from './Footer';
import { Button } from './ui';

// Full branded status page used by 404 and error boundaries.
export default function BrandPage({ code, title, text, onRetry, children }) {
  const { tr } = useLang();
  return (
    <>
      <Header />
      <main id="main" className="flex flex-1 items-center bg-green-50">
        <div className="container-rr flex flex-col items-center py-16 text-center sm:py-24">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-soft sm:h-36 sm:w-36">
            <Image src="/brand/logo-mark.png" alt="" width={88} height={88} priority className="h-16 w-16 object-contain sm:h-20 sm:w-20" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <p className="mt-6 text-[4rem] font-bold leading-none text-green-800 sm:text-[6rem]" aria-hidden>{code}</p>
          <h1 className="t-heading-xl mt-3 text-[1.75rem] sm:text-[2.5rem]">{tr(title)}</h1>
          <p className="mt-3 max-w-[520px] text-lg text-neutral-600">{tr(text)}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {onRetry && <Button icon={RefreshCw} onClick={onRetry}>{tr('Try again')}</Button>}
            <Button href="/" icon={Home} variant={onRetry ? 'secondary' : 'primary'}>{tr('Back to home')}</Button>
            <Button href="/workers" icon={Search} variant="secondary">{tr('Find a worker')}</Button>
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
