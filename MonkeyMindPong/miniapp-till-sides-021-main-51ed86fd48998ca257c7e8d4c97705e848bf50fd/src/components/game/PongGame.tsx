'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MobileControls } from './MobileControls';
import { TouchControls } from './TouchControls';
import { PaymentModal } from './PaymentModal';
import { GAME_CONFIG, initialGameState, type GameState } from '@/lib/game-utils';
import { useAccount } from 'wagmi';

export function PongGame(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [isPlayAgain, setIsPlayAgain] = useState<boolean>(false);
  const gameLoopRef = useRef<number | null>(null);
  const { isConnected } = useAccount();

  const resetBall = useCallback((state: GameState): GameState => {
    return {
      ...state,
      ballX: GAME_CONFIG.CANVAS_WIDTH / 2,
      ballY: GAME_CONFIG.CANVAS_HEIGHT / 2,
      ballSpeedX: GAME_CONFIG.INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      ballSpeedY: GAME_CONFIG.INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    };
  }, []);

  const updateGame = useCallback((): void => {
    setGameState((prev: GameState): GameState => {
      if (!prev.gameStarted || prev.gameOver) return prev;

      let newState = { ...prev };

      if (keysPressed.has('w') || keysPressed.has('ArrowUp')) {
        newState.playerY = Math.max(0, newState.playerY - GAME_CONFIG.PADDLE_SPEED);
      }
      if (keysPressed.has('s') || keysPressed.has('ArrowDown')) {
        newState.playerY = Math.min(
          GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT,
          newState.playerY + GAME_CONFIG.PADDLE_SPEED
        );
      }

      const ballCenterY = newState.ballY + GAME_CONFIG.BALL_SIZE / 2;
      const aiPaddleCenterY = newState.aiY + GAME_CONFIG.PADDLE_HEIGHT / 2;
      const aiSpeed = GAME_CONFIG.PADDLE_SPEED * GAME_CONFIG.AI_DIFFICULTY;

      if (ballCenterY < aiPaddleCenterY - 10) {
        newState.aiY = Math.max(0, newState.aiY - aiSpeed);
      } else if (ballCenterY > aiPaddleCenterY + 10) {
        newState.aiY = Math.min(
          GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT,
          newState.aiY + aiSpeed
        );
      }

      newState.ballX += newState.ballSpeedX;
      newState.ballY += newState.ballSpeedY;

      if (newState.ballY <= 0 || newState.ballY >= GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.BALL_SIZE) {
        newState.ballSpeedY *= -1;
      }

      if (
        newState.ballX <= GAME_CONFIG.PADDLE_WIDTH &&
        newState.ballY + GAME_CONFIG.BALL_SIZE >= newState.playerY &&
        newState.ballY <= newState.playerY + GAME_CONFIG.PADDLE_HEIGHT
      ) {
        newState.ballSpeedX = Math.abs(newState.ballSpeedX);
        const speedIncrease = 1.05;
        newState.ballSpeedX = Math.min(
          newState.ballSpeedX * speedIncrease,
          GAME_CONFIG.MAX_BALL_SPEED
        );
        newState.ballSpeedY *= speedIncrease;
      }

      if (
        newState.ballX + GAME_CONFIG.BALL_SIZE >= GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.PADDLE_WIDTH &&
        newState.ballY + GAME_CONFIG.BALL_SIZE >= newState.aiY &&
        newState.ballY <= newState.aiY + GAME_CONFIG.PADDLE_HEIGHT
      ) {
        newState.ballSpeedX = -Math.abs(newState.ballSpeedX);
        const speedIncrease = 1.05;
        newState.ballSpeedX = Math.max(
          newState.ballSpeedX * speedIncrease,
          -GAME_CONFIG.MAX_BALL_SPEED
        );
        newState.ballSpeedY *= speedIncrease;
      }

      if (newState.ballX < 0) {
        newState.aiScore += 1;
        newState = resetBall(newState);
      }

      if (newState.ballX > GAME_CONFIG.CANVAS_WIDTH) {
        newState.playerScore += 1;
        newState = resetBall(newState);
      }

      if (newState.playerScore >= GAME_CONFIG.WINNING_SCORE) {
        newState.gameOver = true;
        newState.winner = 'player';
      } else if (newState.aiScore >= GAME_CONFIG.WINNING_SCORE) {
        newState.gameOver = true;
        newState.winner = 'ai';
      }

      return newState;
    });
  }, [keysPressed, resetBall]);

  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver) {
      gameLoopRef.current = window.requestAnimationFrame(function loop(): void {
        updateGame();
        gameLoopRef.current = window.requestAnimationFrame(loop);
      });
    }

    return () => {
      if (gameLoopRef.current) {
        window.cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.gameStarted, gameState.gameOver, updateGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      setKeysPressed((prev: Set<string>): Set<string> => new Set(prev).add(e.key));
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      setKeysPressed((prev: Set<string>): Set<string> => {
        const newSet = new Set(prev);
        newSet.delete(e.key);
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, gameState.playerY, GAME_CONFIG.PADDLE_WIDTH, GAME_CONFIG.PADDLE_HEIGHT);
    ctx.fillRect(
      GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.PADDLE_WIDTH,
      gameState.aiY,
      GAME_CONFIG.PADDLE_WIDTH,
      GAME_CONFIG.PADDLE_HEIGHT
    );

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(
      gameState.ballX + GAME_CONFIG.BALL_SIZE / 2,
      gameState.ballY + GAME_CONFIG.BALL_SIZE / 2,
      GAME_CONFIG.BALL_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(GAME_CONFIG.CANVAS_WIDTH / 2, 0);
    ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${gameState.playerScore}`,
      GAME_CONFIG.CANVAS_WIDTH / 4,
      60
    );
    ctx.fillText(
      `${gameState.aiScore}`,
      (GAME_CONFIG.CANVAS_WIDTH * 3) / 4,
      60
    );
  }, [gameState]);

  const handlePaymentSuccess = (): void => {
    setShowPaymentModal(false);
    setGameState({ ...initialGameState, gameStarted: true });
    setIsPlayAgain(false);
  };

  const handlePlayAgain = (): void => {
    if (!isConnected) {
      setGameState({ ...initialGameState, gameStarted: true });
      return;
    }
    setIsPlayAgain(true);
    setShowPaymentModal(true);
  };

  const handleInitialPlay = (): void => {
    setIsPlayAgain(false);
    setShowPaymentModal(true);
  };

  const handleMobileMove = (direction: 'up' | 'down'): void => {
    setGameState((prev: GameState): GameState => {
      if (!prev.gameStarted || prev.gameOver) return prev;

      const newY = direction === 'up' 
        ? Math.max(0, prev.playerY - GAME_CONFIG.PADDLE_SPEED)
        : Math.min(
            GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT,
            prev.playerY + GAME_CONFIG.PADDLE_SPEED
          );

      return { ...prev, playerY: newY };
    });
  };

  const handleTouchMove = (speed: number): void => {
    setGameState((prev: GameState): GameState => {
      if (!prev.gameStarted || prev.gameOver) return prev;

      const newY = Math.max(
        0,
        Math.min(
          GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT,
          prev.playerY - speed
        )
      );

      return { ...prev, playerY: newY };
    });
  };

  const handleMobileStop = (): void => {
    // No action needed for button stop
  };

  if (showPaymentModal) {
    return <PaymentModal onPaymentSuccess={handlePaymentSuccess} isPlayAgain={isPlayAgain} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-500 to-emerald-700 p-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-2xl">
        <div className="mb-4 text-center">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <span>🐵</span>
            <span>Monkey MindPong</span>
            <span>🏓</span>
          </h1>
          <p className="text-white/90">First to {GAME_CONFIG.WINNING_SCORE} wins!</p>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={GAME_CONFIG.CANVAS_WIDTH}
            height={GAME_CONFIG.CANVAS_HEIGHT}
            className="border-4 border-white rounded-lg shadow-xl max-w-full"
          />

          {!gameState.gameStarted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <Button onClick={handleInitialPlay} size="lg" className="text-xl px-8 py-6">
                🍌 Pay & Play 🍌
              </Button>
            </div>
          )}

          {gameState.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">
                  {gameState.winner === 'player' ? '🎉' : '🐵'}
                </div>
                <h2 className="text-4xl font-bold text-white">
                  {gameState.winner === 'player' ? 'You Win!' : 'AI Wins!'}
                </h2>
                <p className="text-xl text-white/90">
                  Final Score: {gameState.playerScore} - {gameState.aiScore}
                </p>
                {isConnected ? (
                  <Button onClick={handlePlayAgain} size="lg" className="text-xl px-8 py-6">
                    🔄 Pay & Play Again
                  </Button>
                ) : (
                  <Button onClick={handlePlayAgain} size="lg" className="text-xl px-8 py-6">
                    🔄 Play Again (Free)
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 bg-white/10 rounded-lg p-4 text-white text-center">
          <p className="text-sm mb-2">
            <strong>Controls:</strong>
          </p>
          <p className="text-xs">
            Desktop: W/S or Arrow Keys • Mobile: Swipe left side or use buttons
          </p>
        </div>
      </div>

      <TouchControls 
        onMove={handleTouchMove} 
        gameStarted={gameState.gameStarted}
        gameOver={gameState.gameOver}
      />
      <MobileControls onMove={handleMobileMove} onStop={handleMobileStop} />
    </div>
  );
}
