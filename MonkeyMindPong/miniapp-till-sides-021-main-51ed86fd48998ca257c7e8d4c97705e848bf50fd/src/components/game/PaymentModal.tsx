'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { GAME_CONFIG, fetchEthPriceInUSD, calculatePaymentAmount } from '@/lib/game-utils';
import { WalletConnect } from '@/components/WalletConnect';
import { Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { formatEther } from 'viem';
import { toast } from 'sonner';

const BUILDER_CODE = 'bc_9o0ejk10' as const;

interface PaymentModalProps {
  onPaymentSuccess: () => void;
  isPlayAgain?: boolean;
}

export function PaymentModal({ onPaymentSuccess, isPlayAgain = false }: PaymentModalProps) {
  const { address, isConnected } = useAccount();
  const [ethPrice,       setEthPrice]       = useState(3000);
  const [paymentAmount,  setPaymentAmount]  = useState<bigint>(BigInt(0));
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [txHash,         setTxHash]         = useState<`0x${string}` | undefined>();

  const { sendTransactionAsync, isPending: isSending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    fetchEthPriceInUSD().then((price) => {
      setEthPrice(price);
      setPaymentAmount(calculatePaymentAmount(price));
      setIsLoadingPrice(false);
    });
  }, []);

  useEffect(() => {
    if (isSuccess) {
      toast.success('Payment confirmed! Loading game...');
      setTimeout(() => onPaymentSuccess(), 1200);
    }
  }, [isSuccess, onPaymentSuccess]);

  const ethAmount = Number(paymentAmount) / 1e18;

  const handlePay = async () => {
    if (!address || paymentAmount === BigInt(0)) return;
    try {
      const hash = await sendTransactionAsync({
        to: GAME_CONFIG.PAYMENT_RECIPIENT,
        value: paymentAmount,
        chainId: GAME_CONFIG.CHAIN_ID,
        data: `0x${Buffer.from(BUILDER_CODE).toString('hex')}`,
      });
      setTxHash(hash);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message.slice(0, 80) : 'Transaction failed');
    }
  };

  const isPaying = isSending || isConfirming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-sm pixel-border rounded-2xl bg-card overflow-hidden">

        {/* Header stripe */}
        <div className="h-1 w-full" style={{
          background: 'linear-gradient(90deg, hsl(48 100% 55%), hsl(142 100% 50%), hsl(213 100% 60%))'
        }} />

        <div className="p-6 space-y-6">
          {/* Logo area */}
          <div className="text-center space-y-2">
            <p className="font-pixel text-[10px] text-primary text-glow-yellow tracking-widest animate-pulse">
              {isPlayAgain ? 'PLAY AGAIN?' : 'INSERT COIN'}
            </p>
            <h1 className="font-pixel text-sm md:text-base text-foreground tracking-wide text-balance">
              MONKEY MINDPONG
            </h1>
            <p className="text-xs text-muted-foreground">
              {isPlayAgain
                ? 'Pay a micro-fee to battle the AI monkey again'
                : 'Pay a micro-fee to start your pong battle on Base'}
            </p>
          </div>

          {/* Wallet connect */}
          <div className="flex justify-center">
            <WalletConnect />
          </div>

          {/* Payment details */}
          {isConnected && (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry fee</span>
                  <span className="font-bold text-primary">${GAME_CONFIG.PAYMENT_USD}</span>
                </div>
                {!isLoadingPrice && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ETH price</span>
                      <span className="text-foreground">${ethPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">You pay</span>
                      <span className="font-mono text-xs text-foreground">{ethAmount.toFixed(10)} ETH</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Network</span>
                      <span className="text-accent font-semibold">Base Mainnet</span>
                    </div>
                  </>
                )}
              </div>

              {/* Status indicator */}
              {txHash && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isConfirming && <Loader2 size={12} className="animate-spin text-primary" />}
                  {isSuccess    && <CheckCircle2 size={12} className="text-neon-green" />}
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline truncate"
                  >
                    {isConfirming ? 'Confirming...' : 'View on Basescan'}
                  </a>
                </div>
              )}

              {/* Pay button */}
              {!isLoadingPrice && !isSuccess && (
                <button
                  onClick={handlePay}
                  disabled={isPaying || paymentAmount === BigInt(0)}
                  className="w-full py-3.5 rounded-xl font-pixel text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 glow-yellow"
                  style={{ background: 'hsl(48 100% 55%)', color: 'hsl(220 20% 7%)' }}
                >
                  {isPaying
                    ? <><Loader2 size={14} className="animate-spin" /> PROCESSING...</>
                    : <><Zap size={14} /> {isPlayAgain ? 'PAY & RETRY' : 'PAY & PLAY'}</>
                  }
                </button>
              )}

              {isSuccess && (
                <div className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 bg-secondary">
                  <CheckCircle2 size={16} className="text-neon-green" />
                  <span className="font-pixel text-[10px] text-foreground">LAUNCHING...</span>
                </div>
              )}
            </div>
          )}

          {!isConnected && (
            <p className="text-center text-xs text-muted-foreground">
              Connect your wallet above to pay the entry fee and play
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
