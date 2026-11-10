'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, Briefcase, CalendarCheck, Gavel, MessageCircle, ShieldCheck, Star, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, useLang } from './Providers';
import { cx } from './ui';

const ICONS = { message: MessageCircle, review: Star, verification: ShieldCheck, offer: Tag, booking: CalendarCheck, bid: Gavel, job: Briefcase };

function ago(tr, iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return tr('Just now');
  if (m < 60) return tr('{n} min ago', { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return tr('{n} h ago', { n: h });
  return tr('{n} d ago', { n: Math.round(h / 24) });
}

// Bell with unread badge and a dropdown of recent notifications (polls every 20 s).
export default function NotificationBell({ className }) {
  const { tr } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/notifications');
      setItems(d.notifications);
      setUnread(d.unread);
    } catch {
      /* keep the last known state */
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [user, load]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    load();
  };
  const markAll = async () => {
    try {
      await api.post('/notifications/read', {});
      setItems((l) => (l || []).map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };
  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      setItems((l) => (l || []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.post('/notifications/read', { id: n.id }).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  return (
    <div className={cx('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? tr('Notifications, {n} unread', { n: unread }) : tr('Notifications')}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-neutral-50 hover:bg-neutral-75"
      >
        <Bell className="h-6 w-6" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[11px] font-bold leading-none text-white" aria-hidden>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={tr('Notifications')} className="fixed inset-x-3 top-[76px] z-50 max-h-[70vh] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-strong sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <p className="text-lg font-bold">{tr('Notifications')}</p>
            <button type="button" onClick={markAll} disabled={unread === 0} className="cursor-pointer text-sm font-bold text-green-800 hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline">
              {tr('Mark all as read')}
            </button>
          </div>
          <ul className="max-h-[calc(70vh-60px)] overflow-y-auto">
            {items === null && [0, 1, 2].map((i) => <li key={i} className="rr-skeleton m-3 h-14 rounded-xl" aria-hidden />)}
            {items && items.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-6 py-10 text-center text-neutral-600">
                <BellOff className="h-8 w-8 text-neutral-400" aria-hidden />
                {tr('You are all caught up')}
              </li>
            )}
            {(items || []).map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)} className={cx('flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50', !n.read && 'bg-green-50')}>
                    <span className={cx('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full', n.read ? 'bg-neutral-75 text-neutral-600' : 'bg-green-100 text-green-800')}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx('block', !n.read && 'font-bold')}>{tr(n.title)}</span>
                      {n.body && <span className="block truncate text-sm text-neutral-600">{n.body}</span>}
                      <span className="mt-0.5 block text-xs text-neutral-500">{ago(tr, n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-green-700" aria-label={tr('Unread')} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
