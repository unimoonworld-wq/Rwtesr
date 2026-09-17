import { useEffect, useState } from 'react';

export function useInjectedWallets() {
  const [wallets, setWallets] = useState([]);
  useEffect(() => {
    const discovered = new Map();
    const publish = () => {
      const result = [...discovered.values()];
      const injected = window.ethereum?.providers || (window.ethereum ? [window.ethereum] : []);
      injected.forEach((provider, i) => {
        if (!result.some(w => w.provider === provider)) result.push({ provider, info: { uuid: `injected-${i}`, name: provider.isMetaMask ? 'MetaMask' : provider.isCoinbaseWallet ? 'Coinbase Wallet' : 'EVM Wallet', rdns: provider.isMetaMask ? 'io.metamask' : `injected-${i}` } });
      });
      setWallets(result);
    };
    const announce = e => {
      const detail = e.detail;
      if (detail?.provider?.request && detail.info?.uuid) { discovered.set(detail.info.uuid, detail); publish(); }
    };
    window.addEventListener('eip6963:announceProvider', announce);
    window.addEventListener('ethereum#initialized', publish);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    publish();
    const timer = setTimeout(publish, 700);
    return () => { clearTimeout(timer); window.removeEventListener('eip6963:announceProvider', announce); window.removeEventListener('ethereum#initialized', publish); };
  }, []);
  return wallets;
}
export const walletError = error => {
  if (error.code === 4001) return 'Connection or signature declined. No changes were made.';
  if (error.code === -32002) return 'A wallet request is already open. Check the wallet extension.';
  if (error.code === 4900 || error.code === 4901) return 'Wallet disconnected. Open the wallet and try again.';
  const detail = error.response?.data?.detail;
  return typeof detail === 'string' ? detail : error.message || 'Unable to connect this wallet.';
};
export const shortAddress = address => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';