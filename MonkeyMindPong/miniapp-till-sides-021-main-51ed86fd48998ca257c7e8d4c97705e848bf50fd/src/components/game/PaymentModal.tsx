'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GAME_CONFIG, fetchEthPriceInUSD, calculatePaymentAmount } from '@/lib/game-utils';

interface PaymentModalProps {
  onPaymentSuccess: () => void;
  isPlayAgain?: boolean;
}

export function PaymentModal({ onPaymentSuccess, isPlayAgain = false }: PaymentModalProps): JSX.Element {
  const { address, isConnected } = useAccount();
  const [ethPrice, setEthPrice] = useState<number>(3000);
  const [paymentAmount, setPaymentAmount] = useState<bigint>(BigInt(0));
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(true);

  useEffect(() => {
    async function loadPrice(): Promise<void> {
      setIsLoadingPrice(true);
      const price = await fetchEthPriceInUSD();
      setEthPrice(price);
      const amount = calculatePaymentAmount(price);
      setPaymentAmount(amount);
      setIsLoadingPrice(false);
    }
    loadPrice();
  }, []);

  const ethAmount = Number(paymentAmount) / 1e18;

  const handleOnStatus = (status: LifecycleStatus): void => {
    if (status.statusName === 'success') {
      setTimeout(() => {
        onPaymentSuccess();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🐵🏓</div>
          <CardTitle className="text-3xl font-bold">
            {isPlayAgain ? 'Play Again?' : 'Monkey MindPong'}
          </CardTitle>
          <CardDescription className="text-lg">
            {isPlayAgain 
              ? 'Pay to play another round of banana pong battle!'
              : 'Pay to play the ultimate banana pong battle!'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Wallet>
              <ConnectWallet>
                <div className="inline-flex items-center justify-center">
                  Connect Wallet
                </div>
              </ConnectWallet>
              <WalletDropdown>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>

          {isConnected && address && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="font-bold">${GAME_CONFIG.PAYMENT_USD}</span>
                </div>
                {!isLoadingPrice && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ETH Price:</span>
                      <span>${ethPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ETH Amount:</span>
                      <span className="font-mono text-sm">{ethAmount.toFixed(10)} ETH</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Recipient:</span>
                      <span className="font-mono">
                        {GAME_CONFIG.PAYMENT_RECIPIENT.slice(0, 6)}...{GAME_CONFIG.PAYMENT_RECIPIENT.slice(-4)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {!isLoadingPrice && paymentAmount > BigInt(0) && (
                <Transaction
                  chainId={GAME_CONFIG.CHAIN_ID}
                  calls={[
                    {
                      to: GAME_CONFIG.PAYMENT_RECIPIENT as `0x${string}`,
                      value: paymentAmount,
                    },
                  ]}
                  onStatus={handleOnStatus}
                >
                  <TransactionButton
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 rounded-md font-medium transition-colors"
                    text={isPlayAgain ? '🍌 Pay & Play Again 🍌' : '🍌 Pay & Play 🍌'}
                  />
                  <TransactionStatus>
                    <TransactionStatusLabel />
                    <TransactionStatusAction />
                  </TransactionStatus>
                </Transaction>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Playing on Base network • Payment to Ohara wallet
              </p>
            </div>
          )}

          {!isConnected && (
            <p className="text-center text-sm text-muted-foreground">
              Connect your wallet to pay and start playing
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
