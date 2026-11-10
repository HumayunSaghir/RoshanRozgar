import { Zap, Droplet, Snowflake, Hammer, Wrench, PaintRoller, BrickWall, Flame } from 'lucide-react';

export const TRADES = [
  { id: 'electrician', label: 'Electrician', urdu: 'الیکٹریشن', short: 'Electrician', Icon: Zap, plural: 'Electricians' },
  { id: 'plumber', label: 'Plumber', urdu: 'پلمبر', short: 'Plumber', Icon: Droplet, plural: 'Plumbers' },
  { id: 'ac_technician', label: 'AC Technician', urdu: 'اے سی', short: 'AC Tech', Icon: Snowflake, plural: 'AC Technicians' },
  { id: 'carpenter', label: 'Carpenter', urdu: 'ترکھان', short: 'Carpenter', Icon: Hammer, plural: 'Carpenters' },
  { id: 'mechanic', label: 'Mechanic', urdu: 'مکینک', short: 'Mechanic', Icon: Wrench, plural: 'Mechanics' },
  { id: 'painter', label: 'Painter', urdu: 'پینٹر', short: 'Painter', Icon: PaintRoller, plural: 'Painters' },
  { id: 'mason', label: 'Mason', urdu: 'مستری', short: 'Mason', Icon: BrickWall, plural: 'Masons' },
  { id: 'welder', label: 'Welder', urdu: 'ویلڈر', short: 'Welder', Icon: Flame, plural: 'Welders' },
];

export const tradeById = (id) => TRADES.find((t) => t.id === id);

export const TAG_LABELS = {
  punctual: 'On time',
  clean: 'Clean work',
  fair_price: 'Fair price',
  polite: 'Polite',
  late: 'Arrived late',
};

export const fmtRs = (n) => `Rs ${Number(n || 0).toLocaleString('en-US')}`;
