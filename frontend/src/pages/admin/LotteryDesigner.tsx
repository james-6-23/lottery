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
            <div className="preview-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                {previewDevice === 'desktop' && (
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                  </div>
                )}
                <span className="preview-label text-sm font-semibold text-white/70">
                  {previewDevice === 'desktop' ? '桌面端预览' : '移动端预览'}
                </span>
              </div>
              {previewDevice === 'mobile' && (
                <Smartphone className="w-4 h-4 text-white/40" />
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

        @media (max-width: 1200px) {
          .designer-content {
            grid-template-columns: 320px 1fr;
          }
        }

        @media (max-width: 1024px) {
          .designer-content {
            grid-template-columns: 1fr;
          }
          
          .designer-sidebar {
            height: auto;
            max-height: none;
            overflow: visible;
          }

          .designer-preview {
            padding: 0;
          }
        }

        .preview-container {
          transition: all 0.3s ease;
        }

        /* Desktop Preview Styles */
        .preview-container.desktop {
          width: 100%;
          min-height: 600px;
          background: rgba(30, 30, 46, 0.5); /* Semi-transparent dark bg */
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        .preview-container.desktop .preview-header {
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .preview-container.desktop .preview-content {
          flex: 1;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
          padding: 40px;
          overflow: auto;
          display: flex;
          align-items: center; /* Center vertically */
          justify-content: center; /* Center horizontally */
        }

        /* Mobile Preview Styles */
        .preview-container.mobile {
          width: 375px;
          height: 812px; /* iPhone X height */
          max-height: 85vh;
          border-radius: 40px;
          border: 12px solid #2a2a2a;
          background: #000;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden; /* Clip content to rounded corners */
        }

        .preview-container.mobile::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 30px;
          background: #2a2a2a;
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
          z-index: 20;
        }

        .preview-container.mobile .preview-header {
          padding: 40px 20px 10px; /* Space for notch */
          background: transparent;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 10;
        }

        .preview-container.mobile .preview-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #121212; /* Simulate mobile dark mode bg */
          -ms-overflow-style: none; /* Hide scrollbar IE/Edge */
          scrollbar-width: none; /* Hide scrollbar Firefox */
        }
        
        .preview-container.mobile .preview-content::-webkit-scrollbar {
          display: none; /* Hide scrollbar Chrome/Safari */
        }

        .preview-container.mobile .preview-info {
          background: rgba(30, 30, 30, 0.9);
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .preview-container.desktop .preview-info {
           background: rgba(20, 20, 30, 0.4);
           border-top: 1px solid rgba(255, 255, 255, 0.05);
           padding: 12px 24px;
           display: flex;
           justify-content: flex-end; /* Align to right or space-between */
           gap: 32px;
        }

        .info-item {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .preview-container.desktop .info-item {
          flex-direction: row;
          gap: 8px;
        }

        .info-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .info-value {
          font-size: 13px;
          font-weight: 600;
          color: #667eea;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
      `}</style>
    </div>
  );
}
