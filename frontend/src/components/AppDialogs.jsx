import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { useDemo } from '../lib/demo';
import { WalletConnect } from './WalletConnect';
import { RewardCard } from './RewardCard';
import { RewardReveal } from './RewardReveal';
import { AllocationPanel, SettingsPanel, WalletPanel } from './WalletPanels';

export const AppDialogs = ({ dialog, onClose, onConnected, onShare }) => {
  const { wallet } = useDemo();
  if (!dialog) return null;
  const type = dialog.type;
  if (!wallet && !['connect', 'share'].includes(type)) return null;
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className={`inc-dialog ${type === 'share' ? 'share-dialog' : ''}`} data-testid={`${type}-dialog`}>
    {type === 'connect' && <WalletConnect onConnected={onConnected}/>}
    {type === 'start' && <AllocationPanel pod={dialog.pod} onClose={onClose}/>}
    {type === 'reveal' && <RewardReveal run={dialog.run} onClose={onClose} onShare={onShare}/>}
    {type === 'settings' && <SettingsPanel onClose={onClose}/>}
    {type === 'wallet' && <WalletPanel onClose={onClose}/>}
    {type === 'share' && <><div className="dialog-eyebrow">INC.HOOD / COMMUNITY COLLECTIBLE</div><DialogTitle data-testid="share-title">A cycle worth sharing.</DialogTitle><DialogDescription>Published allocation card. Ready to download and share.</DialogDescription><RewardCard card={dialog.card}/></>}
  </DialogContent></Dialog>;
};