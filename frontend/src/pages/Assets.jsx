import { ArrowDownLeft, ArrowUpRight, PieChart, Shuffle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AssetIcon, SectionHeading } from '../components/Common';
import { money, useDemo } from '../lib/demo';
import { RarityTiers } from '../components/RarityTiers';

export default function Assets() {
  const { catalog } = useDemo();
  return <div className="secondary-page">
    <SectionHeading eyebrow="THE REWARD UNIVERSE / 05 ASSETS" title={<>Real-world assets.<br/><span className="green">Unexpected possibilities.</span></>} description="Five familiar names. A different outcome with every incubation." action={<span className="outline-badge" data-testid="reward-pool-badge"><span className="tiny-dot"/>RWA REWARD POOL</span>}/>
    <RarityTiers prefix="pool-tier" compact/>
    <div className="asset-cards">{catalog.assets.map(a => <article className="asset-card" key={a.symbol} style={{ '--asset-color': a.color }} data-testid={`asset-card-${a.symbol}`}>
      <div className="asset-card-top"><AssetIcon symbol={a.symbol}/><span>{a.category}</span><ArrowUpRight size={18}/></div>
      <div className="asset-card-title"><h2 data-testid={`asset-symbol-${a.symbol}`}>{a.symbol}</h2><p>{a.name}</p></div>
      <div className="asset-graphic" aria-hidden="true">{Array.from({ length: 27 }, (_, i) => <i key={i} style={{ height: `${20 + ((i * 17 + a.odds) % 65) + i / 2}%`, opacity: .2 + i / 40 }}/>)}</div>
      <div className="asset-card-stats"><div><span>ALL TIERS RANGE</span><strong data-testid={`asset-range-${a.symbol}`}>{money(a.min_reward)} — {money(a.max_reward)}</strong></div><div><span>ASSET CHANCE</span><strong className="asset-color" data-testid={`asset-odds-${a.symbol}`}>{a.odds}%</strong></div></div>
      <div className="odds-track"><i style={{ width: `${a.odds}%`, background: a.color }}/></div>
      <div className="asset-card-foot"><span>Reference price</span><b data-testid={`reference-price-${a.symbol}`}>{money(a.price)}</b></div>
    </article>)}</div>
    <section className="pool-method">
      <div><div className="eyebrow">THE NUMBERS, WITHOUT THE MYSTERY</div><h2>One pool. Equal access.</h2><p data-testid="reward-pool-description">Every pod series uses the same reward pool. INC amounts and pod appearances do not change the probabilities. The selected rarity tier determines the reward range.</p><Link to="/zone" className="primary-link" data-testid="assets-to-zone">Explore incubation pods <ArrowUpRight size={16}/></Link></div>
      <div className="method-items">
        <div><PieChart size={20}/><span><b>100% combined probability</b><p>Exactly one of the five assets per completed cycle.</p></span></div>
        <div><ArrowDownLeft size={20}/><span><b>A random value within the range</b><p>Each cent value in an asset's range is equally likely.</p></span></div>
        <div><Shuffle size={20}/><span><b>Every cycle is independent</b><p>Previous allocations do not change the next result.</p></span></div>
      </div>
    </section>
  </div>;
}