'use client';

import { useEffect, useState, useRef } from 'react';

interface TouchControlsProps {
  onMove: (speed: number) => void;
  gameStarted: boolean;
  gameOver: boolean;
}

export function TouchControls({ onMove, gameStarted, gameOver }: TouchControlsProps): JSX.Element | null {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const touchStartY = useRef<number>(0);
  const lastTouchY = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const currentSpeed = useRef<number>(0);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  useEffect(() => {
    const updateMovement = (): void => {
      if (currentSpeed.current !== 0) {
        onMove(currentSpeed.current);
        animationFrameId.current = requestAnimationFrame(updateMovement);
      }
    };

    if (currentSpeed.current !== 0) {
      animationFrameId.current = requestAnimationFrame(updateMovement);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [onMove]);

  if (!isMobile || !gameStarted || gameOver) return null;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>): void => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartY.current = touch.clientY;
    lastTouchY.current = touch.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = lastTouchY.current - touch.clientY;
    lastTouchY.current = touch.clientY;

    // Speed is relative to swipe velocity (multiplied by 2 for faster movement)
    const speed = deltaY * 2;
    currentSpeed.current = Math.max(-20, Math.min(20, speed));
    
    if (animationFrameId.current === null) {
      animationFrameId.current = requestAnimationFrame(() => {
        onMove(currentSpeed.current);
      });
    }
  };

  const handleTouchEnd = (): void => {
    currentSpeed.current = 0;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  return (
    <div
      className="fixed left-0 top-0 bottom-0 w-1/3 z-30 touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    />
  );
}
