import { ArrowDownLeft, ArrowRight, Clock3, Flame, Hexagon, Leaf, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { SectionHeading } from '../components/Common';
import { number, useDemo } from '../lib/demo';

const faqs = [
  ['What happens to my INC?', 'At the start, the full INC amount is removed from your available balance. When the two-hour cycle completes, 75% returns automatically and 25% is permanently removed from supply. Claiming your RWA does not return INC a second time.'],
  ['How is my RWA reward selected?', 'The reward engine randomly selects NVDA (25%), GME (20%), GLD (20%), TSLA (20%), or AAPL (15%). It then chooses a random USD amount, in cents, within that asset’s reward range.'],
  ['Does a different pod or a larger INC amount improve my odds?', 'No. Core, Prism, and Onyx are visual series with identical asset probabilities and reward ranges. Your chosen INC amount determines the amount returned and burned, not the odds.'],
  ['What makes up an incubation cycle?', 'One INC commitment, one two-hour cycle, and one random RWA reward. At completion, 75% of the committed INC returns to your balance while the remaining 25% is burned.'],
  ['Do I need to keep this tab open for two hours?', 'No. Your incubation start and completion times are saved. When you return, completed cycles settle automatically.'],
  ['How does the burn affect the INC supply?', 'Every completed cycle removes 25% of its committed INC from circulation. The burn reduces supply; it does not determine asset prices or guarantee ecosystem growth.'],
];
export default function Protocol() {
  const { state } = useDemo();
  return <div className="secondary-page">
    <SectionHeading eyebrow="INC.HOOD / PROTOCOL V.01" title={<>A cycle with<br/><span className="green">a purpose.</span></>} description="Two hours. One RWA reward. A smaller INC supply." action={<Link to="/zone" className="primary-link" data-testid="protocol-start-link">Enter the Zone <ArrowUpRightIcon/></Link>}/>
    <section className="protocol-flow">
      <div><span className="flow-number">01 / COMMIT</span><Hexagon/><h2>Fuel the pod.</h2><p>Choose a pod and commit your INC. The full amount is locked for one incubation cycle.</p><span className="flow-detail" data-testid="protocol-cost">{number(state.cost)} INC · Current incubation amount</span></div><ArrowRight className="flow-arrow"/>
      <div><span className="flow-number">02 / INCUBATE</span><Clock3/><h2>Give it time.</h2><p>A two-hour cycle begins. Your random asset and reward value are generated at completion.</p><span className="flow-detail">02:00:00 · One full cycle</span></div><ArrowRight className="flow-arrow"/>
      <div><span className="flow-number">03 / REVEAL</span><Sparkles/><h2>Unlock what’s next.</h2><p>Claim your RWA reward. 75% of your INC is already returned. The remaining 25% is burned.</p><span className="flow-detail green">5 assets · One random reward</span></div>
    </section>
    <section className="economy-section"><div><div className="eyebrow">BUILT INTO EVERY CYCLE</div><h2>The 75 / 25 principle.</h2><p>Most of your INC comes back. The rest leaves circulation.<br/>A deflationary mechanism, without a growth guarantee.</p><div className="economy-calculation" data-testid="protocol-example">{number(state.cost)} INC <ArrowRight size={18}/> <span className="green">{number(state.cost * .75)} returned</span><span>+</span><span className="orange">{number(state.cost * .25)} burned</span></div></div><div className="economy-visual"><div className="economy-numbers"><div><ArrowDownLeft size={19}/><strong>75<span>%</span></strong><span>RETURN TO YOU</span></div><div><Flame size={19}/><strong>25<span>%</span></strong><span>PERMANENT BURN</span></div></div><div className="economy-bar"><div/><span/></div><small>Applied automatically at cycle completion</small></div></section>
    <div className="chain-info"><Leaf size={23}/><div><h2>Designed for Robinhood Chain.</h2><p data-testid="chain-description">An incubation experience centered on INC, tokenized assets, and a two-hour reward cycle.</p></div><span className="outline-badge" data-testid="protocol-rwa-badge">RWA INCUBATION</span></div>
    <section className="faq-section"><div><div className="eyebrow">THE FINE PRINT</div><h2>Know the protocol.</h2><p>Every cycle, every return, every burn.</p></div><Accordion type="single" collapsible className="faq-list">{faqs.map(([q, a], i) => <AccordionItem value={String(i)} key={q}><AccordionTrigger data-testid={`faq-${i}`}>{q}</AccordionTrigger><AccordionContent data-testid={`faq-answer-${i}`}>{a}</AccordionContent></AccordionItem>)}</Accordion></section>
  </div>;
}
const ArrowUpRightIcon = () => <ArrowRight size={16} style={{ transform: 'rotate(-45deg)' }}/>;