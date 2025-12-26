import { useState, useMemo, useCallback } from 'react';
import { DesignerPanel } from '@/components/LotteryDesigner/DesignerPanel';
import { LotteryTicket } from '@/components/LotteryDesigner/LotteryTicket';
import type { LotteryConfig, LotteryCell, LotterySymbol } from '@/components/LotteryDesigner/types';
import { DEFAULT_CONFIG } from '@/components/LotteryDesigner/types';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw, Download, Eye, EyeOff, Smartphone, Monitor, Palette } from 'lucide-react';

type PreviewDevice = 'desktop' | 'mobile';

export function AdminLotteryDesigner() {
  const [config, setConfig] = useState<LotteryConfig>(DEFAULT_CONFIG);
  const [previewMode, setPreviewMode] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  // 生成演示用的彩票单元格数据
  const generateDemoCells = useCallback((cfg: LotteryConfig): LotteryCell[] => {
    const totalCells = cfg.rows * cfg.cols;
    const allSymbols = [...cfg.symbols, ...cfg.specialSymbols];

    if (allSymbols.length === 0) {
      return Array.from({ length: totalCells }, (_, i) => ({
        index: i,
        symbol: { id: 'empty', name: '空', icon: 'QuestionMarkCircleIcon', prizeMultiplier: 0, isSpecial: false },
        points: 0,
        isWin: false,
        isSpecial: false,
        isRevealed: false,
      }));
    }

    // 随机生成单元格，确保有一定概率中奖
    const cells: LotteryCell[] = [];
    const shouldWin = Math.random() > 0.5;

    // 如果应该中奖，先放置匹配的符号
    let winSymbol: LotterySymbol | null = null;
    const winPositions: number[] = [];

    if (shouldWin && cfg.symbols.length > 0) {
      winSymbol = cfg.symbols[Math.floor(Math.random() * cfg.symbols.length)];
      // 随机选择位置放置中奖符号
      while (winPositions.length < cfg.matchCount) {
        const pos = Math.floor(Math.random() * totalCells);
        if (!winPositions.includes(pos)) {
          winPositions.push(pos);
        }
      }
    }

    // 生成所有单元格
    for (let i = 0; i < totalCells; i++) {
      let symbol: LotterySymbol;
      let isWin = false;
      let isSpecial = false;

      if (winPositions.includes(i) && winSymbol) {
        symbol = winSymbol;
        isWin = true;
      } else {
        // 随机选择符号，特殊符号概率较低
        const useSpecial = cfg.specialSymbols.length > 0 && Math.random() < 0.05;
        if (useSpecial) {
          symbol = cfg.specialSymbols[Math.floor(Math.random() * cfg.specialSymbols.length)];
          isSpecial = true;
        } else {
          symbol = cfg.symbols[Math.floor(Math.random() * cfg.symbols.length)] || allSymbols[0];
        }
      }

      const points = Math.floor(Math.random() * 100) + 10;

      cells.push({
        index: i,
        symbol,
        points,
        isWin,
        isSpecial,
        isRevealed: false,
      });
    }

    return cells;
  }, []);

  const demoCells = useMemo(() => generateDemoCells(config), [config, refreshKey, generateDemoCells]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSave = () => {
    // TODO: 保存配置到后端
    console.log('保存配置:', config);
    alert('配置已保存（演示）');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lottery-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="lottery-designer-page">
      {/* 顶部工具栏 */}
      <div className="designer-toolbar">
        <div className="toolbar-left">
          <h1 className="page-title flex items-center gap-2"><Palette className="w-6 h-6" /> 彩票设计器</h1>
          <span className="page-subtitle">可视化设计刮刮乐彩票</span>
        </div>
        <div className="toolbar-right">
          <div className="device-toggle">
            <button
              className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
              onClick={() => setPreviewDevice('desktop')}
              title="桌面预览"
            >
              <Monitor size={18} />
            </button>
            <button
              className={`device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
              onClick={() => setPreviewDevice('mobile')}
              title="移动端预览"
            >
              <Smartphone size={18} />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="ml-2">{previewMode ? '隐藏内容' : '显示内容'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw size={16} />
            <span className="ml-2">刷新预览</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} />
            <span className="ml-2">导出配置</span>
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save size={16} />
            <span className="ml-2">保存</span>
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="designer-content">
        {/* 左侧设计面板 */}
        <div className="designer-sidebar">
          <DesignerPanel config={config} onChange={setConfig} />
        </div>

        {/* 右侧预览区 */}
        <div className="designer-preview">
          <div className={`preview-container ${previewDevice}`}>
            <div className="preview-header">
              <span className="preview-label">实时预览</span>
              {previewDevice === 'mobile' && (
                <span className="device-label flex items-center gap-1"><Smartphone className="w-3 h-3" /> 移动端视图</span>
              )}
            </div>
            <div className="preview-content">
              <LotteryTicket
                key={refreshKey}
                config={config}
                cells={demoCells}
                ticketNumber={`DEMO-${String(refreshKey + 1).padStart(3, '0')}`}
                previewMode={previewMode}
                disabled={previewMode} // If hiding content, scratch might also be disabled or reset
                interactive={true} // Enable scratching in preview
              />
            </div>
            <div className="preview-info">
              <div className="info-item">
                <span className="info-label">布局</span>
                <span className="info-value">{config.rows}×{config.cols}</span>
              </div>
              <div className="info-item">
                <span className="info-label">符号数</span>
                <span className="info-value">{config.symbols.length + config.specialSymbols.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">单价</span>
                <span className="info-value">{config.price}积分</span>
              </div>
              <div className="info-item">
                <span className="info-label">最高奖</span>
                <span className="info-value">{config.maxPrize}积分</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lottery-designer-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
        }

        .designer-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .toolbar-left {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .page-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .device-toggle {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 4px;
          gap: 4px;
        }

        .device-btn {
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .device-btn:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        .device-btn.active {
          background: rgba(102, 126, 234, 0.3);
          color: #667eea;
        }

        .designer-content {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 24px;
          padding: 24px;
          min-height: calc(100vh - 73px);
        }

        .designer-sidebar {
          height: calc(100vh - 121px);
          overflow: hidden;
        }

        .designer-preview {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 20px;
        }

        .preview-container {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          transition: all 0.3s;
        }

        .preview-container.mobile {
          max-width: 400px;
          border-radius: 32px;
          border: 8px solid #333;
          background: #1a1a1a;
          position: relative;
        }

        .preview-container.mobile::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 6px;
          background: #333;
          border-radius: 3px;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .preview-label {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
        }

        .device-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .preview-content {
          display: flex;
          justify-content: center;
          padding: 20px 0;
        }

        .preview-info {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-item {
          text-align: center;
        }

        .info-label {
          display: block;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 4px;
        }

        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #667eea;
        }

        @media (max-width: 1200px) {
          .designer-content {
            grid-template-columns: 1fr;
          }

          .designer-sidebar {
            height: auto;
            max-height: 500px;
          }
        }

        @media (max-width: 768px) {
          .designer-toolbar {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }

          .toolbar-right {
            flex-wrap: wrap;
            width: 100%;
          }

          .preview-info {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
