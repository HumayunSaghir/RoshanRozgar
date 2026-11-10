'use client';

import { useEffect, useRef, useState } from 'react';
import { Briefcase, Home, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, useLang } from './Providers';
import { AudioButton, Button, Notice, cx } from './ui';

// Four boxes for the OTP. Big targets, numeric keypad on phones, paste supported.
function OtpBoxes({ value, onChange, disabled }) {
  const { tr } = useLang();
  const refs = useRef([]);
  const digits = value.padEnd(4, ' ').split('');
  const set = (i, ch) => {
    const arr = value.padEnd(4, ' ').split('');
    arr[i] = ch || ' ';
    onChange(arr.join('').replace(/\s+$/, ''));
  };
  return (
    <div className="flex justify-center gap-3" role="group" aria-label={tr('Verification code')}>
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={digits[i].trim()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={tr('Digit {n}', { n: i + 1 })}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            set(i, ch);
            if (ch && i < 3) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i].trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
            if (text) {
              e.preventDefault();
              onChange(text);
              refs.current[Math.min(text.length, 3)]?.focus();
            }
          }}
          className="h-16 w-14 rounded-2xl border-2 border-neutral-300 bg-white text-center text-3xl font-bold outline-none focus:border-green-800 sm:h-[72px] sm:w-16"
        />
      ))}
    </div>
  );
}

// Phone + OTP login. No passwords. SMS delivery is mocked: the demo OTP is shown on screen.
export default function PhoneOtp({ role: fixedRole, onDone }) {
  const { loginDone } = useAuth();
  const { tr } = useLang();
  const [step, setStep] = useState('phone'); // phone | role | otp
  const [digits, setDigits] = useState('');
  const [role, setRole] = useState(fixedRole || null);
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [demo, setDemo] = useState('');
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [delivery, setDelivery] = useState('demo');

  const phone = digits ? `0${digits.replace(/^0+/, '')}` : '';

  const sendOtp = async (chosenRole = role) => {
    setError('');
    setBusy(true);
    try {
      const r = await api.post('/auth/request-otp', { phone });
      setDemo(r.demoOtp || '');
      setDelivery(r.delivery || 'demo');
      setExisting(r.existingRole);
      if (!r.existingRole && !chosenRole) setStep('role');
      else setStep('otp');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code) => {
    setError('');
    setBusy(true);
    try {
      const r = await api.post('/auth/verify-otp', { phone, otp: code, role: existing || role, name });
      loginDone(r.user);
      onDone(r.user, r.isNew);
    } catch (e) {
      setError(e.message);
      setOtp('');
      setBusy(false);
    }
  };

  useEffect(() => {
    if (step === 'otp' && otp.length === 4 && !busy) verify(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  if (step === 'role') {
    return (
      <div>
        <h2 className="t-heading-lg">{tr('Who are you?')}</h2>
        <p className="mt-1 text-neutral-600">{tr('Choose how you will use RoshanRozgar.')}</p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { id: 'worker', Icon: Briefcase, t: "I'm a worker", s: 'I want to find work' },
            { id: 'customer', Icon: Home, t: 'I need a worker', s: 'I want to hire someone' },
          ].map(({ id, Icon, t, s }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setRole(id);
                setStep('otp');
              }}
              className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-neutral-300 bg-white p-4 text-center hover:border-green-500 hover:bg-green-50"
            >
              <Icon className="h-10 w-10 text-green-800" aria-hidden />
              <span className="text-lg font-bold">{tr(t)}</span>
              <span className="text-neutral-600">{tr(s)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    const isNewCustomer = !existing && role === 'customer';
    return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="t-heading-lg">{tr('Enter the code')}</h2>
            <p className="mt-1 text-neutral-600">{delivery === 'whatsapp' ? tr('We sent a 4-digit code on WhatsApp to +92 {digits}', { digits }) : tr('We sent a 4-digit code to +92 {digits}', { digits })}</p>
          </div>
          <AudioButton text="Enter the 4-digit code sent to your phone." />
        </div>
        {isNewCustomer && (
          <div className="mt-4">
            <label htmlFor="cname" className="font-bold">{tr('Your name (optional)')}</label>
            <input id="cname" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-1 h-14 w-full rounded-2xl border-2 border-neutral-300 px-4 text-lg outline-none focus:border-green-800" />
          </div>
        )}
        <div className="mt-6"><OtpBoxes value={otp} onChange={setOtp} disabled={busy} /></div>
        {demo && (
          <Notice tone="tip" icon={ShieldCheck} className="mt-5" title={tr('Demo code: {code}', { code: demo })}>
            {tr('Code delivery is mocked in demo mode. Enter the code shown here.')}
          </Notice>
        )}
        {error && <Notice tone="error" className="mt-4">{error}</Notice>}
        <Button onClick={() => verify(otp)} disabled={otp.length < 4} loading={busy} full className="mt-5">{tr('Continue')}</Button>
        <div className="mt-3 flex justify-between">
          <button type="button" onClick={() => { setStep('phone'); setOtp(''); }} className="min-h-11 cursor-pointer font-bold text-green-800 hover:underline">{tr('Change number')}</button>
          <button type="button" onClick={() => sendOtp()} className="min-h-11 cursor-pointer font-bold text-green-800 hover:underline">{tr('Resend code')}</button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (digits.length >= 10) sendOtp();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="t-heading-lg">{tr('Enter your phone number')}</h2>
          <p className="mt-1 text-neutral-600">{tr('Just your number. No password needed.')}</p>
        </div>
        <AudioButton text="Enter your phone number." />
      </div>
      <label htmlFor="phone" className="sr-only">{tr('Phone number')}</label>
      <div className={cx('mt-5 flex h-16 items-center overflow-hidden rounded-2xl border-2 bg-white focus-within:border-green-800', error ? 'border-red-500' : 'border-neutral-300')}>
        <span className="flex h-full items-center border-r border-neutral-200 bg-neutral-50 px-4 text-xl font-bold">+92</span>
        <input
          id="phone"
          value={digits}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10))}
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="300 1234567"
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-2xl font-bold tracking-wide outline-none placeholder:font-normal placeholder:text-neutral-400"
        />
      </div>
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
      <Button type="submit" onClick={undefined} loading={busy} disabled={digits.length < 10} full className="mt-5">{tr('Send code')}</Button>
      <p className="t-body-sm mt-3 text-center text-neutral-500">{tr('Demo accounts: 0300 1000010 (worker Arif), 0300 2000001 (customer Sana). Code 1234.')}</p>
    </form>
  );
}
