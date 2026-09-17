import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { DemoProvider, useDemo } from './lib/demo';
import { Layout } from './components/Layout';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { AppDialogs } from './components/AppDialogs';
import Zone from './pages/Zone';
import Incubations from './pages/Incubations';
import Assets from './pages/Assets';
import Protocol from './pages/Protocol';
import './App.css';

function Experience() {
  const { state, catalog, error, retry } = useDemo();
  const [dialog, setDialog] = useState(null);
  if (error) return <div className="app-loading" data-testid="app-error"><RefreshCw size={30}/><h1>Connection interrupted</h1><p>{error}</p><Button onClick={retry} data-testid="retry-connection">Try again</Button></div>;
  if (!state || !catalog) return <div className="app-loading" data-testid="app-loading"><Loader2 className="animate-spin" size={30}/><span>INITIALIZING INC.HOOD</span></div>;
  const onStart = pod => setDialog({ type: 'start', pod });
  const onReveal = run => setDialog({ type: 'reveal', run });
  return <Layout onSettings={() => setDialog({ type: 'settings' })} onWallet={() => setDialog({ type: 'wallet' })}><Routes><Route path="/zone" element={<Zone onStart={onStart} onReveal={onReveal} onSettings={() => setDialog({ type: 'settings' })}/>}/><Route path="/incubations" element={<Incubations onReveal={onReveal}/>}/><Route path="/assets" element={<Assets/>}/><Route path="/protocol" element={<Protocol/>}/><Route path="*" element={<Navigate to="/zone" replace/>}/></Routes><AppDialogs dialog={dialog} onClose={() => setDialog(null)}/></Layout>;
}

export default function App() {
  return <BrowserRouter><DemoProvider><Experience/><Toaster theme="dark" position="bottom-right" offset={16} mobileOffset={16} richColors closeButton/></DemoProvider></BrowserRouter>;
}