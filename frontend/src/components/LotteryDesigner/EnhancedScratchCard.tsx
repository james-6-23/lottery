import { useRef, useEffect, useState, useCallback } from 'react';
import { generateScratchCover } from './ScratchTextures';

interface EnhancedScratchCardProps {
  width: number;
  height: number;
  scratchType?: 'silver' | 'gold' | 'bronze' | 'custom';
  customColor?: string;
  brushSize?: number;
  revealThreshold?: number;
  watermarkText?: string;
  onReveal?: () => void;
  onScratchProgress?: (percentage: number) => void;
  onScratchStart?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  revealed?: boolean;
  enableVibration?: boolean;
  className?: string;
}

export function EnhancedScratchCard({
  width,
  height,
  scratchType = 'silver',
  customColor,
  brushSize = 35,
  revealThreshold = 60,
  watermarkText = '刮开此处',
  onReveal,
  onScratchProgress,
  onScratchStart,
  children,
  disabled = false,
  revealed = false,
  enableVibration = true,
  className = '',
}: EnhancedScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(revealed);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasStartedRef = useRef(false);

  // 初始化Canvas覆盖层
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 生成金属质感覆盖层
    const coverCanvas = generateScratchCover(
      width,
      height,
      scratchType,
      customColor,
      watermarkText
    );

    ctx.drawImage(coverCanvas, 0, 0);
  }, [width, height, scratchType, customColor, watermarkText, isRevealed]);

  // 同步外部revealed状态
  useEffect(() => {
    if (revealed && !isRevealed) {
      setIsRevealed(true);
      setScratchPercentage(100);
    }
  }, [revealed, isRevealed]);

  // 计算刮开百分比
  const calculateScratchPercentage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    const totalPixels = width * height;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }

    return (transparentPixels / totalPixels) * 100;
  }, [width, height]);

  // 刮开效果
  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || disabled || isRevealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 首次刮开触发
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      onScratchStart?.();
    }

    ctx.globalCompositeOperation = 'destination-out';

    if (lastPointRef.current) {
      // 绘制平滑线条
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 添加边缘粗糙效果 (Dissolve)
      const distance = Math.sqrt(
        Math.pow(x - lastPointRef.current.x, 2) +
        Math.pow(y - lastPointRef.current.y, 2)
      );
      const steps = Math.max(1, Math.floor(distance / 5));

      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const px = lastPointRef.current.x + (x - lastPointRef.current.x) * t;
        const py = lastPointRef.current.y + (y - lastPointRef.current.y) * t;

        // 随机散点模拟粗糙边缘
        for (let j = 0; j < 3; j++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = brushSize / 2 + Math.random() * 8;
          const dotX = px + Math.cos(angle) * radius;
          const dotY = py + Math.sin(angle) * radius;
          const dotSize = Math.random() * 4 + 2;

          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    lastPointRef.current = { x, y };

    // 触觉反馈
    if (enableVibration && 'vibrate' in navigator) {
      navigator.vibrate(5);
    }

    // 计算进度
    const percentage = calculateScratchPercentage();
    setScratchPercentage(percentage);
    onScratchProgress?.(percentage);

    // 检查是否达到阈值
    if (percentage >= revealThreshold && !isRevealed) {
      setIsRevealed(true);
      onReveal?.();

      // 强震动反馈
      if (enableVibration && 'vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
    }
  }, [disabled, isRevealed, brushSize, calculateScratchPercentage, revealThreshold, onReveal, onScratchProgress, onScratchStart, enableVibration]);

  // 获取坐标
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

  // 事件处理
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

  // 自动清除覆盖层动画
  useEffect(() => {
    if (isRevealed && scratchPercentage < 100) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 渐变消失动画
      let opacity = 1;
      const fadeOut = () => {
        opacity -= 0.1;
        if (opacity <= 0) {
          ctx.clearRect(0, 0, width, height);
          setScratchPercentage(100);
          return;
        }
        canvas.style.opacity = String(opacity);
        requestAnimationFrame(fadeOut);
      };
      requestAnimationFrame(fadeOut);
    }
  }, [isRevealed, scratchPercentage, width, height]);

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ width, height }}
    >
      {/* 底层内容 */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg"
        style={{ width, height }}
      >
        {children}
      </div>

      {/* 刮刮乐覆盖层 */}
      {!isRevealed && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`absolute inset-0 rounded-lg transition-opacity duration-300 ${disabled ? 'cursor-not-allowed' : 'cursor-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'10\'/%3E%3Cpath d=\'M12 6v12M6 12h12\'/%3E%3C/svg%3E")_12_12,pointer]'
            }`}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* 进度指示器 */}
      {!isRevealed && scratchPercentage > 0 && scratchPercentage < revealThreshold && (
        <div className="absolute bottom-1 left-1 right-1">
          <div className="h-1 bg-black/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 transition-all duration-100"
              style={{ width: `${(scratchPercentage / revealThreshold) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
