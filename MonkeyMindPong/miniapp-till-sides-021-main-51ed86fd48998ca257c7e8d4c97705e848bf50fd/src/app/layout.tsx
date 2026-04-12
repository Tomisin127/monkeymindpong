import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@coinbase/onchainkit/styles.css';
import './globals.css';
import { ResponseLogger } from '@/components/response-logger';
import { cookies } from 'next/headers';
import { ReadyNotifier } from '@/components/ready-notifier';
import { Providers } from './providers';
import FarcasterWrapper from "@/components/FarcasterWrapper";

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const requestId = cookieStore.get('x-request-id')?.value;

  return (
        <html lang="en">
          <head>
            {requestId && <meta name="x-request-id" content={requestId} />}
          </head>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <ReadyNotifier />
            <Providers>
      <FarcasterWrapper>
        {children}
      </FarcasterWrapper>
      </Providers>
            <ResponseLogger />
          </body>
        </html>
      );
}

export const metadata: Metadata = {
        title: "Base Monkey MindPong",
        description: "Play a Pong game against AI monkeys with a 0.0001$ Base ETH entry fee, enabling on-chain transactions like prize distribution and leaderboards. Experience varied AI challenges!",
        other: { 
          "fc:frame": JSON.stringify({"version":"next","imageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/thumbnail_43d14020-a6b8-40f2-a011-c248f0086225-pKzTMEzyQbiZ40Cy54FPR3zjjSVps1","button":{"title":"Open with Ohara","action":{"type":"launch_frame","name":"Base Monkey MindPong","url":"https://till-sides-021.app.ohara.ai","splashImageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/farcaster/splash_images/splash_image1.svg","splashBackgroundColor":"#ffffff"}}}),
          'base:app_id': '69428af4d19763ca26ddc395',
        }
    };
