import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(
      'https://api.coinbase.com/v2/prices/ETH-USD/spot',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ETH price');
    }

    const data = await response.json();
    const price = parseFloat(data.data.amount);

    return NextResponse.json({ price });
  } catch (error) {
    console.error('ETH price fetch error:', error);
    return NextResponse.json({ price: 3000 }, { status: 500 });
  }
}
