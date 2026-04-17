'use client';

import { useEffect, useRef, useState } from 'react';

interface TouchControlsProps {
  onMove: (speed: number) => void;
  gameStarted: boolean;
  gameOver: boolean;
}

export function TouchControls({ onMove, gameStarted, gameOver }: TouchControlsProps): JSX.Element | null {
  const [isTouch, setIsTouch] = useState<boolean>(false);
  const lastTouchY = useRef<number>(0);

  useEffect(() => {
    // Detect touch-capable device (works in both portrait and landscape)
    const touchCapable =
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    setIsTouch(touchCapable);
  }, []);

  if (!isTouch || !gameStarted || gameOver) return null;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>): void => {
    const touch = e.touches[0];
    if (!touch) return;
    lastTouchY.current = touch.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const deltaY = lastTouchY.current - touch.clientY;
    lastTouchY.current = touch.clientY;
    // Amplify swipe for responsive paddle movement
    onMove(deltaY * 3);
  };

  return (
    <div
      className="absolute inset-0 z-10 touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    />
  );
}
