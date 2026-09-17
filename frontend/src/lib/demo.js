import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useInjectedWallets, walletError } from './wallet';

export const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`, timeout: 15000, withCredentials: true });
let csrfToken = null;
let csrfPending = null;
async function loadCsrf() {
  if (csrfToken) return csrfToken;
  if (!csrfPending) csrfPending = api.get('/auth/csrf').then(r => { csrfToken = r.data.csrfToken; return csrfToken; }).finally(() => { csrfPending = null; });
  return csrfPending;
}
api.interceptors.request.use(async config => {
  if (['post', 'patch', 'put', 'delete'].includes(config.method?.toLowerCase())) config.headers['X-Inc-CSRF'] = await loadCsrf();
  return config;
});
api.interceptors.response.use(response => {
  if (['/auth/verify', '/auth/logout'].includes(response.config.url)) csrfToken = null;
  return response;
}, async error => {
  if (error.response?.status === 403 && error.response?.data?.detail === 'Invalid request token' && !error.config._csrfRetried) {
    error.config._csrfRetried = true; csrfToken = null; await loadCsrf(); return api.request(error.config);
  }
  throw error;
});
const DemoContext = createContext(null);
export const number = (v = 0) => v.toLocaleString('en-US', { maximumFractionDigits: 2 });
export const money = (v = 0) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const EMPTY = { id: null, balance: 0, cost: 100, runs: [], events: [], total_burned: 0, total_returned: 0 };

export function DemoProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [wallet, setWallet] = useState(null);
  const [provider, setProvider] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [protocol, setProtocol] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionStage, setConnectionStage] = useState('');
  const wallets = useInjectedWallets();
  const epoch = useRef(0);
  const pending = useRef(false);
  const connectingRef = useRef(false);
  const disconnectPromise = useRef(null);
  const walletRef = useRef(null);
  const accept = useCallback(next => setState(old => !old.id || old.id !== next.id || next.version >= old.version ? next : old), []);
  const clear = useCallback(() => { epoch.current++; walletRef.current = null; setWallet(null); setState(EMPTY); setProvider(null); }, []);
  const disconnect = useCallback(() => {
    if (disconnectPromise.current) return disconnectPromise.current;
    clear(); setDisconnecting(true);
    disconnectPromise.current = api.post('/auth/logout').then(() => true).catch(() => {
      toast.error('The wallet view was cleared, but session closure failed. Reconnect to refresh access.'); return false;
    }).finally(() => { disconnectPromise.current = null; setDisconnecting(false); });
    return disconnectPromise.current;
  }, [clear]);
  const refreshPublic = useCallback(async () => { setProtocol((await api.get('/public/protocol')).data); }, []);
  const initialize = useCallback(async () => {
    setError(''); const current = epoch.current;
    try {
      const [c, p, auth] = await Promise.all([api.get('/catalog'), api.get('/public/protocol'), api.get('/auth/me').catch(e => { if (e.response?.status === 401) return null; throw e; })]);
      setCatalog(c.data); setProtocol(p.data);
      if (auth && current === epoch.current) { walletRef.current = auth.data; setWallet(auth.data); accept(auth.data.state); }
    } catch { setError('Unable to connect. Please try again.'); }
  }, [accept]);
  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => {
    const timer = setInterval(async () => {
      if (pending.current) return;
      const current = epoch.current;
      try { await refreshPublic(); } catch { /* Retain public snapshot. */ }
      if (walletRef.current) {
        try {
          const r = await api.get('/auth/me');
          if (epoch.current === current) {
            if (r.data.address.toLowerCase() !== walletRef.current?.address?.toLowerCase()) clear();
            else accept(r.data.state);
          }
        }
        catch (e) { if (e.response?.status === 401 && epoch.current === current) clear(); }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshPublic, accept, clear]);
  useEffect(() => {
    if (!wallet || provider || !wallets.length) return;
    let active = true;
    const remembered = localStorage.getItem('inc-hood-provider');
    const candidate = wallets.find(w => w.info.rdns === remembered) || wallets[0];
    candidate.provider.request({ method: 'eth_accounts' }).then(accounts => {
      if (!active) return;
      if (accounts[0]?.toLowerCase() === wallet.address.toLowerCase()) setProvider(candidate.provider);
      else disconnect();
    }).catch(() => { if (active) disconnect(); });
    return () => { active = false; };
  }, [wallet, provider, wallets, disconnect]);
  useEffect(() => {
    if (!provider) return;
    const accountsChanged = accounts => {
      if (!accounts[0] || accounts[0].toLowerCase() !== walletRef.current?.address?.toLowerCase()) { disconnect(); toast.info('Wallet account changed. Reconnect to continue.'); }
    };
    const chainChanged = chain => { const chainId = parseInt(chain, 16); setWallet(old => old ? { ...old, chain_id: chainId } : null); };
    const dropped = () => disconnect();
    provider.on?.('accountsChanged', accountsChanged); provider.on?.('chainChanged', chainChanged); provider.on?.('disconnect', dropped);
    return () => { provider.removeListener?.('accountsChanged', accountsChanged); provider.removeListener?.('chainChanged', chainChanged); provider.removeListener?.('disconnect', dropped); };
  }, [provider, disconnect]);
  const connect = async selected => {
    if (connectingRef.current) return false;
    connectingRef.current = true; setConnecting(true);
    if (disconnectPromise.current) await disconnectPromise.current;
    const current = ++epoch.current;
    try {
      setConnectionStage('Waiting for wallet approval');
      const accounts = await selected.provider.request({ method: 'eth_requestAccounts' });
      if (!accounts?.[0]) throw new Error('No wallet account selected.');
      const chain = await selected.provider.request({ method: 'eth_chainId' });
      const chainId = parseInt(chain, 16);
      const challenge = (await api.post('/auth/challenge', { address: accounts[0], chain_id: chainId })).data;
      setConnectionStage('Confirm the connection signature');
      const hexMessage = '0x' + [...new TextEncoder().encode(challenge.message)].map(b => b.toString(16).padStart(2, '0')).join('');
      const signature = await selected.provider.request({ method: 'personal_sign', params: [hexMessage, accounts[0]] });
      const latest = await selected.provider.request({ method: 'eth_accounts' });
      if (latest[0]?.toLowerCase() !== accounts[0].toLowerCase() || epoch.current !== current) throw new Error('Wallet changed during connection. Try again.');
      setConnectionStage('Verifying wallet ownership');
      const result = (await api.post('/auth/verify', { message: challenge.message, signature })).data;
      if (epoch.current !== current) { await api.post('/auth/logout'); return false; }
      localStorage.setItem('inc-hood-provider', selected.info.rdns || selected.info.uuid);
      walletRef.current = result; setWallet(result); setProvider(selected.provider); accept(result.state);
      refreshPublic().catch(() => {}); toast.success('Wallet connected'); return true;
    } catch (e) { throw new Error(walletError(e)); }
    finally { connectingRef.current = false; setConnecting(false); setConnectionStage(''); }
  };
  const action = async (path, data, method = 'post') => {
    if (!walletRef.current) { toast.error('Connect a wallet to continue'); return null; }
    if (pending.current) return null;
    pending.current = true; setBusy(true); const current = epoch.current;
    try {
      const result = (await api.request({ url: `/demo/${state.id}/${path}`, method, data })).data;
      if (epoch.current !== current) return null;
      if (result.id) accept(result);
      refreshPublic().catch(() => {});
      return result;
    } catch (e) { if (e.response?.status === 401) clear(); toast.error(walletError(e)); return null; }
    finally { pending.current = false; setBusy(false); }
  };
  return <DemoContext.Provider value={{ state, wallet, wallets, catalog, protocol, error, busy, action, retry: initialize, connect, disconnect, connecting, disconnecting, connectionStage }}>{children}</DemoContext.Provider>;
}
export const useDemo = () => useContext(DemoContext);
export function useCountdown(end) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const seconds = Math.max(0, Math.ceil((end || now / 1000) - now / 1000));
  return { seconds, text: [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(x => String(x).padStart(2, '0')).join(':') };
}