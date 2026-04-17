'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TouchControls } from './TouchControls';
import { PaymentModal } from './PaymentModal';
import { FullscreenButton } from '@/components/FullscreenButton';
import { GAME_CONFIG, initialGameState, type GameState } from '@/lib/game-utils';
import { useAccount } from 'wagmi';
import { Trophy, Skull, RotateCcw, Home } from 'lucide-react';

// ── Colour palette drawn from CSS variables (mirrored as literals for canvas) ──
const COLORS = {
  court:   '#0d2a18',
  courtMid:'#0f3320',
  paddle:  '#f5c518',   // neon yellow (--primary)
  aiPaddle:'#38bdf8',   // neon blue  (--accent)
  ball:    '#ff8c38',   // orange
  net:     'rgba(245,197,24,0.25)',
  score:   '#f5c518',
  glow:    'rgba(245,197,24,0.5)',
  aiGlow:  'rgba(56,189,248,0.5)',
  ballGlow:'rgba(255,140,56,0.6)',
};

export function PongGame({ onGoHome }: { onGoHome?: () => void }): JSX.Element {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState]     = useState<GameState>(initialGameState);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [showPayment, setShowPayment] = useState(false);
  const [isPlayAgain, setIsPlayAgain] = useState(false);
  const gameLoopRef = useRef<number | null>(null);
  const { isConnected } = useAccount();

  // ── Game logic ─────────────────────────────────────────────────────────────
  const resetBall = useCallback((state: GameState): GameState => ({
    ...state,
    ballX:      GAME_CONFIG.CANVAS_WIDTH  / 2,
    ballY:      GAME_CONFIG.CANVAS_HEIGHT / 2,
    ballSpeedX: GAME_CONFIG.INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    ballSpeedY: GAME_CONFIG.INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
  }), []);

  const updateGame = useCallback((): void => {
    setGameState((prev): GameState => {
      if (!prev.gameStarted || prev.gameOver) return prev;

      let s = { ...prev };

      // Player controls
      if (keysPressed.has('w') || keysPressed.has('ArrowUp'))
        s.playerY = Math.max(0, s.playerY - GAME_CONFIG.PADDLE_SPEED);
      if (keysPressed.has('s') || keysPressed.has('ArrowDown'))
        s.playerY = Math.min(GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT, s.playerY + GAME_CONFIG.PADDLE_SPEED);

      // AI
      const ballCY = s.ballY + GAME_CONFIG.BALL_SIZE / 2;
      const aiCY   = s.aiY   + GAME_CONFIG.PADDLE_HEIGHT / 2;
      const aiSpeed = GAME_CONFIG.PADDLE_SPEED * GAME_CONFIG.AI_DIFFICULTY;
      if (ballCY < aiCY - 10) s.aiY = Math.max(0, s.aiY - aiSpeed);
      else if (ballCY > aiCY + 10)
        s.aiY = Math.min(GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT, s.aiY + aiSpeed);

      // Ball movement
      s.ballX += s.ballSpeedX;
      s.ballY += s.ballSpeedY;

      // Top/bottom bounce
      if (s.ballY <= 0 || s.ballY >= GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.BALL_SIZE)
        s.ballSpeedY *= -1;

      // Player paddle hit
      if (
        s.ballX <= GAME_CONFIG.PADDLE_WIDTH &&
        s.ballY + GAME_CONFIG.BALL_SIZE >= s.playerY &&
        s.ballY <= s.playerY + GAME_CONFIG.PADDLE_HEIGHT
      ) {
        s.ballSpeedX = Math.min(Math.abs(s.ballSpeedX) * 1.05, GAME_CONFIG.MAX_BALL_SPEED);
        s.ballSpeedY *= 1.05;
      }

      // AI paddle hit
      if (
        s.ballX + GAME_CONFIG.BALL_SIZE >= GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.PADDLE_WIDTH &&
        s.ballY + GAME_CONFIG.BALL_SIZE >= s.aiY &&
        s.ballY <= s.aiY + GAME_CONFIG.PADDLE_HEIGHT
      ) {
        s.ballSpeedX = -Math.min(Math.abs(s.ballSpeedX) * 1.05, GAME_CONFIG.MAX_BALL_SPEED);
        s.ballSpeedY *= 1.05;
      }

      // Scoring
      if (s.ballX < 0)                         { s.aiScore++;     s = resetBall(s); }
      if (s.ballX > GAME_CONFIG.CANVAS_WIDTH)  { s.playerScore++; s = resetBall(s); }

      if (s.playerScore >= GAME_CONFIG.WINNING_SCORE) { s.gameOver = true; s.winner = 'player'; }
      if (s.aiScore     >= GAME_CONFIG.WINNING_SCORE) { s.gameOver = true; s.winner = 'ai'; }

      return s;
    });
  }, [keysPressed, resetBall]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver) {
      const loop = (): void => {
        updateGame();
        gameLoopRef.current = window.requestAnimationFrame(loop);
      };
      gameLoopRef.current = window.requestAnimationFrame(loop);
    }
    return () => { if (gameLoopRef.current) window.cancelAnimationFrame(gameLoopRef.current); };
  }, [gameState.gameStarted, gameState.gameOver, updateGame]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const dn = (e: KeyboardEvent) => setKeysPressed((p) => new Set(p).add(e.key));
    const up = (e: KeyboardEvent) => setKeysPressed((p) => { const n = new Set(p); n.delete(e.key); return n; });
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  // ── Canvas render ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = GAME_CONFIG.CANVAS_WIDTH;
    const H = GAME_CONFIG.CANVAS_HEIGHT;

    // Court
    ctx.fillStyle = COLORS.court;
    ctx.fillRect(0, 0, W, H);

    // Subtle mid-court stripe
    ctx.fillStyle = COLORS.courtMid;
    ctx.fillRect(W / 2 - 2, 0, 4, H);

    // Dotted net
    ctx.strokeStyle = COLORS.net;
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Score numbers
    ctx.fillStyle = COLORS.score;
    ctx.font = 'bold 56px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = COLORS.glow;
    ctx.shadowBlur = 18;
    ctx.fillText(`${gameState.playerScore}`, W / 4,        70);
    ctx.fillText(`${gameState.aiScore}`,     (W * 3) / 4,  70);
    ctx.shadowBlur = 0;

    // Player paddle (yellow glow)
    ctx.shadowColor = COLORS.glow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.paddle;
    ctx.beginPath();
    ctx.roundRect(2, gameState.playerY, GAME_CONFIG.PADDLE_WIDTH, GAME_CONFIG.PADDLE_HEIGHT, 4);
    ctx.fill();

    // AI paddle (blue glow)
    ctx.shadowColor = COLORS.aiGlow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.aiPaddle;
    ctx.beginPath();
    ctx.roundRect(W - GAME_CONFIG.PADDLE_WIDTH - 2, gameState.aiY, GAME_CONFIG.PADDLE_WIDTH, GAME_CONFIG.PADDLE_HEIGHT, 4);
    ctx.fill();

    // Ball (orange glow)
    ctx.shadowColor = COLORS.ballGlow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(
      gameState.ballX + GAME_CONFIG.BALL_SIZE / 2,
      gameState.ballY + GAME_CONFIG.BALL_SIZE / 2,
      GAME_CONFIG.BALL_SIZE / 2,
      0, Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Scanlines overlay
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, y, W, 1);
    }
  }, [gameState]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setGameState({ ...initialGameState, gameStarted: true });
    setIsPlayAgain(false);
  };

  const handlePlayAgain = () => {
    if (!isConnected) { setGameState({ ...initialGameState, gameStarted: true }); return; }
    setIsPlayAgain(true);
    setShowPayment(true);
  };

  const handleGoHome = () => {
    setGameState(initialGameState);
    onGoHome?.();
  };

  const handleTouchMove = (speed: number) => {
    setGameState((prev) => {
      if (!prev.gameStarted || prev.gameOver) return prev;
      const newY = Math.max(0, Math.min(GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT, prev.playerY - speed));
      return { ...prev, playerY: newY };
    });
  };

  if (showPayment) {
    return <PaymentModal onPaymentSuccess={handlePaymentSuccess} isPlayAgain={isPlayAgain} />;
  }

  const playerWon = gameState.winner === 'player';

  return (
    <div className="flex flex-col h-[100svh] w-full bg-background overflow-hidden">

      {/* ── Top bar ── */}
      <div className="shrink-0 w-full flex items-center justify-between px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center gap-3">
          <FullscreenButton />
          <span className="font-pixel text-[9px] md:text-[10px] text-primary text-glow-yellow tracking-widest">MONKEY MINDPONG</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent border border-accent/30">BASE</span>
      </div>

      {/* ── Canvas area (fills remaining viewport) ── */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center px-2 pb-2 md:px-4 md:pb-4">
        <div
          className="relative"
          style={{
            aspectRatio: `${GAME_CONFIG.CANVAS_WIDTH} / ${GAME_CONFIG.CANVAS_HEIGHT}`,
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <canvas
            ref={canvasRef}
            width={GAME_CONFIG.CANVAS_WIDTH}
            height={GAME_CONFIG.CANVAS_HEIGHT}
            className="w-full h-full rounded-xl pixel-border scanlines block"
          />

        {/* ── Pre-game overlay ── */}
        {!gameState.gameStarted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm rounded-xl">
            <button
              onClick={() => { setIsPlayAgain(false); setShowPayment(true); }}
              className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-pixel text-xs tracking-wider glow-yellow hover:scale-105 active:scale-95 transition-transform"
            >
              PAY &amp; PLAY
            </button>
          </div>
        )}

        {/* ── Game-over overlay ── */}
        {gameState.gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md rounded-xl">
            <div className="text-center space-y-6 px-6">
              {/* Result icon */}
              <div className="flex justify-center">
                {playerWon
                  ? <Trophy size={64} className="text-primary text-glow-yellow" />
                  : <Skull   size={64} className="text-destructive" />
                }
              </div>

              {/* Title */}
              <h2 className="font-pixel text-sm md:text-lg tracking-widest" style={{
                color: playerWon ? 'hsl(48 100% 55%)' : 'hsl(0 75% 55%)',
                textShadow: playerWon
                  ? '0 0 20px hsl(48 100% 55% / 0.8)'
                  : '0 0 20px hsl(0 75% 55% / 0.8)',
              }}>
                {playerWon ? 'YOU WIN!' : 'GAME OVER'}
              </h2>

              {/* Score */}
              <p className="font-pixel text-[10px] text-muted-foreground">
                {gameState.playerScore} &nbsp;—&nbsp; {gameState.aiScore}
              </p>

              {/* Buttons row */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handlePlayAgain}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-pixel text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: playerWon ? 'hsl(48 100% 55%)' : 'hsl(213 100% 55%)',
                    color: 'hsl(220 20% 7%)',
                    boxShadow: playerWon
                      ? '0 0 16px hsl(48 100% 55% / 0.6)'
                      : '0 0 16px hsl(213 100% 55% / 0.6)',
                  }}
                >
                  <RotateCcw size={14} />
                  {isConnected ? 'PAY & RETRY' : 'PLAY AGAIN'}
                </button>

                <button
                  onClick={handleGoHome}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-pixel text-[10px] tracking-widest bg-muted text-foreground hover:bg-muted/70 transition-all hover:scale-105 active:scale-95 border border-border"
                >
                  <Home size={14} />
                  HOME
                </button>
              </div>
            </div>
          </div>
        )}

          <TouchControls
            onMove={handleTouchMove}
            gameStarted={gameState.gameStarted}
            gameOver={gameState.gameOver}
          />
        </div>
      </div>
    </div>
  );
}
