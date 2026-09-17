import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { drawRewardCard, cardBlob, downloadBlob, rewardUrl } from '../lib/rewardCard';
import { toast } from 'sonner';

export const RewardCard = ({ card, prefix = 'share-card' }) => {
  const canvas = useRef(null);
  const preparedFile = useRef(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true; setReady(false); setCopied(false); preparedFile.current = null;
    drawRewardCard(canvas.current, card).then(() => cardBlob(canvas.current)).then(blob => {
      if (!alive) return;
      preparedFile.current = new File([blob], `inc-hood-${card.tier}-${card.symbol}-${card.public_id.slice(0, 8)}.png`, { type: 'image/png' });
      setReady(true);
    }).catch(() => { if (alive) toast.error('Reward artwork could not load'); });
    return () => { alive = false; };
  }, [card]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(rewardUrl(card)); setCopied(true); toast.success('Reward link copied'); }
    catch { toast.error('Clipboard unavailable. Copy the reward link below.'); }
  };
  const download = () => {
    if (!preparedFile.current) return;
    downloadBlob(preparedFile.current, preparedFile.current.name); toast.success('Reward card downloaded');
  };
  const share = async () => {
    if (!preparedFile.current) return;
    // Keep the clipboard or native-share call in the click's user activation.
    // No toBlob/file-generation await occurs before this capability decision.
    const files = [preparedFile.current];
    if (typeof navigator.share !== 'function' || !navigator.canShare?.({ files })) { await copy(); return; }
    setBusy(true);
    try { await navigator.share({ files, title: `Inc.hood · ${card.tier} ${card.symbol}`, text: `${card.tier.toUpperCase()} ${card.symbol} · $${card.amount.toFixed(2)} RWA reward\n${rewardUrl(card)}` }); }
    catch (e) { if (e.name !== 'AbortError') toast.error('Sharing unavailable. Download the card or copy the link.'); }
    finally { setBusy(false); }
  };
  return <div className="reward-card-tool" data-testid={prefix}>
    <canvas ref={canvas} className="reward-artwork" data-testid={`${prefix}-canvas`} role="img" aria-label={`${card.tier} ${card.symbol} reward worth $${card.amount.toFixed(2)}, ${card.inc_returned} INC returned and ${card.inc_burned} burned`} data-render-ready={ready}/>
    <div className="reward-card-actions"><Button disabled={!ready || busy} onClick={download} data-testid={`${prefix}-download`}><Download size={14}/>Download PNG</Button><Button variant="outline" disabled={!ready || busy} onClick={share} data-testid={`${prefix}-share`}><Share2 size={14}/>Share</Button><Button variant="outline" disabled={busy} onClick={copy} title="Copy reward link" aria-label="Copy reward link" data-testid={`${prefix}-copy`}>{copied ? <Check size={14}/> : <Copy size={14}/>}</Button></div>
    <input className="share-url" readOnly aria-label="Public reward link" value={rewardUrl(card)} onFocus={e => e.target.select()} data-testid={`${prefix}-url`}/>
  </div>;
};