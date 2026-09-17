import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`, timeout: 15000 });
const DemoContext = createContext(null);
export const number = (value = 0) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
export const money = (value = 0) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function DemoProvider({ children }) {
  const [state, setState] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const alive = useRef(true);
  const accept = useCallback((next) => setState(old => !old || old.id !== next.id || next.version >= old.version ? next : old), []);
  const initialize = useCallback(async () => {
    setError('');
    try {
      const c = await api.get('/catalog');
      let id = localStorage.getItem('inc-hood-demo');
      let data;
      if (id) {
        try { data = (await api.get(`/demo/${id}`)).data; }
        catch (e) { if (e.response?.status !== 404) throw e; }
      }
      if (!data) {
        data = (await api.post('/demo/sessions')).data;
        localStorage.setItem('inc-hood-demo', data.id);
      }
      if (alive.current) { setCatalog(c.data); accept(data); }
    } catch (e) { if (alive.current) setError('Unable to connect. Please try again.'); }
  }, [accept]);
  useEffect(() => { alive.current = true; initialize(); return () => { alive.current = false; }; }, [initialize]);
  useEffect(() => {
    if (!state?.id) return;
    const timer = setInterval(async () => {
      if (pending.current) return;
      try { accept((await api.get(`/demo/${state.id}`)).data); } catch { /* Keep last saved state; actions report errors. */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [state?.id, accept]);
  const action = async (path, data, method = 'post') => {
    if (pending.current) return null;
    pending.current = true; setBusy(true);
    try {
      const result = await api.request({ url: `/demo/${state.id}/${path}`, method, data });
      accept(result.data); return result.data;
    } catch (e) {
      const detail = e.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.');
      return null;
    } finally { pending.current = false; setBusy(false); }
  };
  return <DemoContext.Provider value={{ state, catalog, error, busy, action, retry: initialize }}>{children}</DemoContext.Provider>;
}
export const useDemo = () => useContext(DemoContext);

export function useCountdown(end) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const seconds = Math.max(0, Math.ceil((end || now / 1000) - now / 1000));
  return { seconds, text: [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(x => String(x).padStart(2, '0')).join(':') };
}