'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button, cx } from './ui';
import { useLang } from './Providers';

// A simplified, stylised neighbourhood map (no external map tiles). Worker positions are real
// distances from the customer's location, drawn to scale. Documented in the README as simplified.
export default function MapView({ center, workers, selectedId, onSelect, onOpen, className }) {
  const { t, tr } = useLang();
  const [zoom, setZoom] = useState(1);

  const pins = useMemo(() => {
    const cosLat = Math.cos((center.lat * Math.PI) / 180);
    const maxKm = Math.max(1.5, ...workers.map((w) => w.distanceKm || 0));
    const px = 38 / maxKm; // % of half-size per km, so the farthest worker sits near the edge
    return workers.map((w) => {
      const dx = (w.location.lng - center.lng) * 111 * cosLat;
      const dy = -(w.location.lat - center.lat) * 111;
      const x = Math.max(8, Math.min(92, 50 + dx * px * zoom));
      const y = Math.max(10, Math.min(78, 44 + dy * px * zoom));
      return { w, x, y };
    });
  }, [workers, center, zoom]);

  const selected = workers.find((w) => w.id === selectedId) || null;

  return (
    <div className={cx('relative overflow-hidden rounded-3xl bg-[#edf3e9]', className)}>
      {/* streets */}
      <div className="absolute inset-0" aria-hidden>
        {[8, 20, 32, 44, 56, 68, 80, 92].map((p) => (
          <span key={`v${p}`} className="absolute inset-y-0 w-[3px] bg-white" style={{ left: `${p}%` }} />
        ))}
        {[10, 24, 38, 52, 66, 80].map((p) => (
          <span key={`h${p}`} className="absolute inset-x-0 h-[3px] bg-white" style={{ top: `${p}%` }} />
        ))}
        <span className="absolute inset-y-[6%] left-[52%] w-3 rounded-full bg-yellow-100" />
        <span className="absolute inset-x-[10%] top-[52%] h-3 rounded-full bg-yellow-100" />
        <span className="absolute right-[10%] top-[12%] h-[30%] w-[22%] rounded-2xl bg-green-100" />
      </div>

      {/* customer */}
      <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: '50%', top: '44%' }} aria-label={tr('Your location')}>
        <span className="block h-16 w-16 rounded-full bg-blue-200/70" />
        <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500" />
      </span>

      {/* workers */}
      {pins.map(({ w, x, y }) => (
        <button
          key={w.id}
          type="button"
          onClick={() => onSelect?.(w.id)}
          aria-label={tr('{name}, {km} km, {status}', { name: w.name, km: w.distanceKm, status: tr(w.available ? 'Available now' : 'Busy') })}
          className={cx(
            'absolute -translate-x-1/2 -translate-y-1/2 flex cursor-pointer items-center justify-center rounded-full border-[3px] bg-white text-sm font-bold text-green-800 transition-all',
            w.available ? 'border-green-500' : 'border-neutral-400 text-neutral-600',
            w.id === selectedId ? 'z-10 h-14 w-14 border-4' : 'h-12 w-12'
          )}
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          {w.initials}
        </button>
      ))}

      <div className="absolute right-4 top-4 flex flex-col overflow-hidden rounded-xl bg-white shadow-medium">
        <button type="button" aria-label={tr('Zoom in')} onClick={() => setZoom((z) => Math.min(3, z * 1.4))} className="flex cursor-pointer h-11 w-11 items-center justify-center hover:bg-neutral-50">
          <Plus className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" aria-label={tr('Zoom out')} onClick={() => setZoom((z) => Math.max(0.5, z / 1.4))} className="flex cursor-pointer h-11 w-11 items-center justify-center border-t border-neutral-100 hover:bg-neutral-50">
          <Minus className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {selected && onOpen && (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-medium sm:inset-x-6 sm:bottom-6 sm:p-4">
          <div className="min-w-0">
            <p className="truncate font-bold">
              {selected.name.split(' ').slice(0, 2).join(' ')} · {selected.distanceKm} {tr('km')} · {selected.etaMin} {tr('min')}
            </p>
            <p className={cx('font-bold', selected.available ? 'text-green-700' : 'text-red-600')}>
              {selected.available ? t('status.available') : t('status.busy')}
            </p>
          </div>
          <Button size="lg" onClick={() => onOpen(selected.id)}>{tr('Profile')}</Button>
        </div>
      )}
    </div>
  );
}
