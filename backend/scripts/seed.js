// Seeds demo data: workers, customers, reviews, and a few live bookings.
// Everything created here is SIMULATED and is listed in the README under "Seeded / mocked".
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const servers = (process.env.MONGODB_DNS_SERVERS || '').split(',').map((x) => x.trim()).filter(Boolean);
if (servers.length) require('dns').setServers(servers);
const User = require('../models/User');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const Review = require('../models/Review');
const SlotLock = require('../models/SlotLock');
const OtpCode = require('../models/OtpCode');
const { Counter } = require('../models/Counter');
const { findArea } = require('../services/geo');
const { acquireSlots } = require('../services/slots');
const { computeBadges } = require('../services/trust');
const { summarizeReviews } = require('../services/ai');

let seedRef = 1000;
const CENTER = { lat: 33.6695, lng: 72.9985 }; // G-11/3, the default customer location

function offset(km, bearingDeg) {
  const b = (bearingDeg * Math.PI) / 180;
  const dLat = (km * Math.cos(b)) / 111;
  const dLng = (km * Math.sin(b)) / (111 * Math.cos((CENTER.lat * Math.PI) / 180));
  return { lat: CENTER.lat + dLat, lng: CENTER.lng + dLng };
}

function atArea(name, jitterKm = 0.4, seed = 1) {
  const a = findArea(name);
  const ang = (seed * 137) % 360;
  const dLat = (jitterKm * Math.cos((ang * Math.PI) / 180)) / 111;
  const dLng = (jitterKm * Math.sin((ang * Math.PI) / 180)) / (111 * Math.cos((a.lat * Math.PI) / 180));
  return { lat: a.lat + dLat, lng: a.lng + dLng, area: a.name, city: a.city };
}

