import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { DemoProvider, useDemo } from './lib/demo';
import { Layout } from './components/Layout';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { AppDialogs } from './components/AppDialogs';
import Zone from './pages/Zone';
import Incubations from './pages/Incubations';
import Assets from './pages/Assets';
import Docs from './pages/Docs';
import SharedReward from './pages/SharedReward';
import Activity from './pages/Activity';
import './App.css';
import './watchlist.css';
import './protocol-updates.css';

function Experience() {
  const { catalog, protocol, wallet, error, retry, action } = useDemo();
  const [dialog, setDialog] = useState(null);
  const location = useLocation();
  useEffect(() => {
    if (!wallet) setDialog(current => current && !['connect', 'share'].includes(current.type) ? null : current);
  }, [wallet]);
  useEffect(() => { if (!location.hash) window.scrollTo(0, 0); }, [location.pathname, location.hash]);
  if (error) return <div className="app-loading" data-testid="app-error"><RefreshCw size={30}/><h1>Connection interrupted</h1><p>{error}</p><Button onClick={retry} data-testid="retry-connection">Try again</Button></div>;
  if (!catalog || !protocol) return <div className="app-loading" data-testid="app-loading"><Loader2 className="animate-spin" size={30}/><span>INITIALIZING INC.HOOD</span></div>;
  const open = next => setDialog(wallet ? next : { type: 'connect', next });
  const onStart = pod => open({ type: 'start', pod });
  const onReveal = run => open({ type: 'reveal', run });
  const onShare = async run => { const card = await action(`share/${run.id}`); if (card) setDialog({ type: 'share', card }); };
  return <Layout onSettings={() => open({ type: 'settings' })} onWallet={() => open({ type: 'wallet' })}>
    <Routes><Route path="/zone" element={<Zone onStart={onStart} onReveal={onReveal} onSettings={() => open({ type: 'settings' })}/>}/><Route path="/incubations" element={<Incubations onReveal={onReveal} onShare={onShare} onConnect={() => open({ type: 'wallet' })}/>}/><Route path="/assets" element={<Assets/>}/><Route path="/docs" element={<Docs/>}/><Route path="/protocol" element={<Navigate to="/docs" replace/>}/><Route path="/activity" element={<Activity/>}/><Route path="/rewards/:publicId" element={<SharedReward/>}/><Route path="*" element={<Navigate to="/zone" replace/>}/></Routes>
    <AppDialogs dialog={dialog} onClose={() => setDialog(current => current === dialog ? null : current)} onConnected={() => setDialog(current => current?.type === 'connect' ? (current.next || null) : current)} onShare={onShare}/>
  </Layout>;
}
export default function App() { return <BrowserRouter><DemoProvider><Experience/><Toaster theme="dark" position="bottom-right" offset={16} mobileOffset={16} richColors closeButton/></DemoProvider></BrowserRouter>; }