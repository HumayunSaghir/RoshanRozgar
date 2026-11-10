'use client';

import Image from 'next/image';
import { useLang } from './Providers';

// Branded full-page loader (route transitions / first paint of client-only screens).
export default function PageLoader({ label = 'Loading…' }) {
  const { tr } = useLang();
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-5 py-20" role="status" aria-live="polite">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="rr-spin absolute inset-0 rounded-full border-4 border-green-100 border-t-green-800" aria-hidden />
        <Image src="/brand/logo-mark.png" alt="" width={48} height={48} priority className="h-12 w-12 object-contain" />
      </div>
      <p className="font-bold text-green-800">{tr(label)}</p>
    </div>
  );
}