const WORKERS = [
  // plumbers around G-11/3 (matches the designed results screen)
  { n: 'Ustad Rafiq Ahmed', p: '03001000001', t: 'plumber', exp: 15, rate: 900, r: 4.9, rc: 41, jobs: 18, loc: { ...offset(1.2, 40), area: 'G-11', city: 'Islamabad' }, skills: ['Leak repair', 'Pipe fitting', 'Bathroom fitting'], tags: { punctual: 20, clean: 24, fair_price: 21, polite: 12 }, intro: 'My name is Rafiq Ahmed. I have been a plumber for fifteen years, working in G-11 and nearby areas.' },
  { n: 'Imran Masih', p: '03001000002', t: 'plumber', exp: 8, rate: 800, r: 4.7, rc: 22, jobs: 18, loc: { ...offset(1.9, 150), area: 'G-11', city: 'Islamabad' }, skills: ['Leak repair', 'Tank cleaning'], tags: { punctual: 9, clean: 11, fair_price: 12, polite: 6 }, intro: 'My name is Imran Masih. I have eight years of plumbing experience.' },
  { n: 'Shahid Iqbal', p: '03001000003', t: 'plumber', exp: 5, rate: 750, r: 4.5, rc: 9, jobs: 9, loc: { ...offset(2.6, 250), area: 'G-10', city: 'Islamabad' }, skills: ['Pipe fitting'], tags: { punctual: 3, clean: 4, fair_price: 5, late: 2 }, intro: 'My name is Shahid Iqbal. I have been a plumber for five years.' },
  { n: 'Naveed Akhtar', p: '03001000004', t: 'plumber', exp: 10, rate: 1000, r: 4.8, rc: 30, jobs: 20, loc: { ...offset(0.8, 320), area: 'G-11', city: 'Islamabad' }, skills: ['Leak repair', 'Bathroom fitting'], tags: { punctual: 14, clean: 15, fair_price: 10, polite: 9 }, intro: 'My name is Naveed Akhtar. I have ten years of plumbing experience.', busyNow: true },
  { n: 'Farhan Shah', p: '03001000005', t: 'plumber', exp: 6, rate: 700, r: 4.4, rc: 12, jobs: 11, loc: atArea('F-11', 0.5, 2), skills: ['Leak repair'], tags: { fair_price: 7, punctual: 4 }, intro: 'My name is Farhan Shah. I am a plumber.' },
  // electricians
  { n: 'Muhammad Arif', p: '03001000010', t: 'electrician', exp: 12, rate: 800, r: 4.8, rc: 32, jobs: 30, loc: atArea('G-9', 0.3, 3), skills: ['Wiring', 'UPS fitting', 'Fan fitting'], tags: { punctual: 15, clean: 14, fair_price: 16, polite: 10 }, intro: 'My name is Muhammad Arif. I have been an electrician for twelve years, working in G-9.' },
  { n: 'Asif Electric', p: '03001000011', t: 'electrician', exp: 9, rate: 700, r: 4.6, rc: 18, jobs: 15, loc: atArea('G-10', 0.5, 4), skills: ['Wiring', 'Switch board'], tags: { punctual: 8, fair_price: 9 }, intro: 'My name is Asif. I do electrical work.' },
  { n: 'Kamran Butt', p: '03001000012', t: 'electrician', exp: 14, rate: 1000, r: 4.9, rc: 36, jobs: 28, loc: atArea('F-10', 0.4, 5), skills: ['Wiring', 'Geyser', 'UPS fitting'], tags: { punctual: 18, clean: 17, polite: 15, fair_price: 9 }, intro: 'My name is Kamran Butt. I have fourteen years of electrical experience.' },
  { n: 'Zubair Ali', p: '03001000013', t: 'electrician', exp: 4, rate: 600, r: 4.3, rc: 7, jobs: 6, loc: atArea('I-8', 0.5, 6), skills: ['Fan fitting', 'Switch board'], tags: { fair_price: 4, late: 2 }, intro: 'My name is Zubair Ali. I am an electrician.' },
  // AC technicians
  { n: 'Tariq Cool Care', p: '03001000020', t: 'ac_technician', exp: 11, rate: 1800, r: 4.7, rc: 25, jobs: 22, loc: atArea('G-11', 0.6, 7), skills: ['AC service', 'Gas filling', 'AC installation'], tags: { punctual: 11, clean: 13, polite: 9 }, intro: 'My name is Tariq. I have eleven years of AC repair experience.' },
  { n: 'Adeel Raza', p: '03001000021', t: 'ac_technician', exp: 7, rate: 1500, r: 4.5, rc: 14, jobs: 12, loc: atArea('F-8', 0.4, 8), skills: ['AC service', 'Gas filling'], tags: { fair_price: 8, punctual: 6 }, intro: 'My name is Adeel Raza. I repair and service air conditioners.' },
  // carpenters
  { n: 'Bashir Ahmed', p: '03001000030', t: 'carpenter', exp: 20, rate: 1200, r: 4.8, rc: 28, jobs: 24, loc: atArea('G-9', 0.6, 9), skills: ['Door fitting', 'Wardrobe', 'Furniture'], tags: { clean: 14, polite: 12, fair_price: 10 }, intro: 'My name is Bashir Ahmed. I have been a carpenter for twenty years.' },
  { n: 'Latif Hussain', p: '03001000031', t: 'carpenter', exp: 13, rate: 1100, r: 4.6, rc: 16, jobs: 14, loc: atArea('Satellite Town', 0.4, 10), skills: ['Door fitting', 'Furniture'], tags: { clean: 8, punctual: 5 }, intro: 'My name is Latif. I am a carpenter.' },
  // mechanics
  { n: 'Waqar Mistri', p: '03001000040', t: 'mechanic', exp: 16, rate: 1500, r: 4.7, rc: 21, jobs: 19, loc: atArea('I-10', 0.5, 11), skills: ['Engine work', 'Brake work'], tags: { fair_price: 11, polite: 8 }, intro: 'My name is Waqar. I am a car mechanic.' },
  { n: 'Salman Khan', p: '03001000041', t: 'mechanic', exp: 6, rate: 1000, r: 4.4, rc: 10, jobs: 9, loc: atArea('Saddar', 0.5, 12), skills: ['Bike repair'], tags: { fair_price: 5, late: 2 }, intro: 'My name is Salman. I repair bikes.' },
  // painters, masons, welders
  { n: 'Noman Ali', p: '03001000050', t: 'painter', exp: 10, rate: 2000, r: 4.6, rc: 15, jobs: 13, loc: atArea('G-13', 0.5, 13), skills: ['Wall paint', 'Polish'], tags: { clean: 9, punctual: 6 }, intro: 'My name is Noman. I am a painter.' },
  { n: 'Rashid Mehmood', p: '03001000060', t: 'mason', exp: 18, rate: 2000, r: 4.7, rc: 19, jobs: 17, loc: atArea('Chaklala', 0.5, 14), skills: ['Tiles', 'Plaster', 'Brickwork'], tags: { clean: 10, fair_price: 8 }, intro: 'My name is Rashid. I am a mason.' },
  { n: 'Iqbal Lohar', p: '03001000070', t: 'welder', exp: 22, rate: 1500, r: 4.8, rc: 23, jobs: 21, loc: atArea('Commercial Market', 0.4, 15), skills: ['Gate and grill', 'Welding'], tags: { fair_price: 12, polite: 9 }, intro: 'My name is Iqbal. I am a welder.' },
  { n: 'Nadeem Pervaiz', p: '03001000071', t: 'welder', exp: 8, rate: 1300, r: 4.4, rc: 8, jobs: 7, loc: atArea('Bahria Phase 7', 0.4, 16), skills: ['Welding'], tags: { punctual: 3 }, intro: 'My name is Nadeem. I am a welder.' },
];

