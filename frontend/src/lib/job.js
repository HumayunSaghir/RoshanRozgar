// The customer's current request (what is broken, as understood by the AI) is kept in the tab's
// session storage so it can follow them from search -> profile -> booking.
const KEY = 'rr_job';

export function saveJob(job) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(job));
  } catch {
    /* storage may be blocked */
  }
}

export function loadJob() {
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearJob() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
