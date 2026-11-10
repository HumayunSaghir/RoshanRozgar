'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { LANGS, translate, tr } from '@/lib/i18n';

const LangCtx = createContext(null);
const AuthCtx = createContext(null);
const LocCtx = createContext(null);

export const DEFAULT_LOC = { label: 'G-11/3, Islamabad', area: 'G-11', lat: 33.6695, lng: 72.9985 };

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage may be blocked */
  }
}

function setSessionCookie(user) {
  if (typeof document === 'undefined') return;
  if (user) document.cookie = `rr_session=${user.role}:${user.id}; path=/; max-age=${7 * 24 * 3600}; samesite=lax`;
  else document.cookie = 'rr_session=; path=/; max-age=0; samesite=lax';
}

export default function Providers({ children }) {
  const [lang, setLangState] = useState('en');
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [attention, setAttention] = useState(0);
  const [loc, setLocState] = useState(DEFAULT_LOC);

  useEffect(() => {
    const saved = safeGet('rr_lang');
    if (saved && LANGS.includes(saved)) setLangState(saved);
    try {
      const l = JSON.parse(safeGet('rr_loc') || 'null');
      if (l && l.area) setLocState(l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }, [lang]);

  const refresh = useCallback(async () => {
    try {
      const { user: u } = await api.get('/auth/me');
      setUser(u);
      setSessionCookie(u);
      try {
        const { bookings } = await api.get('/bookings/mine');
        setAttention(
          bookings.filter((b) => (u.role === 'worker' ? b.status === 'requested' : b.status === 'agreed')).length
        );
      } catch {
        setAttention(0);
      }
      return u;
    } catch (e) {
      // Only a real "not logged in" answer ends the session. A network error or a restarting server
      // must not wipe the session cookie, otherwise the next click bounces to the login page.
      if (e?.status === 401) {
        setUser(null);
        setSessionCookie(null);
        setAttention(0);
        return null;
      }
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      /* ignore */
    }
    setUser(null);
    setSessionCookie(null);
    window.location.href = '/';
  }, []);

  const loginDone = useCallback((u) => {
    setUser(u);
    setSessionCookie(u);
  }, []);

  const langValue = useMemo(
    () => ({
      lang,
      setLang: (l) => {
        setLangState(l);
        safeSet('rr_lang', l);
      },
      cycle: () => {
        const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
        setLangState(next);
        safeSet('rr_lang', next);
      },
      t: (key, fallback) => translate(lang, key, fallback),
      tr: (text, vars) => tr(lang, text, vars),
      isUr: lang === 'ur',
      trLoc: (label) => String(label || '').split(', ').map((p) => tr(lang, p)).join(lang === 'ur' ? '، ' : ', '),
    }),
    [lang]
  );

  const locValue = useMemo(
    () => ({
      loc,
      setLoc: (l) => {
        setLocState(l);
        safeSet('rr_loc', JSON.stringify(l));
      },
    }),
    [loc]
  );

  const authValue = useMemo(() => ({ user, ready, refresh, logout, loginDone, attention }), [user, ready, refresh, logout, loginDone, attention]);

  return (
    <LangCtx.Provider value={langValue}>
      <AuthCtx.Provider value={authValue}>
        <LocCtx.Provider value={locValue}>{children}</LocCtx.Provider>
      </AuthCtx.Provider>
    </LangCtx.Provider>
  );
}

export const useLang = () => useContext(LangCtx);
export const useAuth = () => useContext(AuthCtx);
export const useLoc = () => useContext(LocCtx);
