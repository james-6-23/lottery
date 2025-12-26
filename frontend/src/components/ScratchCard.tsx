import { useRef, useEffect, useState, useCallback } from 'react';

interface ScratchCardProps {
  width: number;
  height: number;
  coverColor?: string;
  brushSize?: number;
  revealThreshold?: number;
  onReveal?: () => void;
  onScratchProgress?: (percentage: number) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function ScratchCard({
  width,
  height,
  coverColor = '#c0c0c0',
  brushSize = 40,
  revealThreshold = 70,
  onReveal,
  onScratchProgress,
  children,
  disabled = false,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with cover
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with cover color
    ctx.fillStyle = coverColor;
    ctx.fillRect(0, 0, width, height);

    // Add some texture/pattern to make it look like a scratch card
    ctx.fillStyle = '#a0a0a0';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 3 + 1;
      ctx.fillRect(x, y, size, size);
    }

    // Add text hint
    ctx.fillStyle = '#808080';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('刮开此处', width / 2, height / 2);
  }, [width, height, coverColor]);

  // Calculate scratch percentage
  const calculateScratchPercentage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    const totalPixels = width * height;

    // Check alpha channel (every 4th value starting from index 3)
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }

    return (transparentPixels / totalPixels) * 100;
  }, [width, height]);

  // Scratch at position
  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || disabled || isRevealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();

    if (lastPointRef.current) {
      // Draw line from last point to current point for smooth scratching
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else {
      // Draw circle at current point
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    lastPointRef.current = { x, y };

    // Calculate and update scratch percentage
    const percentage = calculateScratchPercentage();
    setScratchPercentage(percentage);
    onScratchProgress?.(percentage);

    // Check if threshold reached
    if (percentage >= revealThreshold && !isRevealed) {
      setIsRevealed(true);
      onReveal?.();
    }
  }, [disabled, isRevealed, brushSize, calculateScratchPercentage, revealThreshold, onReveal, onScratchProgress]);

  // Get position from event
  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  }, [width, height]);

  // Mouse/Touch event handlers
  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (disabled || isRevealed) return;
    setIsScratching(true);
    lastPointRef.current = null;
    const pos = getPosition(e);
    if (pos) scratch(pos.x, pos.y);
  }, [disabled, isRevealed, getPosition, scratch]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isScratching || disabled || isRevealed) return;
    const pos = getPosition(e);
    if (pos) scratch(pos.x, pos.y);
  }, [isScratching, disabled, isRevealed, getPosition, scratch]);

  const handleEnd = useCallback(() => {
    setIsScratching(false);
    lastPointRef.current = null;
  }, []);

  // Handle reveal state synchronization - clear canvas when revealed
  useEffect(() => {
    if (isRevealed && scratchPercentage < 100) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        setScratchPercentage(100);
      });
    }
  }, [isRevealed, scratchPercentage, width, height]);

  return (
    <div 
      className="relative select-none"
      style={{ width, height }}
    >
      {/* Content underneath */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ width, height }}
      >
        {children}
      </div>

      {/* Scratch canvas overlay */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`absolute inset-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${isRevealed ? 'pointer-events-none opacity-0 transition-opacity duration-500' : ''}`}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{ touchAction: 'none' }}
      />

      {/* Progress indicator */}
      {!isRevealed && scratchPercentage > 0 && (
        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {Math.round(scratchPercentage)}%
        </div>
      )}
    </div>
  );
}
