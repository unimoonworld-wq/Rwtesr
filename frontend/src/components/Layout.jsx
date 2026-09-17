import { NavLink, Link } from 'react-router-dom';
import { Activity, ArrowUpRight, Box, ChevronDown, FlaskConical, Layers3, Menu, Settings2, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { Brand, ChainBadge, AssetIcon } from './Common';
import { number, useDemo } from '../lib/demo';

const nav = [['/zone', 'The Zone', Box], ['/incubations', 'My Incubations', Layers3], ['/assets', 'RWA Pool', Activity], ['/protocol', 'Protocol', FlaskConical]];
export const Layout = ({ children, onSettings, onWallet }) => {
  const { state, catalog } = useDemo();
  const [menu, setMenu] = useState(false);
  return <div className="app-shell">
    <header className="main-header"><div className="header-inner"><Brand/><nav className={`main-nav ${menu ? 'is-open' : ''}`} aria-label="Main navigation">{nav.map(([path, title, Icon]) => <NavLink key={path} to={path} onClick={() => setMenu(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid={`nav-${path.slice(1)}`}><Icon size={15}/>{title}{path === '/zone' && <span className="nav-counter">06</span>}</NavLink>)}</nav><div className="header-actions"><span className="demo-badge" data-testid="demo-mode-badge"><span/>DEMO</span><button className="wallet-button" onClick={onWallet} data-testid="wallet-open-button"><Wallet size={15}/><span data-testid="inc-token-balance-display">{number(state.balance)} <b>INC</b></span><ChevronDown size={12}/></button><button className="icon-button settings-button" onClick={onSettings} title="Demo settings" aria-label="Demo settings" data-testid="settings-open-button"><Settings2 size={17}/></button><button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} data-testid="mobile-menu-button">{menu ? <X size={20}/> : <Menu size={20}/>}</button></div></div></header>
    <div className="ticker-band"><div className="ticker-inner"><span className="ticker-label" data-testid="ticker-label"><span className="tiny-dot"/>RWA WATCHLIST <span className="sample-label">SAMPLE</span></span><div className="ticker-assets">{catalog.assets.map(a => <Link to="/assets" className="ticker-item" key={a.symbol} data-testid={`ticker-${a.symbol}`}><AssetIcon symbol={a.symbol} small/><b>{a.symbol}</b><span>${number(a.price)}</span><span className={a.change < 0 ? 'red' : 'green'}>{a.change > 0 ? '+' : ''}{a.change}%</span></Link>)}</div><span className="ticker-network"><span className="signal-bars">▂▄▆</span> SANDBOX</span></div></div>
    <main className="main-container">{children}</main>
    <footer className="footer"><div className="footer-inner"><div><span className="footer-brand">inc.hood</span><span className="footer-divider">/</span><span data-testid="footer-disclaimer">Independent prototype. No real funds or securities.</span></div><div><ChainBadge/><span className="version">PROTOCOL V.01</span><Link to="/protocol" data-testid="footer-protocol-link" aria-label="Read protocol details"><ArrowUpRight size={16}/></Link></div></div></footer>
  </div>;
};