const CUSTOMERS = [
  { n: 'Sana Khan', p: '03002000001', area: 'G-11' },
  { n: 'Bilal Ahmed', p: '03002000002', area: 'G-11' },
  { n: 'Ayesha Malik', p: '03002000003', area: 'F-10' },
  { n: 'Hina Farooq', p: '03002000004', area: 'G-9' },
  { n: 'Usman Tariq', p: '03002000005', area: 'F-8' },
  { n: 'Fatima Noor', p: '03002000006', area: 'G-10' },
  { n: 'Omar Siddiqui', p: '03002000007', area: 'I-8' },
];

const REVIEW_TEXT = [
  { rating: 5, tags: ['punctual', 'clean'], comment: 'Arrived on time and did very clean work.' },
  { rating: 5, tags: ['fair_price', 'polite'], comment: 'Fair price and polite. I will call again.' },
  { rating: 4, tags: ['clean'], comment: 'Good work, though it took a little longer.' },
  { rating: 5, tags: ['punctual', 'fair_price'], comment: 'Explained the work well and the price was fair.' },
  { rating: 4, tags: ['late', 'clean'], comment: 'Good work, just arrived a little late.' },
];

function pktToday(h, m = 0, dayOffset = 0) {
  const now = new Date();
  const p = new Date(now.getTime() + 5 * 3600000);
  return new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() + dayOffset, h, m) - 5 * 3600000);
}

