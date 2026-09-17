import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Box, ChevronDown, Clock3, FastForward, Flame, Grid2X2, List, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ChainBadge, MetricStrip } from '../components/Common';
import { PodScene } from '../components/PodScene';
import { PodCard } from '../components/PodCard';
import { ProtocolRail } from '../components/ProtocolRail';
import { useDemo } from '../lib/demo';
import { toast } from 'sonner';

export default function Zone({ onStart, onReveal, onSettings }) {
  const { state, catalog, busy, action } = useDemo();
  const [status, setStatus] = useState('all');
  const [family, setFamily] = useState('all');
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState('serial');
  const latest = useMemo(() => Object.fromEntries(catalog.pods.map(p => [p.id, state.runs.find(r => r.pod_id === p.id)])), [state.runs, catalog.pods]);
  const filtered = catalog.pods.filter(p => (family === 'all' || p.family === family) && (status === 'all' || (latest[p.id]?.status || 'available') === status)).sort((a, b) => sort === 'series' ? a.family.localeCompare(b.family) : a.serial.localeCompare(b.serial));
  const active = state.runs.filter(r => r.status === 'incubating').length;
  const skip = async () => { if (await action('fast-forward')) toast.success('Cycle complete. Your RWA rewards are ready to reveal.'); };
  return <>
    <section className="zone-hero"><div className="hero-grid"/><div className="hero-copy"><div className="hero-eyebrow" data-testid="zone-eyebrow"><span className="eyebrow-line"/>REAL-WORLD VALUE. INCUBATED.</div><h1 data-testid="zone-hero-title">THE INCUBATION<br/><span>ZONE.</span><span className="heading-period">↗</span></h1><p data-testid="zone-description">Put your INC to work. Incubate for 2 hours. Unlock a random<br className="desktop-break"/> real-world asset reward. Get 75% back. Burn the rest.</p><div className="hero-bottom"><ChainBadge/><span className="hero-separator"/><span className="hero-version">A NEW CYCLE OF OWNERSHIP</span></div></div><div className="hero-object"><PodScene hero testId="hero-pod-canvas"/><div className="object-label label-top"><span className="tiny-dot"/>QUANTUM INCUBATOR <span>GEN. 01</span></div><div className="object-label label-right"><span>RWA CORE</span><b data-testid="hero-asset-count">5 RWA ASSETS</b><i/></div><div className="object-label label-bottom"><span>INC.HOOD / SYSTEM ONLINE</span><span>↗</span></div></div><div className="hero-corner">INCUBATION PROTOCOL <span>001 — 006</span></div></section>
    <MetricStrip/>
    <section className="zone-workspace"><div className="workspace-main"><div className="section-toolbar"><div className="section-title"><span className="section-square"/><h2>Incubation pods</h2><span className="count">06</span></div><div className="toolbar-actions"><button className="text-button skip-button" disabled={!active || busy} onClick={skip} data-testid="demo-fast-forward-button" title="Demo only: complete all active 2-hour cycles"><FastForward size={13}/>Skip 2h <span>DEMO</span></button><button className="icon-button" onClick={onSettings} title="Configure demo cost" aria-label="Configure demo cost" data-testid="zone-settings-button"><SlidersHorizontal size={16}/></button></div></div>
      <div className="status-tabs" role="tablist" aria-label="Incubation status">{[['all', 'All pods'], ['incubating', 'Incubating'], ['ready', 'Ready to reveal'], ['claimed', 'Claimed']].map(([key, label]) => <button role="tab" aria-selected={status === key} className={status === key ? 'active' : ''} key={key} onClick={() => setStatus(key)} data-testid={`status-filter-${key}`}>{key === 'incubating' && <Clock3 size={12}/>} {key === 'ready' && <Sparkles size={12}/>} {label}<span>{key === 'all' ? catalog.pods.length : Object.values(latest).filter(r => r?.status === key).length}</span></button>)}</div>
      <div className="filter-row"><div className="series-filter"><Box size={13}/><select value={family} onChange={e => setFamily(e.target.value)} aria-label="Filter by pod series" data-testid="series-filter"><option value="all">All series</option><option>Core</option><option>Prism</option><option>Onyx</option></select><ChevronDown size={12}/></div><span className="results-count" data-testid="pods-result-count">{filtered.length} pods</span><div className="sort-filter"><ArrowDown size={12}/><select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort pods" data-testid="sort-pods"><option value="serial">Pod number</option><option value="series">Series name</option></select></div><div className="view-toggle"><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Grid view" aria-label="Grid view" aria-pressed={view === 'grid'} data-testid="view-grid"><Grid2X2 size={14}/></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List view" aria-label="List view" aria-pressed={view === 'list'} data-testid="view-list"><List size={15}/></button></div></div>
      {filtered.length ? <div className={`pod-grid ${view === 'list' ? 'list-view' : ''}`}>{filtered.map(pod => <PodCard key={pod.id} pod={pod} run={latest[pod.id]} cost={state.cost} onStart={onStart} onReveal={onReveal} busy={busy}/>)}</div> : <div className="empty-state" data-testid="pods-empty"><Box size={32}/><h3>No pods in this view</h3><p>Your next cycle is waiting in the Zone.</p><Button variant="outline" onClick={() => { setStatus('all'); setFamily('all'); }} data-testid="reset-filters-button">Show all pods</Button></div>}
      <div className="zone-bottom-note"><span><Flame size={13}/>Less supply. More possibility.</span><Link to="/protocol" data-testid="zone-tokenomics-link">The INC economy<ArrowUpRight size={14}/></Link></div>
    </div><ProtocolRail/></section>
  </>;
}