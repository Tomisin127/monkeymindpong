import { createConfig, http, createStorage, cookieStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, metaMask, injected } from 'wagmi/connectors';

export const activeChain = base;

export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Monkey MindPong',
      preference: 'smartWalletOnly',
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
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
