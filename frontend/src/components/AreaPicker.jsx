'use client';

import { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { useLang, useLoc } from './Providers';
import { cx } from './ui';

// Shows the customer's area ("G-11/3, Islamabad") with a "Badlein" (change) control.
export default function AreaPicker({ className }) {
  const { loc, setLoc } = useLoc();
  const { t, tr, trLoc } = useLang();
  const [open, setOpen] = useState(false);
  const [areas, setAreas] = useState([]);
  const [msg, setMsg] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open || areas.length) return;
    api.get('/areas').then((d) => setAreas(d.areas)).catch(() => {});
  }, [open, areas.length]);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const useGps = () => {
    setMsg('');
    if (!navigator.geolocation) return setMsg(tr('Location is not available on this device. Please pick an area.'));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLoc({ label: 'My location', area: 'G-11', lat: p.coords.latitude, lng: p.coords.longitude, gps: true });
        setOpen(false);
      },
      () => setMsg(tr('Location access was denied. Please choose an area.')),
      { timeout: 8000 }
    );
  };

  return (
    <div className={cx('relative', className)} ref={ref}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-bold">
          <MapPin className="h-5 w-5 text-green-800" aria-hidden />
          {trLoc(loc.label)}
        </span>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-11 cursor-pointer px-2 font-bold text-green-800 hover:underline">
          {t('search.change')}
        </button>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-strong sm:right-auto sm:w-72">
          <button type="button" onClick={useGps} className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-bold text-green-800 hover:bg-green-50">
            <Crosshair className="h-5 w-5" aria-hidden /> {tr('Use my location')}
          </button>
          {msg && <p className="px-3 pb-2 text-sm text-red-600">{msg}</p>}
          {['Islamabad', 'Rawalpindi'].map((city) => (
            <div key={city}>
              <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-neutral-500">{tr(city)}</p>
              {areas.filter((a) => a.city === city).map((a) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => {
                    setLoc({ label: `${a.name}${a.city === 'Islamabad' && /^[A-Z]-\d+$/.test(a.name) ? '/3' : ''}, ${a.city}`, area: a.name, lat: a.lat, lng: a.lng });
                    setOpen(false);
                  }}
                  className={cx('flex h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left hover:bg-neutral-50', loc.area === a.name && !loc.gps && 'bg-green-50 font-bold text-green-800')}
                >
                  {tr(a.name)}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
