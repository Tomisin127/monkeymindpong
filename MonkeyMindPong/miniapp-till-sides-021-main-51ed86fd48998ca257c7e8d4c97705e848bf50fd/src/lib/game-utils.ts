export const GAME_CONFIG = {
  CANVAS_WIDTH:       1100,  // wide landscape
  CANVAS_HEIGHT:       500,
  PADDLE_WIDTH:         14,
  PADDLE_HEIGHT:       100,
  BALL_SIZE:            14,
  PADDLE_SPEED:         13,
  INITIAL_BALL_SPEED:    5,
  MAX_BALL_SPEED:       14,
  AI_DIFFICULTY:       0.75,
  WINNING_SCORE:          7,
  PAYMENT_USD:     0.000005,
  PAYMENT_RECIPIENT: '0x1109da207b1D6DcD1E6354544C0A63DE03aFd97B' as const,
  CHAIN_ID:           8453, // Base mainnet
} as const;

export type GameState = {
  playerY:     number;
  aiY:         number;
  ballX:       number;
  ballY:       number;
  ballSpeedX:  number;
  ballSpeedY:  number;
  playerScore: number;
  aiScore:     number;
  gameStarted: boolean;
  gameOver:    boolean;
  winner:      'player' | 'ai' | null;
};

export const initialGameState: GameState = {
  playerY:     GAME_CONFIG.CANVAS_HEIGHT / 2 - GAME_CONFIG.PADDLE_HEIGHT / 2,
  aiY:         GAME_CONFIG.CANVAS_HEIGHT / 2 - GAME_CONFIG.PADDLE_HEIGHT / 2,
  ballX:       GAME_CONFIG.CANVAS_WIDTH  / 2,
  ballY:       GAME_CONFIG.CANVAS_HEIGHT / 2,
  ballSpeedX:  GAME_CONFIG.INITIAL_BALL_SPEED,
  ballSpeedY:  GAME_CONFIG.INITIAL_BALL_SPEED,
  playerScore: 0,
  aiScore:     0,
  gameStarted: false,
  gameOver:    false,
  winner:      null,
};

export async function fetchEthPriceInUSD(): Promise<number> {
  try {
    const response = await fetch('/api/eth-price');
    const data = await response.json();
    return data.price;
  } catch {
    return 3000;
  }
}

export function calculatePaymentAmount(ethPriceUSD: number): bigint {
  const ethAmount = GAME_CONFIG.PAYMENT_USD / ethPriceUSD;
  return BigInt(Math.floor(ethAmount * 1e18));
}
