import { Diamond, Gem, Hexagon, Sparkles } from 'lucide-react';
import { useDemo, money } from '../lib/demo';

export const TIER_COLORS = { common: '#a0b090', rare: '#70dce4', epic: '#ba95e1', legendary: '#e9c567', legacy: '#a0b090' };
const ICONS = { common: Hexagon, rare: Gem, epic: Diamond, legendary: Sparkles };
export const TierBadge = ({ tier, testId = 'reward-tier', large = false }) => {
  const Icon = ICONS[tier] || Hexagon;
  return <span className={`tier-badge ${large ? 'tier-large' : ''}`} style={{ '--tier-color': TIER_COLORS[tier] }} data-testid={testId}><Icon size={large ? 16 : 12}/>{tier || 'Common'}</span>;
};
export const RarityTiers = ({ prefix = 'tiers', compact = false }) => {
  const { catalog } = useDemo();
  return <div className={`rarity-grid ${compact ? 'rarity-compact' : ''}`}>{catalog.tiers.map((tier, i) => {
    const Icon = ICONS[tier.id];
    return <article className="rarity-item" key={tier.id} style={{ '--tier-color': tier.color }} data-testid={`${prefix}-${tier.id}`}><div className="rarity-item-top"><span className="rarity-number">0{i + 1}</span><Icon size={22}/></div><h3>{tier.name}</h3><strong data-testid={`${prefix}-range-${tier.id}`}>{money(tier.min_reward)}<span> — </span>{money(tier.max_reward)}</strong><span className="rarity-caption">ESTIMATED REWARD VALUE</span><div className="rarity-odds"><span>Drop rate</span><b data-testid={`${prefix}-odds-${tier.id}`}>{tier.odds}%</b></div><div className="rarity-bar"><i style={{ width: `${tier.odds}%` }}/></div></article>;
  })}</div>;
};