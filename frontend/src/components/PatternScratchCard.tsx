import { useState, useCallback, useMemo } from 'react';
import { ScratchCard } from './ScratchCard';
import type { PatternAreaData, PatternConfig, PatternInfo } from '../api/lottery';

interface PatternScratchCardProps {
  areas: PatternAreaData[];
  config: PatternConfig;
  totalPoints: number;
  onAreaScratched?: (areaIndex: number, result: PatternScratchResult) => void;
  onAllScratched?: (totalPrize: number) => void;
  disabled?: boolean;
  revealed?: boolean;
}

export interface PatternScratchResult {
  areaIndex: number;
  patternId: string;
  patternName: string;
  patternImageUrl: string;
  points: number;
  isWin: boolean;
  isSpecial: boolean;
  prizeAwarded: number;
}

// Default pattern images (emoji-based for demo)
const DEFAULT_PATTERN_IMAGES: Record<string, string> = {
  'A': '🍎',
  'B': '🍊',
  'C': '🍋',
  'D': '🍇',
  'E': '🍓',
  'F': '🍒',
  'SPECIAL_A': '⭐',
  'SPECIAL_B': '💎',
};

export function PatternScratchCard({
  areas,
  config,
  totalPoints,
  onAreaScratched,
  onAllScratched,
  disabled = false,
  revealed = false,
}: PatternScratchCardProps) {
  // Derive initial state from revealed prop
  const [scratchedAreas, setScratchedAreas] = useState<Set<number>>(() => 
    revealed ? new Set(areas.map((_, i) => i)) : new Set()
  );
  const [totalPrize, setTotalPrize] = useState(0);
  
  // Derive isFullyRevealed from revealed prop or scratched state
  const isFullyRevealed = revealed || scratchedAreas.size === areas.length;

  // Build pattern lookup map with useMemo
  const patternMap = useMemo(() => {
    const map = new Map<string, PatternInfo>();
    config.patterns.forEach(p => map.set(p.id, p));
    config.special_patterns.forEach(p => map.set(p.id, { ...p, is_special: true }));
    return map;
  }, [config.patterns, config.special_patterns]);

  // Get pattern display info
  const getPatternDisplay = useCallback((patternId: string): { emoji: string; name: string; imageUrl: string } => {
    const pattern = patternMap.get(patternId);
    const emoji = DEFAULT_PATTERN_IMAGES[patternId] || '❓';
    return {
      emoji,
      name: pattern?.name || patternId,
      imageUrl: pattern?.image_url || '',
    };
  }, [patternMap]);

  // Handle area scratch
  const handleAreaScratched = useCallback((areaIndex: number) => {
    if (scratchedAreas.has(areaIndex) || disabled || isFullyRevealed) return;

    const area = areas[areaIndex];
    if (!area) return;

    const pattern = patternMap.get(area.pattern_id);
    const display = getPatternDisplay(area.pattern_id);

    // Calculate prize for this area
    let prizeAwarded = 0;
    if (area.is_special) {
      // Special pattern gives total sum of all areas
      prizeAwarded = totalPoints;
    } else if (area.is_win && pattern) {
      // Regular winning pattern gives pattern's prize points
      prizeAwarded = pattern.prize_points;
    }

    const result: PatternScratchResult = {
      areaIndex,
      patternId: area.pattern_id,
      patternName: display.name,
      patternImageUrl: display.imageUrl,
      points: area.points,
      isWin: area.is_win,
      isSpecial: area.is_special,
      prizeAwarded,
    };

    // Update state
    const newScratchedAreas = new Set(scratchedAreas);
    newScratchedAreas.add(areaIndex);
    setScratchedAreas(newScratchedAreas);

    if (prizeAwarded > 0) {
      setTotalPrize(prev => prev + prizeAwarded);
    }

    onAreaScratched?.(areaIndex, result);

    // Check if all areas are scratched
    if (newScratchedAreas.size === areas.length) {
      onAllScratched?.(totalPrize + prizeAwarded);
    }
  }, [areas, scratchedAreas, disabled, isFullyRevealed, patternMap, getPatternDisplay, totalPoints, onAreaScratched, onAllScratched, totalPrize]);

  // Calculate grid layout based on area count
  const getGridCols = () => {
    const count = areas.length;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    if (count <= 16) return 4;
    return 5;
  };

  const gridCols = getGridCols();
  const areaSize = Math.min(80, Math.floor(320 / gridCols));

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pattern Legend */}
      <div className="flex flex-wrap gap-2 justify-center text-sm">
        {config.patterns.slice(0, 4).map(p => (
          <div key={p.id} className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
            <span>{DEFAULT_PATTERN_IMAGES[p.id] || '❓'}</span>
            <span className="text-xs">{p.prize_points}分</span>
          </div>
        ))}
        {config.special_patterns.slice(0, 1).map(p => (
          <div key={p.id} className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded">
            <span>{DEFAULT_PATTERN_IMAGES[p.id] || '⭐'}</span>
            <span className="text-xs text-yellow-700">特殊</span>
          </div>
        ))}
      </div>

      {/* Scratch Grid */}
      <div 
        className="grid gap-1 p-2 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg"
        style={{ 
          gridTemplateColumns: `repeat(${gridCols}, ${areaSize}px)`,
        }}
      >
        {areas.map((area, index) => {
          const isScratched = scratchedAreas.has(index) || isFullyRevealed;
          const display = getPatternDisplay(area.pattern_id);

          return (
            <div key={index} className="relative">
              <ScratchCard
                width={areaSize}
                height={areaSize}
                coverColor="#b8860b"
                brushSize={20}
                revealThreshold={60}
                onReveal={() => handleAreaScratched(index)}
                disabled={disabled || isScratched}
              >
                <div 
                  className={`w-full h-full flex flex-col items-center justify-center text-center ${
                    area.is_special 
                      ? 'bg-gradient-to-br from-yellow-200 to-yellow-400' 
                      : area.is_win 
                        ? 'bg-gradient-to-br from-green-200 to-green-300'
                        : 'bg-white'
                  }`}
                >
                  <span className="text-2xl">{display.emoji}</span>
                  <span className="text-xs font-medium">{area.points}分</span>
                </div>
              </ScratchCard>

              {/* Win indicator */}
              {isScratched && (area.is_win || area.is_special) && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress and Prize Info */}
      <div className="flex flex-col items-center gap-2 text-sm">
        <div className="text-muted-foreground">
          已刮开: {scratchedAreas.size} / {areas.length}
        </div>
        {totalPrize > 0 && (
          <div className="text-lg font-bold text-green-600">
            🎉 已获得: {totalPrize} 积分
          </div>
        )}
        {isFullyRevealed && totalPrize === 0 && (
          <div className="text-muted-foreground">
            未中奖，再接再厉！
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isFullyRevealed && !disabled && (
        <div className="text-xs text-muted-foreground text-center">
          刮开每个区域查看图案，刮出特殊图案可获得所有区域积分总和！
        </div>
      )}
    </div>
  );
}
