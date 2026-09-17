import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowRight, Check, Clock3, Flame, Hexagon, Info, Loader2, LogOut, Plus, Settings2, Wallet } from 'lucide-react';
import { DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PodScene } from './PodScene';
import { number, useDemo } from '../lib/demo';
import { shortAddress } from '../lib/wallet';
import { toast } from 'sonner';

const AmountField = ({ amount, setAmount, valid }) => <div className="amount-field"><label htmlFor="inc-amount" data-testid="inc-amount-label">Incubation amount</label><div className="amount-input-wrap"><Hexagon size={19}/><Input type="number" id="inc-amount" min="1" max="100000" step="1" value={amount} onChange={e => setAmount(e.target.value)} data-testid="inc-amount-input"/><span>INC</span></div>{!valid && <p className="input-error" data-testid="inc-amount-error">Enter a whole number from 1 to 100,000.</p>}</div>;
const validAmount = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 100000;
export const Breakdown = ({ amount, settled = false }) => <div className="breakdown"><div><span><ArrowDownLeft size={14}/>{settled ? 'INC returned' : 'INC returned after 2h'}</span><strong data-testid="breakdown-return">{number(amount * .75)} INC <small>75%</small></strong></div><div><span><Flame size={14}/>{settled ? 'INC burned' : 'Permanent INC burn'}</span><strong data-testid="breakdown-burn">{number(amount * .25)} INC <small>25%</small></strong></div></div>;

export const AllocationPanel = ({ pod, onClose }) => {
  const { state, wallet, busy, action } = useDemo();
  const [amount, setAmount] = useState(String(state.cost));
  const valid = validAmount(amount);
  return <><div className="dialog-eyebrow"><span className="tiny-dot"/>NEW ALLOCATION / {pod.serial}</div><DialogTitle data-testid="start-dialog-title">A new cycle begins.</DialogTitle><DialogDescription data-testid="start-dialog-description">{pod.name} series · {shortAddress(wallet.address)}</DialogDescription>
    <div className="dialog-pod"><PodScene color={pod.color} testId="start-dialog-pod"/><span className="dialog-pod-meta">INC / {pod.serial}</span><span className="dialog-pod-time"><Clock3 size={13}/>02:00:00</span></div>
    <AmountField amount={amount} setAmount={setAmount} valid={valid}/><div className="available-balance" data-testid="start-available-balance">Wallet balance <span>{number(state.balance)} INC</span></div><Breakdown amount={valid ? Number(amount) : 0}/>
    <div className="dialog-note" data-testid="start-pool-note"><Info size={14}/><span>4 rarity tiers. 5 RWA assets. One reward per cycle.</span></div>
    {valid && Number(amount) > state.balance && <p className="input-error" data-testid="insufficient-balance-error">Insufficient INC. Add INC from the balance panel.</p>}
    <Button className="dialog-primary" disabled={busy || !valid || Number(amount) > state.balance} data-testid="start-incubation-action-button" onClick={async () => { if (await action('start', { pod_id: pod.id, amount: Number(amount) })) { toast.success('Incubation started. The 2-hour cycle is running.'); onClose(); } }}>{busy ? <Loader2 className="animate-spin"/> : <Hexagon size={17}/>}Buy incubation · {number(valid ? Number(amount) : 0)} INC<ArrowRight size={17}/></Button>
  </>;
};

export const SettingsPanel = ({ onClose }) => {
  const { state, busy, action } = useDemo();
  const [amount, setAmount] = useState(String(state.cost));
  const valid = validAmount(amount);
  return <><div className="dialog-eyebrow"><Settings2 size={14}/>INCUBATION PARAMETERS</div><DialogTitle data-testid="settings-dialog-title">Set the next cycle.</DialogTitle><DialogDescription>Active allocations keep the original commitment.</DialogDescription><AmountField amount={amount} setAmount={setAmount} valid={valid}/><div className="settings-rule"><Clock3 size={16}/><span>Incubation duration</span><b>2 hours</b></div><div className="settings-rule"><ArrowDownLeft size={16}/><span>INC return / burn</span><b>75% / 25%</b></div><Button className="dialog-primary" disabled={!valid || busy} data-testid="save-settings-button" onClick={async () => { if (await action('settings', { cost: Number(amount) }, 'patch')) { toast.success('Incubation amount updated'); onClose(); } }}><Check size={16}/>Save settings</Button></>;
};

export const WalletPanel = ({ onClose }) => {
  const { state, wallet, busy, action, disconnect } = useDemo();
  const navigate = useNavigate();
  return <><div className="dialog-eyebrow"><Wallet size={14}/>CONNECTED WALLET</div><DialogTitle data-testid="wallet-dialog-title">Allocation balance.</DialogTitle><DialogDescription data-testid="wallet-description">{shortAddress(wallet.address)} · EVM Chain {wallet.chain_id}</DialogDescription><div className="wallet-address-line" data-testid="wallet-address">{wallet.address}</div><div className="wallet-amount" data-testid="wallet-balance">{number(state.balance)}<span>INC</span></div><div className="settings-rule"><Hexagon size={16}/><span>Currently locked</span><b data-testid="wallet-locked">{number(state.runs.filter(r => r.status === 'incubating').reduce((a, r) => a + r.amount, 0))} INC</b></div><div className="settings-rule"><Flame size={16}/><span>Total burned</span><b className="orange">{number(state.total_burned)} INC</b></div><Button className="dialog-primary" disabled={busy} onClick={async () => { if (await action('top-up')) toast.success('10,000 INC added to wallet balance'); }} data-testid="buy-inc-demo-button"><Plus size={17}/>Add 10,000 INC</Button><Button variant="outline" onClick={() => { onClose(); navigate('/incubations'); }} data-testid="wallet-portfolio-link">Wallet holdings<ArrowRight size={16}/></Button><button className="disconnect-button" disabled={busy} onClick={async () => { await disconnect(); onClose(); toast.success('Wallet disconnected'); }} data-testid="disconnect-wallet-button"><LogOut size={14}/>Disconnect wallet</button></>;
};