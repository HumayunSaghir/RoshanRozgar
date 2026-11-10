const { whenLabelText, distanceKm } = require('../services/geo');

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter((p) => !/^(ustad|mr\.?|mrs\.?|haji)$/i.test(p));
  if (!parts.length) return 'RR';
  const first = parts[0][0] || '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || '';
  return `${first}${second}`.toUpperCase();
}

function toPlain(doc) {
  return doc && typeof doc.toObject === 'function' ? doc.toObject({ flattenMaps: true }) : doc;
}

function coords(user) {
  const c = user?.location?.coordinates || [72.9985, 33.6695];
  return { lng: c[0], lat: c[1] };
}

function serializeSelf(user) {
  const u = toPlain(user);
  return {
    id: String(u._id),
    name: u.name,
    initials: initials(u.name),
    avatarUrl: u.avatarUrl || '',
    phone: u.phone,
    role: u.role,
    area: u.area,
    city: u.city,
    trade: u.trade,
    profileComplete: u.profileComplete,
    isAvailable: u.isAvailable,
    rate: u.rate,
    experienceYears: u.experienceYears,
    skills: u.skills,
    workPhotos: u.workPhotos,
    voiceTranscript: u.voiceTranscript,
    voiceIntroUrl: u.voiceIntroUrl,
    rating: u.rating,
    reviewCount: u.reviewCount,
    jobsDone: u.jobsDone,
    badges: u.badges,
    aiReviewSummary: u.aiReviewSummary,
    workingHours: u.workingHours,
    location: coords(u),
    verification: {
      status: u.verification?.status || 'none',
      adminComment: u.verification?.adminComment || '',
      submittedAt: u.verification?.submittedAt || null,
      idUrl: u.verification?.idUrl || '',
      selfieUrl: u.verification?.selfieUrl || '',
    },
  };
}

// Public view of a worker. Phone numbers are never exposed here.
function serializeWorker(worker, extra = {}) {
  const u = toPlain(worker);
  const loc = coords(u);
  return {
    id: String(u._id),
    name: u.name,
    initials: initials(u.name),
    avatarUrl: u.avatarUrl || '',
    trade: u.trade,
    skills: u.skills || [],
    experienceYears: u.experienceYears,
    rate: u.rate,
    rating: u.rating,
    reviewCount: u.reviewCount,
    jobsDone: u.jobsDone,
    badges: u.badges || [],
    area: u.area,
    city: u.city,
    location: loc,
    voiceIntroUrl: u.voiceIntroUrl || '',
    aiReviewSummary: u.aiReviewSummary || '',
    verified: u.verification?.status === 'approved',
    ...extra,
  };
}

function serializeBooking(booking, viewerId) {
  const b = toPlain(booking);
  const worker = b.worker && b.worker.name !== undefined ? b.worker : null;
  const customer = b.customer && b.customer.name !== undefined ? b.customer : null;
  const reveal = ['confirmed', 'on_the_way', 'completed'].includes(b.status);
  const wLoc = worker ? coords(worker) : null;
  const addr = b.address?.location?.coordinates || [72.9985, 33.6695];
  const km = wLoc ? distanceKm(wLoc, { lat: addr[1], lng: addr[0] }) : null;
  return {
    id: String(b._id),
    ref: b.ref,
    status: b.status,
    trade: b.trade,
    whenLabel: b.whenLabel,
    scheduledFor: b.scheduledFor,
    whenText: whenLabelText(b.whenLabel, new Date(b.scheduledFor)),
    price: b.price,
    offeredPrice: b.offeredPrice,
    problem: b.problem,
    aiSummary: b.aiSummary,
    address: { area: b.address?.area, text: b.address?.text, lat: addr[1], lng: addr[0] },
    distanceKm: km === null ? null : Math.round(km * 10) / 10,
    reviewed: b.reviewed,
    createdAt: b.createdAt,
    worker: worker
      ? {
          id: String(worker._id),
          name: worker.name,
          initials: initials(worker.name),
          avatarUrl: worker.avatarUrl || '',
          trade: worker.trade,
          rating: worker.rating,
          reviewCount: worker.reviewCount,
          area: worker.area,
          rate: worker.rate,
          phone: reveal && viewerId && String(viewerId) === String(customer?._id) ? worker.phone : undefined,
        }
      : { id: String(b.worker) },
    customer: customer
      ? {
          id: String(customer._id),
          name: customer.name || 'Customer',
          initials: initials(customer.name || 'Customer'),
          avatarUrl: customer.avatarUrl || '',
          phone: reveal && viewerId && String(viewerId) === String(worker?._id) ? customer.phone : undefined,
        }
      : { id: String(b.customer) },
  };
}

function serializeMessage(m) {
  const x = toPlain(m);
  return {
    id: String(x._id),
    sender: x.sender ? String(x.sender) : null,
    type: x.type,
    text: x.text,
    audioUrl: x.audioUrl,
    duration: x.duration,
    transcriptUrdu: x.transcriptUrdu,
    transcriptRoman: x.transcriptRoman,
    transcriptSource: x.transcriptSource,
    offer: x.offer && x.offer.amount ? x.offer : undefined,
    createdAt: x.createdAt,
  };
}

module.exports = { initials, serializeSelf, serializeWorker, serializeBooking, serializeMessage, coords };
