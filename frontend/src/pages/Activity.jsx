import { ArrowDownLeft, Flame, Hexagon, Sparkles } from 'lucide-react';
import { MetricStrip, SectionHeading } from '../components/Common';
import { useDemo, money, number } from '../lib/demo';
import { activityMessage } from '../lib/activity';

export default function Activity() {
  const { protocol } = useDemo();
  return <div className="secondary-page"><SectionHeading eyebrow="INC.HOOD / SHARED ACTIVITY" title={<>A public pulse.<br/><span className="green">Every cycle counts.</span></>} description="Protocol-wide allocations, returns, burns, and reward claims."/><MetricStrip/><div className="activity-table public-activity-table" data-testid="public-activity-feed">{protocol.events.length ? protocol.events.map(e => <div className="activity-row" key={e.id} data-testid={`public-event-${e.id}`}><span className={`activity-icon ${e.kind}`}>{e.kind === 'burn' ? <Flame size={17}/> : e.kind === 'return' ? <ArrowDownLeft size={17}/> : e.kind === 'claim' ? <Sparkles size={17}/> : <Hexagon size={17}/>}</span><div><b>{activityMessage(e)}</b><small>{new Date(e.timestamp * 1000).toLocaleString()}</small></div><span className={e.kind === 'burn' ? 'orange' : ''}>{e.kind === 'claim' ? money(e.amount) : `${number(e.amount)} INC`}</span></div>) : <div className="empty-state"><Hexagon size={30}/><h2>Activity starts with a cycle.</h2><p>Shared protocol records appear as allocations begin.</p></div>}</div></div>;
}