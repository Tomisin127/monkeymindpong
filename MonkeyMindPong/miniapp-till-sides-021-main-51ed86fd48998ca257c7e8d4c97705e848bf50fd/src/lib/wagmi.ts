import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, metaMask, injected } from 'wagmi/connectors';
import type { QueryClient } from '@tanstack/react-query';

const chainId = process.env.NEXT_PUBLIC_SDK_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_SDK_CHAIN_ID)
  : base.id;
  
export const activeChain = chainId === 84532 ? baseSepolia : base;
  
export const config = createConfig({
  chains: [activeChain],
  connectors: [
    coinbaseWallet({
      appName: 'Monkey MindPong',
      preference: 'smartWalletOnly', // Prioritize Smart Wallet for Base app
    }),
    metaMask({
      dappMetadata: {
        name: 'Monkey MindPong',
      },
    }),
    injected({ target: 'phantom' }),  
    injected({ target: 'rabby' }),  
    injected({ target: 'trust' }),  
  ],
  transports: {  
    [activeChain.id]: http(),
  },
});
