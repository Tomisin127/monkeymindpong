'use client';

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { useState } from 'react';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink } from 'lucide-react';
import { formatEther } from 'viem';
import { toast } from 'sonner';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const ethBal = balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0.0000';

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied!');
    }
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 border border-border text-sm font-medium transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
            <Wallet size={11} className="text-primary" />
          </div>
          <span className="text-foreground font-mono text-xs">{shortAddress}</span>
          <span className="text-muted-foreground text-xs">{ethBal} ETH</span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-card border border-border shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-muted-foreground">Connected wallet</p>
                <p className="font-mono text-xs text-foreground mt-0.5">{shortAddress}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={copyAddress}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <Copy size={13} className="text-muted-foreground" />
                  Copy address
                </button>
                <a
                  href={`https://basescan.org/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  <ExternalLink size={13} className="text-muted-foreground" />
                  View on Basescan
                </a>
                <button
                  onClick={() => { disconnect(); setShowDropdown(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <LogOut size={13} />
                  Disconnect
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConnectors(!showConnectors)}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm glow-yellow hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Wallet size={14} />
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showConnectors && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowConnectors(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-card border border-border shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs text-muted-foreground font-medium">Choose wallet</p>
            </div>
            <div className="p-1">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => { connect({ connector }); setShowConnectors(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  {connector.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
