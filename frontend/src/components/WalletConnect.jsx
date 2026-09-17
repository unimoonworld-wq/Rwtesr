import { useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, Fingerprint, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useDemo } from '../lib/demo';

export const WalletConnect = ({ onConnected }) => {
  const { wallets, connect, connecting, disconnecting, connectionStage } = useDemo();
  const [error, setError] = useState('');
  const choose = async item => {
    setError('');
    try { if (await connect(item)) onConnected(); } catch (e) { setError(e.message); }
  };
  return <>
    <div className="dialog-eyebrow" data-testid="connect-eyebrow"><span className="tiny-dot"/>INC.HOOD / WALLET ACCESS</div>
    <DialogTitle data-testid="connect-title">Connection before allocation.</DialogTitle>
    <DialogDescription data-testid="connect-description">An EVM wallet connects to the protocol. A signature verifies wallet ownership.</DialogDescription>
    <div className="connect-emblem"><Wallet size={34}/><span className="connect-emblem-line"/><Fingerprint size={34}/><span className="connect-emblem-line"/><Check size={34}/></div>
    <div className="wallet-provider-list">{wallets.map((item, i) => <button className="provider-option" key={item.info.uuid} disabled={connecting || disconnecting} onClick={() => choose(item)} data-testid={`connect-provider-${i}`}><span className="provider-symbol"><Wallet size={20}/></span><span><b>{item.info.name}</b><small>Browser wallet</small></span>{connecting || disconnecting ? <Loader2 className="animate-spin" size={17}/> : <ChevronRight size={17}/>}</button>)}</div>
    {!wallets.length && <div className="wallet-unavailable" data-testid="wallet-providerless"><Wallet size={23}/><b>No browser wallet detected</b><p>Open Inc.hood in a wallet browser, or enable a MetaMask-compatible browser extension.</p><Button variant="outline" onClick={() => { window.dispatchEvent(new Event('eip6963:requestProvider')); window.dispatchEvent(new Event('ethereum#initialized')); }} data-testid="rescan-wallet-button"><RefreshCw size={14}/>Check again</Button></div>}
    {(connecting || disconnecting) && <div className="connection-status" role="status" data-testid="connection-status"><Loader2 size={14} className="animate-spin"/>{disconnecting ? 'Closing the previous wallet session' : connectionStage}</div>}
    {error && <p className="input-error" role="alert" data-testid="wallet-connect-error">{error}</p>}
    <div className="connection-foot" data-testid="connection-foot"><Fingerprint size={14}/>Wallet signature only. Private keys never leave the wallet.</div>
  </>;
};