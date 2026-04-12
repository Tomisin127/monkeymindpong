export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  PADDLE_WIDTH: 15,
  PADDLE_HEIGHT: 100,
  BALL_SIZE: 15,
  PADDLE_SPEED: 12, // Increased from 8 to 12 for faster player movement
  INITIAL_BALL_SPEED: 5,
  MAX_BALL_SPEED: 12,
  AI_DIFFICULTY: 0.75,
  WINNING_SCORE: 7,
  PAYMENT_USD: 0.000005, // $0.000005 worth of Base ETH
  PAYMENT_RECIPIENT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', // Your Ohara wallet
  CHAIN_ID: 8453, // Base mainnet
};

export type GameState = {
  playerY: number;
  aiY: number;
  ballX: number;
  ballY: number;
  ballSpeedX: number;
  ballSpeedY: number;
  playerScore: number;
  aiScore: number;
  gameStarted: boolean;
  gameOver: boolean;
  winner: 'player' | 'ai' | null;
};

export const initialGameState: GameState = {
  playerY: GAME_CONFIG.CANVAS_HEIGHT / 2 - GAME_CONFIG.PADDLE_HEIGHT / 2,
  aiY: GAME_CONFIG.CANVAS_HEIGHT / 2 - GAME_CONFIG.PADDLE_HEIGHT / 2,
  ballX: GAME_CONFIG.CANVAS_WIDTH / 2,
  ballY: GAME_CONFIG.CANVAS_HEIGHT / 2,
  ballSpeedX: GAME_CONFIG.INITIAL_BALL_SPEED,
  ballSpeedY: GAME_CONFIG.INITIAL_BALL_SPEED,
  playerScore: 0,
  aiScore: 0,
  gameStarted: false,
  gameOver: false,
  winner: null,
};

export async function fetchEthPriceInUSD(): Promise<number> {
  try {
    const response = await fetch('/api/eth-price');
    const data = await response.json();
    return data.price;
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    return 3000;
  }
}

export function calculatePaymentAmount(ethPriceUSD: number): bigint {
  const ethAmount = GAME_CONFIG.PAYMENT_USD / ethPriceUSD;
  const weiAmount = BigInt(Math.floor(ethAmount * 1e18));
  return weiAmount;
}
