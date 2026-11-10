'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Briefcase, ChevronDown, LogOut, Menu, MessageCircle, User, X, CalendarCheck } from 'lucide-react';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useAuth, useLang } from './Providers';
import { Avatar, Button, cx } from './ui';

export function LangToggle({ className }) {
  const { lang, setLang, tr } = useLang();
  const seg = (code, label, urdu) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      aria-pressed={lang === code}
      lang={code}
      className={cx('flex h-full cursor-pointer items-center rounded-full px-2.5 text-sm transition-colors sm:px-4 sm:text-base', urdu && 'urdu !leading-none', lang === code ? 'bg-green-800 font-bold text-white' : 'text-text hover:bg-neutral-75')}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label={tr('Language')} className={cx('inline-flex h-12 items-center gap-1 rounded-full border-2 border-neutral-300 bg-white p-1', className)}>
      {seg('en', 'English')}
      {seg('ur', 'اردو', true)}
    </div>
  );
}

export default function Header() {
  const { t, tr } = useLang();
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const isAdmin = user?.role === 'admin';
  const links = isAdmin ? [{ href: '/admin/dashboard', label: tr('Verifications'), active: pathname.startsWith('/admin') }] : [
    { href: '/workers', label: t('nav.find'), active: pathname.startsWith('/workers') },
    { href: '/#how', label: t('nav.how'), active: false },
    ...(user?.role === 'worker'
      ? [{ href: '/worker/find-jobs', label: tr('Find jobs'), active: pathname.startsWith('/worker/find-jobs') }]
      : [{ href: '/jobs/new', label: tr('Post a job'), active: pathname.startsWith('/jobs') }]),
    ...(user ? [] : [{ href: '/join', label: t('nav.join'), active: pathname === '/join' }]),
  ];
  const home = user?.role === 'worker' ? '/worker/dashboard' : isAdmin ? '/admin/dashboard' : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="container-rr flex h-[72px] items-center justify-between gap-4 lg:h-[100px]">
        <Logo href={home} />

        <nav aria-label={tr('Main')} className="hidden h-full items-stretch gap-10 lg:flex xl:gap-16">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active ? 'page' : undefined}
              className={cx('relative flex items-center px-1 text-lg', l.active ? 'font-bold text-green-800' : 'text-text hover:text-green-800')}
            >
              {l.label}
              {l.active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-green-800" />}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <LangToggle />
          {ready && user ? (
            <>
              <NotificationBell />
              <div className="relative" ref={menuRef}>
                <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" className="flex cursor-pointer items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-neutral-50">
                  <Avatar initials={(user.name || 'U')[0]} size={48} />
                  <span className="text-lg font-bold">{user.name ? user.name.split(' ')[user.name.startsWith('Ustad') ? 1 : 0] : tr('Account')}</span>
                  <ChevronDown className="h-5 w-5 text-neutral-500" aria-hidden />
                </button>
                {menu && (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-neutral-200 bg-white p-2 shadow-strong">
                    {!isAdmin && <MenuLink href={user.role === 'worker' ? '/worker/profile' : '/profile'} icon={User}>{t('nav.profile')}</MenuLink>}
                    {user.role === 'customer' && <MenuLink href="/bookings" icon={CalendarCheck}>{t('nav.bookings')}</MenuLink>}
                    {user.role === 'customer' && <MenuLink href="/jobs" icon={Briefcase}>{tr('My jobs')}</MenuLink>}
                    {!isAdmin && <MenuLink href={user.role === 'worker' ? '/worker/messages' : '/messages'} icon={MessageCircle}>{t('nav.messages')}</MenuLink>}
                    <button type="button" role="menuitem" onClick={logout} className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-bold text-red-600 hover:bg-red-50">
                      <LogOut className="h-5 w-5" aria-hidden /> {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="px-2 text-lg font-bold hover:text-green-800">{t('nav.login')}</Link>
              <Button href="/login" size="lg">{t('nav.start')}</Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden">
          <LangToggle className="h-11" />
          {ready && user && <NotificationBell />}
          <button type="button" onClick={() => setOpen((o) => !o)} aria-label={t('nav.menu')} aria-expanded={open} className="inline-flex cursor-pointer h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-neutral-50 hover:bg-neutral-75">
            {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label={tr('Mobile')} className="border-t border-neutral-200 bg-white lg:hidden">
          <div className="container-rr flex flex-col gap-1 py-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={cx('flex h-14 items-center rounded-xl px-3 text-lg', l.active ? 'bg-green-50 font-bold text-green-800' : 'hover:bg-neutral-50')}>
                {l.label}
              </Link>
            ))}
            {ready && user ? (
              <>
                {!isAdmin && <Link href={user.role === 'worker' ? '/worker/dashboard' : '/bookings'} className="flex h-14 items-center rounded-xl px-3 text-lg hover:bg-neutral-50">{user.role === 'worker' ? tr('Dashboard') : t('nav.bookings')}</Link>}
                {user.role === 'customer' && <Link href="/jobs" className="flex h-14 items-center rounded-xl px-3 text-lg hover:bg-neutral-50">{tr('My jobs')}</Link>}
                {!isAdmin && <Link href={user.role === 'worker' ? '/worker/messages' : '/messages'} className="flex h-14 items-center rounded-xl px-3 text-lg hover:bg-neutral-50">{t('nav.messages')}</Link>}
                <button type="button" onClick={logout} className="flex h-14 cursor-pointer items-center rounded-xl px-3 text-left text-lg font-bold text-red-600 hover:bg-red-50">{t('nav.logout')}</button>
              </>
            ) : (
              <div className="flex gap-3 pt-2">
                <Button href="/login" variant="secondary" size="lg" className="flex-1">{t('nav.login')}</Button>
                <Button href="/login" size="lg" className="flex-1">{t('nav.start')}</Button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

function MenuLink({ href, icon: Icon, children }) {
  return (
    <Link href={href} role="menuitem" className="flex h-12 items-center gap-3 rounded-xl px-3 font-bold hover:bg-neutral-50">
      <Icon className="h-5 w-5 text-green-800" aria-hidden /> {children}
    </Link>
  );
}
