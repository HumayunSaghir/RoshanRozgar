// Thin fetch wrapper around the RoshanRozgar API.
const ENV_BASE = process.env.NEXT_PUBLIC_API_BASE;
export const API_BASE = typeof window !== 'undefined' && (!ENV_BASE || /localhost|127.0.0.1/.test(ENV_BASE)) ? `${window.location.protocol}//${window.location.hostname}:5000/api` : ENV_BASE || 'http://localhost:5000/api';
export const FILE_BASE = API_BASE.replace(/\/api\/?$/, '');

export const assetUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${FILE_BASE}${p}`);

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(method, path, body, isForm = false) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body !== undefined && body !== null) {
    if (isForm) opts.body = body;
    else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and that the API is running.', 0, null);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new ApiError(data?.error || 'Something went wrong', res.status, data);
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
  form: (p, fd) => request('POST', p, fd, true),
};

export function qs(params) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) s.set(k, String(v));
  });
  const out = s.toString();
  return out ? `?${out}` : '';
}
