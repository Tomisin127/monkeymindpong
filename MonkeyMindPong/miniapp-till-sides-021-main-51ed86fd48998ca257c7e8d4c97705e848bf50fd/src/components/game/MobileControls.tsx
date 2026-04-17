'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface MobileControlsProps {
  onMove: (direction: 'up' | 'down') => void;
  onStop: () => void;
}

export function MobileControls({ onMove, onStop }: MobileControlsProps): JSX.Element | null {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const moveIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (moveIntervalRef.current) {
        window.clearInterval(moveIntervalRef.current);
      }
    };
  }, []);

  if (!isMobile) return null;

  const handleTouchStart = (direction: 'up' | 'down'): void => {
    onMove(direction);
    moveIntervalRef.current = window.setInterval(() => {
      onMove(direction);
    }, 50);
  };

  const handleTouchEnd = (): void => {
    if (moveIntervalRef.current) {
      window.clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
    onStop();
  };

  return (
    <div className="fixed bottom-8 right-8 flex flex-col gap-2 z-40">
      <button
        onTouchStart={() => handleTouchStart('up')}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => handleTouchStart('up')}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        className="bg-muted/90 text-primary p-4 rounded-xl border border-primary/30 active:bg-primary/20 transition-colors glow-yellow"
        aria-label="Move up"
      >
        <ChevronUp size={32} />
      </button>
      <button
        onTouchStart={() => handleTouchStart('down')}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => handleTouchStart('down')}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        className="bg-muted/90 text-primary p-4 rounded-xl border border-primary/30 active:bg-primary/20 transition-colors glow-yellow"
        aria-label="Move down"
      >
        <ChevronDown size={32} />
      </button>
    </div>
  );
}
