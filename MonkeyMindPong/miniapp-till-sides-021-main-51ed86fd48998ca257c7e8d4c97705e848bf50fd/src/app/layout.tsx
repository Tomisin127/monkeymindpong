import type { Metadata } from 'next';
import { Press_Start_2P, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import { FullscreenButton } from '@/components/FullscreenButton';

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Monkey MindPong',
  description: 'Play Pong against an AI monkey on Base chain. Swap $MONK tokens and earn on-chain glory.',
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  other: {
    'base:app_id': 'bc_9o0ejk10',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pressStart2P.variable} ${inter.variable} bg-background`}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <FullscreenButton className="fixed top-3 left-3 md:top-4 md:left-4 z-[100] shadow-lg backdrop-blur-md bg-background/70" />
        <Toaster />
      </body>
    </html>
  );
}
