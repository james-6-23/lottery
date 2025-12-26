// 彩票设计器类型定义

// 彩票布局类型
export type LayoutType = 'grid-3x3' | 'grid-3x4' | 'grid-4x4' | 'grid-4x5' | 'custom';

// 彩票主题
export interface LotteryTheme {
  id: string;
  name: string;
  // 彩票外框
  ticketBackground: string;
  ticketBorderColor: string;
  ticketBorderStyle: 'solid' | 'dashed' | 'serrated';
  ticketShadow: string;
  // 头部区域
  headerGradient: string;
  headerTextColor: string;
  // 刮奖区域
  scratchLayerType: 'silver' | 'gold' | 'bronze' | 'custom';
  scratchLayerColor: string;
  scratchLayerTexture?: string;
  // 底层内容
  cellBackground: string;
  cellWinBackground: string;
  cellSpecialBackground: string;
  // 文字颜色
  prizeTextColor: string;
  labelTextColor: string;
}

// 预设主题
export const PRESET_THEMES: LotteryTheme[] = [
  {
    id: 'classic-gold',
    name: '经典金色',
    ticketBackground: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    ticketBorderColor: '#ffd700',
    ticketBorderStyle: 'solid',
    ticketShadow: '0 10px 40px rgba(255, 215, 0, 0.3)',
    headerGradient: 'linear-gradient(90deg, #ffd700 0%, #ffed4a 50%, #ffd700 100%)',
    headerTextColor: '#1a1a2e',
    scratchLayerType: 'gold',
    scratchLayerColor: '#d4af37',
    cellBackground: '#f8f9fa',
    cellWinBackground: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    cellSpecialBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    prizeTextColor: '#d4af37',
    labelTextColor: '#6b7280',
  },
  {
    id: 'lucky-red',
    name: '幸运红',
    ticketBackground: 'linear-gradient(135deg, #8b0000 0%, #dc143c 100%)',
    ticketBorderColor: '#ffd700',
    ticketBorderStyle: 'serrated',
    ticketShadow: '0 10px 40px rgba(220, 20, 60, 0.4)',
    headerGradient: 'linear-gradient(90deg, #ffd700 0%, #fff 50%, #ffd700 100%)',
    headerTextColor: '#8b0000',
    scratchLayerType: 'silver',
    scratchLayerColor: '#c0c0c0',
    cellBackground: '#fff5f5',
    cellWinBackground: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    cellSpecialBackground: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    prizeTextColor: '#dc143c',
    labelTextColor: '#9ca3af',
  },
  {
    id: 'ocean-blue',
    name: '海洋蓝',
    ticketBackground: 'linear-gradient(135deg, #0c3547 0%, #1e5799 100%)',
    ticketBorderColor: '#00d4ff',
    ticketBorderStyle: 'solid',
    ticketShadow: '0 10px 40px rgba(0, 212, 255, 0.3)',
    headerGradient: 'linear-gradient(90deg, #00d4ff 0%, #7c3aed 100%)',
    headerTextColor: '#ffffff',
    scratchLayerType: 'silver',
    scratchLayerColor: '#87ceeb',
    cellBackground: '#f0f9ff',
    cellWinBackground: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    cellSpecialBackground: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    prizeTextColor: '#0ea5e9',
    labelTextColor: '#64748b',
  },
  {
    id: 'neon-purple',
    name: '霓虹紫',
    ticketBackground: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    ticketBorderColor: '#a855f7',
    ticketBorderStyle: 'solid',
    ticketShadow: '0 10px 40px rgba(168, 85, 247, 0.4)',
    headerGradient: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
    headerTextColor: '#ffffff',
    scratchLayerType: 'custom',
    scratchLayerColor: '#8b5cf6',
    cellBackground: '#1e1b4b',
    cellWinBackground: 'linear-gradient(135deg, #c084fc 0%, #f472b6 100%)',
    cellSpecialBackground: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    prizeTextColor: '#c084fc',
    labelTextColor: '#a78bfa',
  },
];

