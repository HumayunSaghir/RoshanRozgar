'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Check, Clock, MapPin, Minus, Pencil, Plus, User, Wallet, X, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { skillsFor } from '@/lib/skills';
import { TRADES, fmtRs, tradeById } from '@/lib/trades';
import { useLang } from './Providers';
import { Chip, cx } from './ui';

function Row({ icon: Icon, label, value, filled, editing, onToggle, children, loading }) {
  const { tr } = useLang();
  return (
    <div className={cx('rounded-2xl border bg-white', editing ? 'border-green-500' : 'border-neutral-200')}>
      <button type="button" onClick={onToggle} aria-expanded={editing} className="flex min-h-[72px] w-full items-center gap-4 px-4 py-3 text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-800"><Icon className="h-6 w-6" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-neutral-500">{label}</span>
          <span className={cx('block truncate text-lg font-bold', !filled && 'text-neutral-500')}>{loading ? tr('Listening…') : value || tr('Not set — tap to add')}</span>
        </span>
        {filled ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-white"><Check className="h-5 w-5" aria-hidden /></span>
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-75 text-neutral-600"><Pencil className="h-4 w-4" aria-hidden /></span>
        )}
      </button>
      {editing && <div className="border-t border-neutral-100 px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

function Stepper({ value, onChange, min = 0, max = 100, step = 1, unit }) {
  const { tr } = useLang();
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={tr('Decrease')} onClick={() => onChange(Math.max(min, (Number(value) || 0) - step))} className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-neutral-300 hover:bg-neutral-50"><Minus className="h-6 w-6" aria-hidden /></button>
      <span className="min-w-24 text-center text-2xl font-bold">{value || 0} {unit ? tr(unit) : ''}</span>
      <button type="button" aria-label={tr('Increase')} onClick={() => onChange(Math.min(max, (Number(value) || 0) + step))} className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-neutral-300 hover:bg-neutral-50"><Plus className="h-6 w-6" aria-hidden /></button>
    </div>
  );
}

// Fields extracted from the worker's voice, each tappable to fix. Large steppers and tiles keep
// typing optional.
export default function ProfileEditor({ value, onChange, loading = {} }) {
  const { tr } = useLang();
  const [open, setOpen] = useState(null);
  const [areas, setAreas] = useState([]);
  const [skillDraft, setSkillDraft] = useState('');

  useEffect(() => {
    api.get('/areas').then((d) => setAreas(d.areas)).catch(() => {});
  }, []);

  const toggle = (k) => setOpen((o) => (o === k ? null : k));
  const trade = tradeById(value.trade);
  const set = (patch) => onChange({ ...value, ...patch });
  const skills = value.skills || [];

  return (
    <div className="space-y-3">
      <Row icon={User} label={tr('Name')} value={value.name} filled={Boolean(value.name)} editing={open === 'name'} onToggle={() => toggle('name')} loading={loading.name}>
        <label htmlFor="pe-name" className="sr-only">{tr('Name')}</label>
        <input id="pe-name" value={value.name || ''} onChange={(e) => set({ name: e.target.value })} className="h-14 w-full rounded-2xl border-2 border-neutral-300 px-4 text-lg outline-none focus:border-green-800" autoComplete="name" />
      </Row>

      <Row icon={trade?.Icon || Zap} label={tr('Trade')} value={trade ? tr(trade.label) : ''} filled={Boolean(trade)} editing={open === 'trade'} onToggle={() => toggle('trade')} loading={loading.trade}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={tr('Choose a trade')}>
          {TRADES.map((x) => (
            <Chip key={x.id} selected={value.trade === x.id} onClick={() => { set({ trade: x.id }); setOpen(null); }} icon={x.Icon}>{tr(x.label)}</Chip>
          ))}
        </div>
      </Row>

      <Row icon={Clock} label={tr('Experience')} value={value.experienceYears ? tr('{n} years', { n: value.experienceYears }) : ''} filled={Boolean(value.experienceYears)} editing={open === 'exp'} onToggle={() => toggle('exp')} loading={loading.experienceYears}>
        <Stepper value={value.experienceYears} onChange={(v) => set({ experienceYears: v })} max={60} unit="years" />
      </Row>

      <Row icon={MapPin} label={tr('Area')} value={value.area ? tr(value.area) : ''} filled={Boolean(value.area)} editing={open === 'area'} onToggle={() => toggle('area')} loading={loading.area}>
        <div className="max-h-56 overflow-auto" role="listbox" aria-label={tr('Choose an area')}>
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <Chip key={a.name} selected={value.area === a.name} onClick={() => { set({ area: a.name }); setOpen(null); }}>{tr(a.name)}</Chip>
            ))}
          </div>
        </div>
      </Row>

      <Row icon={Wallet} label={tr('Rate')} value={value.rate ? `${fmtRs(value.rate)}${tr('/visit')}` : ''} filled={Boolean(value.rate)} editing={open === 'rate'} onToggle={() => toggle('rate')} loading={loading.rate}>
        <Stepper value={value.rate} onChange={(v) => set({ rate: v })} step={50} max={50000} min={0} />
        <div className="mt-3 flex flex-wrap gap-2">
          {[500, 800, 1000, 1500, 2000].map((n) => <Chip key={n} selected={value.rate === n} onClick={() => set({ rate: n })}>{fmtRs(n)}</Chip>)}
        </div>
      </Row>

      <Row icon={Briefcase} label={tr('Skills')} value={skills.map((s) => tr(s)).join(', ')} filled={skills.length > 0} editing={open === 'skills'} onToggle={() => toggle('skills')} loading={loading.skills}>
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span key={s} className="inline-flex h-10 items-center gap-1 rounded-full bg-green-50 pl-4 pr-1 font-bold text-green-800">
              {tr(s)}
              <button type="button" aria-label={tr('Remove {skill}', { skill: tr(s) })} onClick={() => set({ skills: skills.filter((x) => x !== s) })} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-green-100"><X className="h-4 w-4" aria-hidden /></button>
            </span>
          ))}
        </div>
        <div className="mt-3">
          <label htmlFor="pe-skill-select" className="mb-1 block font-bold">{value.trade ? tr('Choose a skill') : tr('Choose your trade first')}</label>
          <select
            id="pe-skill-select"
            value=""
            disabled={!value.trade}
            onChange={(e) => {
              const v = e.target.value;
              if (v && !skills.includes(v)) set({ skills: [...skills, v] });
            }}
            className="h-12 w-full cursor-pointer rounded-full border-2 border-neutral-300 bg-white px-4 outline-none focus:border-green-800 disabled:cursor-not-allowed disabled:bg-neutral-50"
          >
            <option value="">{tr('Select from the list…')}</option>
            {skillsFor(value.trade).filter((x) => !skills.includes(x)).map((x) => <option key={x} value={x}>{tr(x)}</option>)}
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <label htmlFor="pe-skill" className="sr-only">{tr('Add a skill')}</label>
          <input id="pe-skill" value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} placeholder={tr('Other skill (optional)')} className="h-12 min-w-0 flex-1 rounded-full border-2 border-neutral-300 px-4 outline-none focus:border-green-800" />
          <button type="button" onClick={() => { const v = skillDraft.trim(); if (v && !skills.includes(v)) set({ skills: [...skills, v] }); setSkillDraft(''); }} className="h-12 cursor-pointer rounded-full bg-green-800 px-5 font-bold text-white hover:bg-green-700">{tr('Add')}</button>
        </div>
      </Row>

      <Row icon={Clock} label={tr('Working hours')} value={`${value.workingHours?.from || '08:00'} – ${value.workingHours?.to || '21:00'}`} filled editing={open === 'hours'} onToggle={() => toggle('hours')}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-bold">{tr('From')} <input type="time" value={value.workingHours?.from || '08:00'} onChange={(e) => set({ workingHours: { ...(value.workingHours || {}), from: e.target.value, to: value.workingHours?.to || '21:00' } })} className="ml-2 h-12 rounded-xl border-2 border-neutral-300 px-3" /></label>
          <label className="font-bold">{tr('To')} <input type="time" value={value.workingHours?.to || '21:00'} onChange={(e) => set({ workingHours: { from: value.workingHours?.from || '08:00', to: e.target.value } })} className="ml-2 h-12 rounded-xl border-2 border-neutral-300 px-3" /></label>
        </div>
        <p className="t-body-sm mt-2 text-neutral-500">{tr('Outside these hours you will not appear as available.')}</p>
      </Row>
    </div>
  );
}
