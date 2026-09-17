import { ArrowRight, Check, Clock3, Hexagon, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { PodScene } from './PodScene';
import { number, useCountdown } from '../lib/demo';

export const PodCard = ({ pod, run, cost, onStart, onReveal, busy }) => {
  const { text, seconds } = useCountdown(run?.completes_at);
  const status = run?.status || 'available';
  const progress = status === 'incubating' ? Math.min(100, Math.max(0, (7200 - seconds) / 72)) : 100;
  return <article className={`pod-card status-${status}`} style={{ '--pod-color': pod.color }} data-testid={`pod-card-${pod.id}`}>
    <div className="pod-topline"><span className="pod-serial" data-testid={`pod-serial-${pod.id}`}>INC / {pod.serial}</span><span className={`status-badge ${status}`} data-testid={`pod-status-${pod.id}`}><span/>{status === 'available' ? 'Available' : status === 'incubating' ? 'Incubating' : status === 'ready' ? 'Ready to reveal' : 'Claimed'}</span></div>
    <div className="pod-visual"><div className="pod-grid-floor"/><PodScene color={pod.color} active={status === 'incubating'} testId={`pod-canvas-${pod.id}`}/><span className="pod-visual-mark">+</span><span className="pod-visual-mark right">+</span><span className="pod-series" data-testid={`pod-series-${pod.id}`}>{pod.family.toUpperCase()} SERIES</span></div>
    <div className="pod-card-body"><div className="pod-title-row"><h3 data-testid={`pod-name-${pod.id}`}>{pod.name} <span>#{pod.serial}</span></h3><Hexagon size={17} strokeWidth={1.3}/></div><div className="pod-detail-row"><span data-testid={`pod-cost-${pod.id}`}><span className="inc-mini">i</span>{number(status === 'available' || status === 'claimed' ? cost : run.amount)} <small>INC</small></span><span data-testid={`pod-time-${pod.id}`}><Clock3 size={12}/>{status === 'incubating' ? text : '2h cycle'}</span></div>
      {status === 'incubating' ? <div className="incubating-control" data-testid={`pod-progress-${pod.id}`}><div className="progress-track"><i style={{ width: `${progress}%` }}/></div><span><span className="pulse-dot"/>Incubation in progress <b>{Math.floor(progress)}%</b></span></div> : status === 'ready' ? <Button className="pod-action ready-action" disabled={busy} onClick={() => onReveal(run)} data-testid={`reveal-${pod.id}`}><Sparkles size={14}/>Reveal RWA reward<ArrowRight size={14}/></Button> : <Button variant="outline" className="pod-action" onClick={() => onStart(pod)} disabled={busy} data-testid={`start-${pod.id}`}>{status === 'claimed' ? <><Check size={14}/>Incubate again</> : 'Start incubation'}<ArrowRight size={14}/></Button>}
    </div>
  </article>;
};