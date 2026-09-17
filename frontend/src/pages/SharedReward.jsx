import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { api } from '../lib/demo';
import { RewardCard } from '../components/RewardCard';

export default function SharedReward() {
  const { publicId } = useParams();
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; setCard(null); setError(''); api.get(`/public/rewards/${publicId}`).then(r => { if (active) setCard(r.data); }).catch(() => { if (active) setError('This reward card could not be found.'); }); return () => { active = false; }; }, [publicId]);
  return <section className="public-reward-page"><div className="eyebrow">INC.HOOD / COMMUNITY ALLOCATION</div><h1 data-testid="public-reward-title">A cycle worth sharing.</h1>{error ? <p className="input-error" data-testid="public-reward-error">{error}</p> : !card ? <Loader2 className="animate-spin" data-testid="public-reward-loading"/> : <RewardCard card={card} prefix="public-card"/>}<Link to="/zone" className="subtle-link" data-testid="shared-reward-zone-link">Explore the incubation Zone<ArrowUpRight size={16}/></Link></section>;
}