import { useState, useCallback, useMemo } from 'react';
import { EnhancedScratchCard } from './EnhancedScratchCard';
import { Confetti, GlowEffect } from './Confetti';
import type { LotteryConfig, LotteryCell, LotteryTheme } from './types';

interface LotteryTicketProps {
  config: LotteryConfig;
  cells: LotteryCell[];
  ticketNumber?: string;
  onCellRevealed?: (index: number, cell: LotteryCell) => void;
  onAllRevealed?: (isWin: boolean, totalPrize: number) => void;
  disabled?: boolean;
  previewMode?: boolean;
}

export function LotteryTicket({
  config,
  cells,
  ticketNumber = 'DEMO-001',
  onCellRevealed,
  onAllRevealed,
  disabled = false,
  previewMode = false,
}: LotteryTicketProps) {
  const [revealedCells, setRevealedCells] = useState<Set<number>>(
    previewMode ? new Set(cells.map((_, i) => i)) : new Set()
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [totalPrize, setTotalPrize] = useState(0);

  const { theme, rows, cols, cellSize, cellGap } = config;

  // 计算是否中奖
  const winResult = useMemo(() => {
    const symbolCounts = new Map<string, number>();
    let hasSpecial = false;
    let sumPoints = 0;

    cells.forEach(cell => {
      if (cell.isSpecial) hasSpecial = true;
      sumPoints += cell.points;
      const count = symbolCounts.get(cell.symbol.id) || 0;
      symbolCounts.set(cell.symbol.id, count + 1);
    });

    // 检查匹配
    let matchedSymbol: string | null = null;
    let matchCount = 0;
    symbolCounts.forEach((count, symbolId) => {
      if (count >= config.matchCount) {
        matchedSymbol = symbolId;
        matchCount = count;
      }
    });

    const isWin = hasSpecial || matchedSymbol !== null;
    let prize = 0;

    if (hasSpecial) {
      prize = sumPoints;
    } else if (matchedSymbol) {
      const symbol = cells.find(c => c.symbol.id === matchedSymbol)?.symbol;
      if (symbol) {
        prize = Math.floor(config.price * symbol.prizeMultiplier * matchCount);
      }
    }

    return { isWin, prize, hasSpecial, matchedSymbol, matchCount };
  }, [cells, config.matchCount, config.price]);

  // 处理单元格揭示
  const handleCellRevealed = useCallback((index: number) => {
    if (revealedCells.has(index)) return;

    const newRevealed = new Set(revealedCells);
    newRevealed.add(index);
    setRevealedCells(newRevealed);

    const cell = cells[index];
    onCellRevealed?.(index, cell);

    // 检查是否全部揭示
    if (newRevealed.size === cells.length) {
      setTotalPrize(winResult.prize);
      
      if (winResult.isWin && config.enableConfetti) {
        setShowConfetti(true);
      }
      if (winResult.isWin && config.enableGlow) {
        setShowGlow(true);
      }
      
      onAllRevealed?.(winResult.isWin, winResult.prize);
    }
  }, [revealedCells, cells, winResult, config.enableConfetti, config.enableGlow, onCellRevealed, onAllRevealed]);

  // 锯齿边缘样式
  const getSerratedStyle = (theme: LotteryTheme): React.CSSProperties => {
    if (theme.ticketBorderStyle !== 'serrated') return {};
    
    return {
      maskImage: `
        linear-gradient(135deg, transparent 5px, black 5px),
        linear-gradient(-135deg, transparent 5px, black 5px),
        linear-gradient(45deg, transparent 5px, black 5px),
        linear-gradient(-45deg, transparent 5px, black 5px)
      `,
      maskSize: '10px 100%, 10px 100%, 100% 10px, 100% 10px',
      maskPosition: 'left, right, top, bottom',
      maskRepeat: 'repeat-y, repeat-y, repeat-x, repeat-x',
      WebkitMaskImage: `
        linear-gradient(135deg, transparent 5px, black 5px),
        linear-gradient(-135deg, transparent 5px, black 5px),
        linear-gradient(45deg, transparent 5px, black 5px),
        linear-gradient(-45deg, transparent 5px, black 5px)
      `,
      WebkitMaskSize: '10px 100%, 10px 100%, 100% 10px, 100% 10px',
      WebkitMaskPosition: 'left, right, top, bottom',
      WebkitMaskRepeat: 'repeat-y, repeat-y, repeat-x, repeat-x',
    };
  };

  const gridWidth = cols * cellSize + (cols - 1) * cellGap;
  const gridHeight = rows * cellSize + (rows - 1) * cellGap;
  const ticketWidth = gridWidth + 48;
  // ticketHeight 用于未来扩展
  void (gridHeight + 160);

  const isAllRevealed = revealedCells.size === cells.length;

  return (
    <>
      {/* 彩带效果 */}
      <Confetti 
        active={showConfetti} 
        onComplete={() => setShowConfetti(false)}
        duration={4000}
        particleCount={150}
      />

      {/* 彩票主体 */}
      <div 
        className="relative rounded-2xl overflow-hidden transition-transform duration-300 hover:scale-[1.02]"
        style={{
          width: ticketWidth,
          background: theme.ticketBackground,
          border: theme.ticketBorderStyle !== 'serrated' 
            ? `3px solid ${theme.ticketBorderColor}` 
            : 'none',
          boxShadow: theme.ticketShadow,
          ...getSerratedStyle(theme),
        }}
      >
        {/* 中奖光晕 */}
        <GlowEffect active={showGlow} color={theme.ticketBorderColor} intensity={1.5} />

        {/* 头部区域 */}
        <div 
          className="px-4 py-3 text-center"
          style={{ background: theme.headerGradient }}
        >
          <h2 
            className="text-xl font-bold tracking-wider"
            style={{ 
              color: theme.headerTextColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            ✨ {config.name} ✨
          </h2>
          <div 
            className="text-sm mt-1 opacity-80"
            style={{ color: theme.headerTextColor }}
          >
            最高奖金 {config.maxPrize.toLocaleString()} 积分
          </div>
        </div>

        {/* 彩票编号 */}
        <div 
          className="px-4 py-2 text-xs font-mono text-center"
          style={{ color: theme.labelTextColor }}
        >
          NO. {ticketNumber}
        </div>

        {/* 中奖符号提示区 */}
        <div className="px-4 pb-2">
          <div 
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <span style={{ color: theme.labelTextColor }} className="text-xs">
              🏆 中奖符号:
            </span>
            {config.symbols.slice(0, 4).map(symbol => (
              <span 
                key={symbol.id} 
                className="text-lg"
                title={`${symbol.name} x${symbol.prizeMultiplier}`}
              >
                {symbol.emoji}
              </span>
            ))}
            {config.specialSymbols.slice(0, 1).map(symbol => (
              <span 
                key={symbol.id} 
                className="text-lg animate-pulse"
                title={`${symbol.name} (特殊)`}
              >
                {symbol.emoji}
              </span>
            ))}
          </div>
        </div>

        {/* 刮奖区域 */}
        <div className="px-4 py-3">
          <div 
            className="p-3 rounded-xl"
            style={{ 
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div 
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                gap: cellGap,
              }}
            >
              {cells.map((cell, index) => {
                const isRevealed = revealedCells.has(index) || previewMode;
                
                return (
                  <div key={index} className="relative">
                    <EnhancedScratchCard
                      width={cellSize}
                      height={cellSize}
                      scratchType={theme.scratchLayerType}
                      customColor={theme.scratchLayerColor}
                      brushSize={config.scratchBrushSize}
                      revealThreshold={config.revealThreshold}
                      watermarkText=""
                      onReveal={() => handleCellRevealed(index)}
                      disabled={disabled || isRevealed}
                      revealed={isRevealed}
                      enableVibration={true}
                    >
                      {/* 单元格内容 */}
                      <div 
                        className="w-full h-full flex flex-col items-center justify-center rounded-lg transition-all duration-300"
                        style={{
                          background: cell.isSpecial 
                            ? theme.cellSpecialBackground 
                            : cell.isWin 
                              ? theme.cellWinBackground 
                              : theme.cellBackground,
                          transform: isRevealed ? 'scale(1)' : 'scale(0.9)',
                        }}
                      >
                        <span 
                          className={`text-2xl ${cell.isSpecial ? 'animate-bounce' : ''}`}
                          style={{ 
                            filter: cell.isSpecial ? 'drop-shadow(0 0 8px gold)' : 'none',
                          }}
                        >
                          {cell.symbol.emoji}
                        </span>
                        <span 
                          className="text-xs font-bold mt-0.5"
                          style={{ color: theme.prizeTextColor }}
                        >
                          {cell.points}分
                        </span>
                      </div>
                    </EnhancedScratchCard>

                    {/* 中奖标记 */}
                    {isRevealed && (cell.isWin || cell.isSpecial) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 状态栏 */}
        <div className="px-4 py-3">
          <div 
            className="text-center py-2 px-4 rounded-lg"
            style={{ 
              background: isAllRevealed 
                ? winResult.isWin 
                  ? 'linear-gradient(90deg, #ffd700 0%, #ffed4a 50%, #ffd700 100%)' 
                  : 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.05)',
            }}
          >
            {isAllRevealed ? (
              winResult.isWin ? (
                <div className="text-lg font-bold" style={{ color: '#1a1a2e' }}>
                  🎉 恭喜中奖 +{totalPrize} 积分！
                </div>
              ) : (
                <div style={{ color: theme.labelTextColor }}>
                  未中奖，再接再厉！
                </div>
              )
            ) : (
              <div className="flex items-center justify-center gap-2" style={{ color: theme.labelTextColor }}>
                <span>已刮开</span>
                <span className="font-bold" style={{ color: theme.prizeTextColor }}>
                  {revealedCells.size}/{cells.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 底部装饰 */}
        <div 
          className="h-2"
          style={{ background: theme.headerGradient }}
        />
      </div>
    </>
  );
}
