'use client';

import Link from 'next/link';
import { Check, Mic, Loader2, ShieldCheck, Sparkles, Star, Volume2 } from 'lucide-react';
import { speak } from '@/lib/voice';
import { useLang } from './Providers';

const cx = (...a) => a.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------------------
// Button: pill shaped. Primary = white on Forest (never lime text on forest).
// ---------------------------------------------------------------------------------------
const BTN = {
  primary: 'bg-green-800 text-white hover:bg-green-700 active:bg-green-900 disabled:bg-neutral-200 disabled:text-neutral-500',
  leaf: 'bg-green-500 text-green-900 hover:bg-green-400 active:bg-green-600 disabled:bg-neutral-200 disabled:text-neutral-500',
  secondary: 'bg-white text-text border-2 border-neutral-300 hover:bg-neutral-50 active:bg-neutral-75 disabled:text-neutral-400',
  tertiary: 'bg-transparent text-text hover:bg-neutral-75 active:bg-neutral-100 disabled:text-neutral-400',
  danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-neutral-200 disabled:text-neutral-500',
  quiet: 'bg-green-50 text-green-800 hover:bg-green-100',
};
const BTN_SIZE = { xl: 'h-14 px-6 text-base', lg: 'h-12 px-6 text-base', md: 'h-10 px-5 text-sm', icon: 'h-12 w-12' };

export function Button({ variant = 'primary', size = 'xl', href, icon: Icon, loading, className, children, full, ...rest }) {
  const cls = cx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:cursor-not-allowed',
    BTN[variant],
    BTN_SIZE[size],
    full && 'w-full',
    className
  );
  const inner = (
    <>
      {loading ? <Loader2 className="rr-spin h-5 w-5" aria-hidden /> : Icon ? <Icon className="h-5 w-5" aria-hidden /> : null}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} disabled={loading || rest.disabled} {...rest}>
      {inner}
    </button>
  );
}

// ---------------------------------------------------------------------------------------
// Chip / filter pill
// ---------------------------------------------------------------------------------------
export function Chip({ selected, onClick, children, className, icon: Icon, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        'inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 px-5 text-base font-bold transition-colors',
        selected ? 'border-green-500 bg-green-50 text-green-800' : 'border-neutral-300 bg-white text-text hover:bg-neutral-50',
        className
      )}
      {...rest}
    >
      {selected ? <Check className="h-5 w-5" aria-hidden /> : Icon ? <Icon className="h-5 w-5" aria-hidden /> : null}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------------------
// Audio play button: every instruction can be listened to
// ---------------------------------------------------------------------------------------
export function AudioButton({ text, label = 'Listen', className }) {
  const { tr, lang } = useLang();
  const aria = tr(label);
  return (
    <button
      type="button"
      aria-label={aria}
      title={aria}
      onClick={() => speak(tr(text), lang)}
      className={cx('inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-green-50 text-green-800 transition-colors hover:bg-green-100 active:bg-green-200', className)}
    >
      <Volume2 className="h-5 w-5" aria-hidden />
    </button>
  );
}

// ---------------------------------------------------------------------------------------
// AI chip: marks every AI-produced output
// ---------------------------------------------------------------------------------------
export function AIChip({ children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-800', className)}>
      <Sparkles className="h-4 w-4" aria-hidden />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------------------
// Avatar with initials
// ---------------------------------------------------------------------------------------
export function Avatar({ initials, size = 56, dot, muted, className }) {
  return (
    <span className={cx('relative inline-flex shrink-0 items-center justify-center rounded-full bg-green-200 font-bold text-green-800', muted && 'opacity-60', className)} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials}
      {dot && <span className="absolute bottom-0 right-0 h-[22%] w-[22%] rounded-full border-2 border-white bg-green-500" />}
    </span>
  );
}

export function TrustBadge({ children, muted }) {
  const { tr } = useLang();
  const jobs = typeof children === 'string' ? children.match(/^(\d+) jobs done$/) : null;
  const text = jobs ? tr('{n} jobs done', { n: jobs[1] }) : typeof children === 'string' ? tr(children) : children;
  return (
    <span className={cx('inline-flex min-h-9 items-center gap-2 rounded-md bg-green-50 px-3 py-1.5 text-sm font-bold text-green-800', muted && 'opacity-70')}>
      <ShieldCheck className="h-4 w-4" aria-hidden />
      {text}
    </span>
  );
}

export function Stars({ value = 0, size = 20, interactive, onChange, className }) {
  const { tr } = useLang();
  return (
    <span className={cx('inline-flex items-center gap-0.5', className)} role={interactive ? 'radiogroup' : 'img'} aria-label={tr('{n} out of 5', { n: value })}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = <Star width={size} height={size} className={filled ? 'fill-star text-star' : 'text-neutral-300'} aria-hidden />;
        return interactive ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={tr('{n} stars', { n })} onClick={() => onChange?.(n)} className="cursor-pointer p-1">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}

export function StatusDot({ status }) {
  const map = {
    available: ['bg-green-500', 'text-green-700'],
    busy: ['bg-red-500', 'text-red-600'],
    offline: ['bg-neutral-400', 'text-neutral-500'],
    off_hours: ['bg-neutral-400', 'text-neutral-500'],
  };
  const [dot, text] = map[status] || map.offline;
  return { dot, text };
}

// ---------------------------------------------------------------------------------------
// Mic button: Idle, Listening (pulsing rings), Processing, Done
// ---------------------------------------------------------------------------------------
export function MicButton({ state = 'idle', onClick, size = 96, label, className, disabled }) {
  const { tr } = useLang();
  const listening = state === 'listening';
  const aria = label ? tr(label) : tr(listening ? 'Stop recording' : 'Start speaking');
  return (
    <span className={cx('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      {listening && (
        <>
          <span className="rr-ring absolute inset-0 rounded-full bg-green-300/60" aria-hidden />
          <span className="rr-ring-2 absolute inset-0 rounded-full bg-green-300/60" aria-hidden />
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || state === 'processing'}
        aria-label={aria}
        aria-pressed={listening}
        className="relative inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-green-800 text-white transition-colors hover:bg-green-700 active:bg-green-900 disabled:opacity-70"
      >
        {state === 'processing' ? <Loader2 className="rr-spin h-[40%] w-[40%]" aria-hidden /> : state === 'done' ? <Check className="h-[40%] w-[40%]" aria-hidden /> : <Mic className="h-[40%] w-[40%]" aria-hidden />}
      </button>
    </span>
  );
}

export function Card({ children, className, as: Tag = 'div', ...rest }) {
  return (
    <Tag className={cx('rounded-3xl border border-neutral-200 bg-white', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Notice({ tone = 'tip', icon: Icon, title, children, className }) {
  const { tr } = useLang();
  const tones = {
    tip: 'bg-yellow-50 text-yellow-800',
    error: 'bg-red-50 text-red-800',
    ok: 'bg-green-50 text-green-800',
    info: 'bg-blue-50 text-blue-800',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-2xl px-4 py-3', tones[tone], className)}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
      <div>
        {title && <p className="font-bold">{typeof title === 'string' ? tr(title) : title}</p>}
        {children && <p className="t-body-sm">{typeof children === 'string' ? tr(children) : children}</p>}
      </div>
    </div>
  );
}

export { cx };
