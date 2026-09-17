import { NavLink, Link } from 'react-router-dom';
import { Activity, ArrowUpRight, BookOpen, Box, ChevronDown, Layers3, Menu, Settings2, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { Brand, ChainBadge } from './Common';
import { WatchlistTicker } from './WatchlistTicker';
import { number, useDemo } from '../lib/demo';

const nav = [['/zone', 'The Zone', Box], ['/incubations', 'Wallet Holdings', Layers3], ['/assets', 'RWA Pool', Activity]];
export const Layout = ({ children, onSettings, onWallet }) => {
  const { state, wallet, catalog } = useDemo();
  const [menu, setMenu] = useState(false);
  return <div className="app-shell">
    <header className="main-header"><div className="header-inner"><Brand/><nav className={`main-nav ${menu ? 'is-open' : ''}`} aria-label="Main navigation">{nav.map(([path, title, Icon]) => <NavLink key={path} to={path} onClick={() => setMenu(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid={`nav-${path.slice(1)}`}><Icon size={15}/>{title}{path === '/zone' && <span className="nav-counter">06</span>}</NavLink>)}</nav>
      <div className="header-actions"><NavLink className={({ isActive }) => `docs-nav-link ${isActive ? 'active' : ''}`} to="/docs" onClick={() => setMenu(false)} data-testid="nav-docs"><BookOpen size={14}/><span>Docs</span></NavLink><button className={`wallet-button ${wallet ? 'is-connected' : 'connect-button'}`} onClick={onWallet} data-testid="wallet-open-button"><Wallet size={15}/>{wallet ? <><span data-testid="inc-token-balance-display">{number(state.balance)} <b>INC</b></span><ChevronDown size={12}/></> : <span>Connect<span className="connect-label-long"> Wallet</span></span>}</button>{wallet && <button className="icon-button settings-button" onClick={onSettings} title="Incubation settings" aria-label="Incubation settings" data-testid="settings-open-button"><Settings2 size={17}/></button>}<button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} data-testid="mobile-menu-button">{menu ? <X size={20}/> : <Menu size={20}/>}</button></div>
    </div></header>
    <WatchlistTicker assets={catalog.assets}/><main className="main-container">{children}</main>
    <footer className="footer"><div className="footer-inner"><div><span className="footer-brand">inc.hood</span><span className="footer-divider">/</span><span data-testid="footer-tagline">Real-world value. Incubated.</span></div><div><ChainBadge testId="footer-chain-badge"/><span className="version">PROTOCOL V.02</span><Link to="/docs" data-testid="footer-protocol-link" aria-label="Read protocol documentation"><ArrowUpRight size={16}/></Link></div></div></footer>
  </div>;
};