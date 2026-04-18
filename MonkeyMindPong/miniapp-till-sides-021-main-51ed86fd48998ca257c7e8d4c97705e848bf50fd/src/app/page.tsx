'use client';

import { useState } from 'react';
import { PaymentModal } from '@/components/game/PaymentModal';
import { PongGame } from '@/components/game/PongGame';
import { SwapModal } from '@/components/game/SwapModal';
import { WalletConnect } from '@/components/WalletConnect';
import { TrendingUp, Gamepad2, Zap, ChevronRight, ExternalLink } from 'lucide-react';

const TOKEN_ADDRESS = '0x8938f93554bcaebafc18c64b85551146e0bfc8c1';

export default function Home() {
  const [hasPaid, setHasPaid]       = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [swapOpen, setSwapOpen]     = useState(false);

  if (hasPaid) {
    return (
      <>
        <PongGame onGoHome={() => setHasPaid(false)} />
        <SwapModal isOpen={swapOpen} onClose={() => setSwapOpen(false)} />
      </>
    );
  }

  return (
    <>
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 md:px-8 h-14 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 pl-12 md:pl-14">
          <span className="font-pixel text-[9px] md:text-[11px] text-primary text-glow-yellow tracking-widest">
            MONKEY MINDPONG
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSwapOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/20 transition-colors"
          >
            <TrendingUp size={13} />
            Swap $MONK
          </button>
          <WalletConnect />
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 space-y-8">

          {/* Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-xs text-accent font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            Live on Base Mainnet
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="font-pixel text-2xl md:text-4xl lg:text-5xl text-primary text-glow-yellow leading-tight text-balance">
              MONKEY
              <br />
              MINDPONG
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto leading-relaxed">
              The on-chain arcade Pong battle. Pay a micro-fee in ETH, beat the AI monkey, and swap{' '}
              <span className="text-primary font-semibold">$MONK</span> tokens — all on Base.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowPayment(true)}
              className="group flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-pixel text-[10px] tracking-widest glow-yellow hover:scale-105 active:scale-95 transition-transform"
              style={{ background: 'hsl(48 100% 55%)', color: 'hsl(220 20% 7%)' }}
            >
              <Gamepad2 size={16} />
              PLAY NOW
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => setSwapOpen(true)}
              className="flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-pixel text-[10px] tracking-widest border border-primary/50 text-primary hover:bg-primary/10 hover:scale-105 active:scale-95 transition-all"
            >
              <TrendingUp size={15} />
              SWAP $MONK
            </button>
          </div>

          {/* Token contract link */}
          <a
            href={`https://basescan.org/token/${TOKEN_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink size={11} />
            Contract: {TOKEN_ADDRESS.slice(0, 8)}...{TOKEN_ADDRESS.slice(-6)}
          </a>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-4">
            {[
              {
                icon: <Zap size={20} className="text-primary" />,
                title: 'Micro-fee Entry',
                desc: '$0.000005 ETH to play each round. Real stakes, real fun.',
              },
              {
                icon: <Gamepad2 size={20} className="text-accent" />,
                title: 'AI Monkey Opponent',
                desc: 'Battle a trained AI paddle. First to 7 wins the match.',
              },
              {
                icon: <TrendingUp size={20} className="text-neon-green" />,
                title: 'Swap $MONK',
                desc: 'Buy or sell $MONK tokens via Uniswap V3 on Base.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex flex-col items-center gap-3 p-5 rounded-xl bg-card border border-border text-center hover:border-primary/40 transition-colors"
              >
                {card.icon}
                <h3 className="font-semibold text-sm text-foreground">{card.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="border-t border-border px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-pixel text-[8px] text-primary/60">MONKEY MINDPONG © 2025</span>
          <div className="flex items-center gap-4">
            <a
              href={`https://app.uniswap.org/swap?chain=base&outputCurrency=${TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Uniswap
            </a>
            <a
              href={`https://basescan.org/token/${TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Basescan
            </a>
            <span className="flex items-center gap-1">
              Built on{' '}
              <span className="text-accent font-semibold">Base</span>
            </span>
          </div>
        </footer>
      </main>

      {/* ── Modals ── */}
      {showPayment && (
        <PaymentModal onPaymentSuccess={() => { setHasPaid(true); setShowPayment(false); }} />
      )}
      <SwapModal isOpen={swapOpen} onClose={() => setSwapOpen(false)} />
    </>
  );
}