// 图案/符号定义
export interface LotterySymbol {
  id: string;
  name: string;
  icon: string; // Heroicon name
  imageUrl?: string;
  prizeMultiplier: number;
  isSpecial: boolean;
  color?: string;
}

// 预设符号库
export const PRESET_SYMBOLS: LotterySymbol[] = [
  { id: 'seven', name: '幸运7', icon: 'SparklesIcon', prizeMultiplier: 10, isSpecial: false, color: '#ef4444' },
  { id: 'diamond', name: '钻石', icon: 'DiamondIcon', prizeMultiplier: 5, isSpecial: false, color: '#3b82f6' }, // Note: Diamond might not exist in outline/solid uniformly, using basic shapes or mapped later
  { id: 'star', name: '星星', icon: 'StarIcon', prizeMultiplier: 3, isSpecial: false, color: '#eab308' },
  { id: 'cherry', name: '樱桃', icon: 'HeartIcon', prizeMultiplier: 2, isSpecial: false, color: '#dc2626' }, // Fallback to Heart or similar if Cherry not exact
  { id: 'bell', name: '铃铛', icon: 'BellIcon', prizeMultiplier: 2, isSpecial: false, color: '#f59e0b' },
  { id: 'clover', name: '四叶草', icon: 'SunIcon', prizeMultiplier: 1.5, isSpecial: false, color: '#22c55e' }, // Fallback
  { id: 'coin', name: '金币', icon: 'CurrencyDollarIcon', prizeMultiplier: 1, isSpecial: false, color: '#fbbf24' },
  { id: 'crown', name: '皇冠', icon: 'TrophyIcon', prizeMultiplier: 20, isSpecial: true, color: '#fbbf24' },
  { id: 'treasure', name: '宝箱', icon: 'ArchiveBoxIcon', prizeMultiplier: 15, isSpecial: true, color: '#f59e0b' },
  { id: 'rainbow', name: '彩虹', icon: 'CloudIcon', prizeMultiplier: 0, isSpecial: true, color: '#ec4899' },
];

// 彩票配置
export interface LotteryConfig {
  // 基本信息
  name: string;
  description: string;
  price: number;
  maxPrize: number;

  // 布局设置
  layout: LayoutType;
  rows: number;
  cols: number;
  cellSize: number;
  cellGap: number;

  // 主题
  theme: LotteryTheme;

  // 符号配置
  symbols: LotterySymbol[];
  specialSymbols: LotterySymbol[];

  // 游戏规则
  winCondition: 'match-3' | 'match-any' | 'sum' | 'multiplier';
  matchCount: number;

  // 刮奖设置
  scratchBrushSize: number;
  revealThreshold: number;
  enableAutoReveal: boolean;

  // 动效设置
  enableConfetti: boolean;
  enableGlow: boolean;
  enableSound: boolean;
}

// 默认配置
export const DEFAULT_CONFIG: LotteryConfig = {
  name: '幸运刮刮乐',
  description: '刮出3个相同符号即可中奖！',
  price: 10,
  maxPrize: 10000,

  layout: 'grid-3x4',
  rows: 3,
  cols: 4,
  cellSize: 70,
  cellGap: 8,

  theme: PRESET_THEMES[0],

  symbols: PRESET_SYMBOLS.filter(s => !s.isSpecial).slice(0, 6),
  specialSymbols: PRESET_SYMBOLS.filter(s => s.isSpecial).slice(0, 2),

  winCondition: 'match-3',
  matchCount: 3,

  scratchBrushSize: 30,
  revealThreshold: 60,
  enableAutoReveal: true,

  enableConfetti: true,
  enableGlow: true,
  enableSound: false,
};

// 彩票单元格数据
export interface LotteryCell {
  index: number;
  symbol: LotterySymbol;
  points: number;
  isWin: boolean;
  isSpecial: boolean;
  isRevealed: boolean;
}

// 彩票实例数据
export interface LotteryInstance {
  id: string;
  config: LotteryConfig;
  cells: LotteryCell[];
  totalPrize: number;
  isWin: boolean;
  winningCells: number[];
  createdAt: Date;
}