async function makeBooking({ customer, worker, status, when, whenLabel = 'now', price, offered, area, text, title, summary, range, urdu, daysAgo = 0 }) {
  const a = findArea(area) || findArea('G-11');
  const scheduledFor = when || new Date();
  const b = await Booking.create({
    ref: `RR-${++seedRef}`,
    customer: customer._id,
    worker: worker._id,
    trade: worker.trade,
    problem: { text, transcriptUrdu: urdu || '', transcriptRoman: text },
    aiSummary: { title, summary, urgency: whenLabel, priceMin: range?.[0] || 0, priceMax: range?.[1] || 0, source: 'rules' },
    whenLabel,
    scheduledFor,
    address: { area: a.name, text: `${a.name}, ${a.city}`, location: { type: 'Point', coordinates: [a.lng, a.lat] } },
    offeredPrice: offered || price || 0,
    price: status === 'requested' ? 0 : price || offered || 0,
    status,
    confirmedAt: ['confirmed', 'on_the_way', 'completed'].includes(status) ? scheduledFor : undefined,
    completedAt: status === 'completed' ? new Date(scheduledFor.getTime() + 3600000 - daysAgo * 0) : undefined,
    reviewed: false,
    seeded: true,
  });
  return b;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roshanrozgar');
  // Only remove previously SEEDED data so real sign-ups, bookings and jobs survive a re-seed.
  const Job = require('../models/Job');
  const Bid = require('../models/Bid');
  const Notification = require('../models/Notification');
  const seededUsers = (await User.find({ seeded: true }).select('_id')).map((u) => u._id);
  const seededBookings = (await Booking.find({ seeded: true }).select('_id')).map((x) => x._id);
  const seededJobs = (await Job.find({ customer: { $in: seededUsers } }).select('_id')).map((x) => x._id);
  await Promise.all([
    Message.deleteMany({ booking: { $in: seededBookings } }),
    SlotLock.deleteMany({ booking: { $in: seededBookings } }),
    Review.deleteMany({ $or: [{ booking: { $in: seededBookings } }, { worker: { $in: seededUsers } }] }),
    Bid.deleteMany({ $or: [{ job: { $in: seededJobs } }, { worker: { $in: seededUsers } }] }),
    Notification.deleteMany({ user: { $in: seededUsers } }),
    OtpCode.deleteMany({}),
  ]);
  await Job.deleteMany({ _id: { $in: seededJobs } });
  await Booking.deleteMany({ seeded: true });
  await User.deleteMany({ seeded: true });
  if (!(await Booking.exists({}))) await Counter.deleteMany({ _id: 'booking' });
  await User.syncIndexes();

  const customers = [];
  for (const c of CUSTOMERS) {
    const a = findArea(c.area);
    customers.push(
      await User.create({ name: c.n, phone: c.p, role: 'customer', area: a.name, city: a.city, location: { type: 'Point', coordinates: [a.lng, a.lat] }, seeded: true })
    );
  }

  // Demo admin account (login with the demo code). Remove or change this number before a real launch.
  await User.create({ name: 'RoshanRozgar Admin', phone: '03000000000', role: 'admin', area: 'Blue Area', city: 'Islamabad', profileComplete: true, seeded: true });

  const workers = [];
  for (const w of WORKERS) {
    const tagMap = new Map(Object.entries(w.tags));
    const doc = await User.create({
      name: w.n,
      phone: w.p,
      role: 'worker',
      trade: w.t,
      skills: w.skills,
      experienceYears: w.exp,
      rate: w.rate,
      area: w.loc.area,
      city: w.loc.city,
      location: { type: 'Point', coordinates: [w.loc.lng, w.loc.lat] },
      voiceTranscript: w.intro,
      rating: w.r,
      reviewCount: w.rc,
      jobsDone: w.jobs,
      reviewTagCounts: tagMap,
      isAvailable: true,
      profileComplete: true,
      verification: { status: 'approved', reviewedAt: new Date(), adminComment: 'Seeded demo worker', attempts: 1 },
      seeded: true,
    });
    doc.badges = computeBadges(doc);
    doc.aiReviewSummary = (await summarizeReviews(doc, [])).text;
    await doc.save();
    workers.push(doc);
  }
  const byPhone = (p) => workers.find((w) => w.phone === p);

  // Past reviews: a handful of real Review documents per worker (verified completed bookings).
  let ci = 0;
  for (const w of workers) {
    const n = Math.min(5, Math.max(3, Math.round(w.reviewCount / 8)));
    for (let i = 0; i < n; i += 1) {
      const customer = customers[(ci += 1) % customers.length];
      const tpl = REVIEW_TEXT[(ci + i) % REVIEW_TEXT.length];
      const when = new Date(Date.now() - (10 + ci * 3) * 24 * 3600000);
      const booking = await makeBooking({
        customer, worker: w, status: 'completed', when, price: w.rate, area: customer.area,
        text: 'Earlier job', title: 'Job', summary: 'Completed', range: [w.rate, w.rate],
      });
      booking.reviewed = true;
      await booking.save();
      await Review.create({ booking: booking._id, customer: customer._id, worker: w._id, rating: tpl.rating, tags: tpl.tags, comment: tpl.comment, createdAt: when });
    }
  }
  // The three reviews shown on Ustad Rafiq's profile in the design
  const rafiq = byPhone('03001000001');
  await Review.deleteMany({ worker: rafiq._id });
  await Booking.deleteMany({ worker: rafiq._id });
  const rafiqReviews = [
    [customers[2], 5, ['punctual', 'clean'], 'Fixed the leak in 30 minutes. Very clean work.'],
    [customers[1], 5, ['fair_price', 'punctual'], 'Fair price, on time and explained the work.'],
    [customers[3], 4, ['late', 'clean'], 'Good work, only 15 minutes late.'],
  ];
  let d = 4;
  for (const [customer, rating, tags, comment] of rafiqReviews) {
    d += 5;
    const when = new Date(Date.now() - d * 24 * 3600000);
    const booking = await makeBooking({ customer, worker: rafiq, status: 'completed', when, price: 900, area: customer.area, text: 'Leakage', title: 'Leakage', summary: 'Completed', range: [800, 1500] });
    booking.reviewed = true;
    await booking.save();
    await Review.create({ booking: booking._id, customer: customer._id, worker: rafiq._id, rating, tags, comment, createdAt: when });
  }

  // Naveed is busy right now: a confirmed booking with a real slot lock.
  const naveed = byPhone('03001000004');
  const busyBooking = await makeBooking({
    customer: customers[4], worker: naveed, status: 'confirmed', when: new Date(), price: 1200, area: 'G-11',
    text: 'Washroom ki naali band hai', title: 'Naali band', summary: 'Washroom ki naali band', range: [800, 1500],
  });
  await acquireSlots(naveed._id, busyBooking._id, busyBooking.scheduledFor);

  // Arif's dashboard: two new requests, one active job, and some finished work this week.
  const arif = byPhone('03001000010');
  const sana = customers[0];
  const req1 = await makeBooking({
    customer: sana, worker: arif, status: 'requested', whenLabel: 'now', when: new Date(), offered: 1200, area: 'G-9',
    text: 'The kitchen socket burnt out. Can you come this evening?', urdu: 'کچن کا ساکٹ جل گیا ہے، آج شام آسکتے ہیں؟',
    title: 'Burnt kitchen socket', summary: 'Burnt kitchen socket, 2 points, this evening at 5', range: [800, 1500],
  });
  await Message.create({ booking: req1._id, sender: sana._id, type: 'voice', transcriptUrdu: req1.problem.transcriptUrdu, transcriptRoman: req1.problem.text, transcriptSource: 'rules', duration: 9 });
  await Message.create({ booking: req1._id, sender: sana._id, type: 'offer', offer: { amount: 1200, whenLabel: 'now', status: 'pending' } });
  const req2 = await makeBooking({
    customer: customers[1], worker: arif, status: 'requested', whenLabel: 'tonight', when: pktToday(18), offered: 700, area: 'F-10',
    text: 'I need a fan fitted', title: 'Fan fitting', summary: 'Fan fitting this evening at 6', range: [500, 900],
  });
  await Message.create({ booking: req2._id, sender: customers[1]._id, type: 'text', text: 'I need a fan fitted' });
  await Message.create({ booking: req2._id, sender: customers[1]._id, type: 'offer', offer: { amount: 700, whenLabel: 'tonight', status: 'pending' } });

  const active = await makeBooking({
    customer: customers[5], worker: arif, status: 'on_the_way', whenLabel: 'tonight', when: pktToday(14), price: 1500, area: 'G-9',
    text: 'UPS wiring', title: 'UPS wiring', summary: 'UPS wiring', range: [1200, 2000],
  });
  await acquireSlots(arif._id, active._id, active.scheduledFor);
  await makeBooking({ customer: customers[3], worker: arif, status: 'completed', when: pktToday(9), price: 1200, area: 'G-9', text: 'Switch board', title: 'Switch board', summary: 'Switch board', range: [800, 1500] });
  await makeBooking({ customer: customers[6], worker: arif, status: 'completed', when: pktToday(11, 30), price: 1500, area: 'I-8', text: 'Wiring', title: 'Wiring', summary: 'Wiring', range: [1200, 2000] });
  await makeBooking({ customer: customers[2], worker: arif, status: 'completed', when: pktToday(10, 0, -3), price: 1500, area: 'F-10', text: 'Fan wiring', title: 'Wiring', summary: 'Wiring', range: [1200, 2000] });

  console.log(`Seeded ${workers.length} workers and ${customers.length} customers.`);
  console.log('Demo logins (OTP in demo mode is always 1234):');
  console.log('  Worker   Muhammad Arif   0300 1000010   (dashboard with requests)');
  console.log('  Worker   Ustad Rafiq     0300 1000001   (plumber, G-11)');
  console.log('  Customer Sana Khan       0300 2000001');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
