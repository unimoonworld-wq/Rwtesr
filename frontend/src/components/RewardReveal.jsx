import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Hexagon, Loader2, Share2, Sparkles } from 'lucide-react';
import { DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useDemo, money } from '../lib/demo';
import { AssetIcon } from './Common';
import { TierBadge } from './RarityTiers';
import { Breakdown } from './WalletPanels';
import { toast } from 'sonner';

export const RewardReveal = ({ run: original, onClose, onShare }) => {
  const { state, catalog, busy, action } = useDemo();
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  useEffect(() => { if (!revealing) return; const timer = setTimeout(() => { setRevealing(false); setRevealed(true); }, 1000); return () => clearTimeout(timer); }, [revealing]);
  const run = state.runs.find(r => r.id === original.id) || original;
  const asset = catalog.assets.find(a => a.symbol === run.reward?.symbol);
  return <><div className="dialog-eyebrow"><Sparkles size={13}/>CYCLE COMPLETE / REWARD READY</div><DialogTitle data-testid="reveal-dialog-title">{revealed ? 'An asset, unlocked.' : 'Potential, unlocked.'}</DialogTitle><DialogDescription>Incubation complete. The allocation is ready to reveal.</DialogDescription>
    <div className={`reward-reveal ${revealing ? 'is-revealing' : ''}`} data-testid="reward-reveal-stage">{revealed ? <><TierBadge tier={run.reward.tier} large/><AssetIcon symbol={asset.symbol}/><span className="reward-symbol" data-testid="reward-symbol">{asset.symbol}</span><span className="reward-name">{asset.name} · RWA</span><strong data-testid="reward-amount">{money(run.reward.amount)}</strong><span className="reward-quantity" data-testid="reward-quantity">{run.reward.quantity.toFixed(6)} units · {run.reward.tier_odds}% tier drop rate</span></> : <><div className="mystery-mark"><Hexagon size={92} strokeWidth={.8}/><span>{revealing ? <Loader2 className="animate-spin" size={25}/> : '?'}</span></div><span className="reward-prompt">{revealing ? 'DECODING THE ALLOCATION...' : 'ONE POD. FOUR POSSIBILITIES.'}</span></>}</div>
    <Breakdown amount={run.amount} settled/>
    {!revealed ? <Button className="dialog-primary" disabled={revealing} onClick={() => setRevealing(true)} data-testid="reveal-reward-button"><Sparkles size={17}/>{revealing ? 'Revealing...' : 'Reveal RWA reward'}<ArrowRight size={17}/></Button> : run.status === 'claimed' ? <><div className="claim-success" data-testid="claim-success"><Check size={17}/>Reward added to wallet holdings</div><Button className="dialog-primary" disabled={busy} onClick={() => onShare(run)} data-testid="create-reward-card-button"><Share2 size={16}/>Create reward card</Button><button className="subtle-link" onClick={() => { onClose(); navigate('/incubations'); }} data-testid="view-portfolio-button">View wallet holdings<ArrowRight size={14}/></button></> : <Button className="dialog-primary" disabled={busy} onClick={async () => { if (await action(`claim/${run.id}`)) toast.success(`${asset.symbol} added to wallet holdings`); }} data-testid="claim-rwa-reward-button">{busy ? <Loader2 className="animate-spin"/> : <Sparkles size={16}/>}Claim {asset.symbol} reward<ArrowRight size={16}/></Button>}
  </>;
};