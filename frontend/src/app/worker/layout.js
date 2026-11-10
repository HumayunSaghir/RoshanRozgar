'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgeCheck, Briefcase, Clock, Gavel, Home, MessageCircle, Star, User, XCircle } from 'lucide-react';
import Header from '@/components/Header';
import { useAuth, useLang } from '@/components/Providers';
import { cx } from '@/components/ui';

const NAV = [
  { href: '/worker/dashboard', label: 'Dashboard', short: 'Home', Icon: Home },
  { href: '/worker/find-jobs', label: 'Find jobs', short: 'Find jobs', Icon: Gavel },
  { href: '/worker/jobs', label: 'Jobs', short: 'Jobs', Icon: Briefcase },
  { href: '/worker/messages', label: 'Messages', short: 'Chat', Icon: MessageCircle },
  { href: '/worker/profile', label: 'Profile', short: 'Profile', Icon: User },
  { href: '/worker/reviews', label: 'Reviews', short: 'Reviews', Icon: Star },
];

// Bottom bar has four slots; Jobs and Reviews stay in the desktop sidebar.
const MOBILE_NAV = NAV.filter((n) => ['/worker/dashboard', '/worker/find-jobs', '/worker/messages', '/worker/profile'].includes(n.href));

function VerificationBanner() {
  const { tr } = useLang();
  const { user } = useAuth();
  const pathname = usePathname();
  const status = user?.verification?.status;
  const { refresh } = useAuth();
  useEffect(() => {
    if (status === 'approved' || !user?.profileComplete) return undefined;
    const t = setInterval(refresh, status === 'pending' ? 15000 : 60000);
    return () => clearInterval(t);
  }, [status, user?.profileComplete, refresh]);
  if (!user || !user.profileComplete || status === 'approved' || pathname.startsWith('/worker/verification')) return null;
  const cfg = {
    pending: { Icon: Clock, tone: 'bg-blue-50 text-blue-800', text: 'Your documents are under approval. You will be notified once an admin reviews them.', cta: 'View status' },
    rejected: { Icon: XCircle, tone: 'bg-red-50 text-red-800', text: 'Your documents were rejected. Fix the issue and submit again to go live.', cta: 'Resubmit documents' },
    none: { Icon: BadgeCheck, tone: 'bg-yellow-50 text-yellow-800', text: 'Verify your identity to appear in search and bid on jobs.', cta: 'Add documents' },
  }[status === 'pending' || status === 'rejected' ? status : 'none'];
  return (
    <div className={`mb-6 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ${cfg.tone}`} role="status">
      <cfg.Icon className="h-6 w-6 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 font-bold">{tr(cfg.text)}</p>
      <Link href="/worker/verification" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 font-bold underline">{tr(cfg.cta)}</Link>
    </div>
  );
}

export default function WorkerLayout({ children }) {
  const { tr } = useLang();
  const pathname = usePathname();
  const active = (href) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      <Header />
      <div className="flex flex-1 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden border-r border-neutral-200 bg-white lg:block">
          <nav aria-label={tr('Worker')} className="sticky top-[100px] flex flex-col gap-3 p-6">
            {NAV.map(({ href, label, Icon }) => (
              <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={cx('flex h-14 items-center gap-4 rounded-2xl px-5 text-lg', active(href) ? 'bg-green-50 font-bold text-green-800' : 'text-text hover:bg-neutral-50')}>
                <Icon className="h-6 w-6" aria-hidden /> {tr(label)}
              </Link>
            ))}
          </nav>
        </aside>
        <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10"><VerificationBanner />{children}</main>
      </div>

      <nav aria-label={tr('Worker')} className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-neutral-200 bg-white lg:hidden">
        {MOBILE_NAV.map(({ href, short, Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={cx('flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold', active(href) ? 'text-green-800' : 'text-neutral-500')}>
            <Icon className="h-6 w-6" aria-hidden /> {tr(short)}
          </Link>
        ))}
      </nav>
    </>
  );
}
