import { useState } from 'react';
import type { LotteryConfig, LotteryTheme, LotterySymbol, LayoutType } from './types';
import { PRESET_THEMES, PRESET_SYMBOLS, DEFAULT_CONFIG } from './types';

interface DesignerPanelProps {
  config: LotteryConfig;
  onChange: (config: LotteryConfig) => void;
}

type TabType = 'basic' | 'layout' | 'theme' | 'symbols' | 'effects';

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'basic', label: '基本信息', icon: '📝' },
  { id: 'layout', label: '布局设置', icon: '📐' },
  { id: 'theme', label: '主题样式', icon: '🎨' },
  { id: 'symbols', label: '符号配置', icon: '🎰' },
  { id: 'effects', label: '特效设置', icon: '✨' },
];

const LAYOUT_OPTIONS: { value: LayoutType; label: string; rows: number; cols: number }[] = [
  { value: 'grid-3x3', label: '3×3 (9格)', rows: 3, cols: 3 },
  { value: 'grid-3x4', label: '3×4 (12格)', rows: 3, cols: 4 },
  { value: 'grid-4x4', label: '4×4 (16格)', rows: 4, cols: 4 },
  { value: 'grid-4x5', label: '4×5 (20格)', rows: 4, cols: 5 },
  { value: 'custom', label: '自定义', rows: 3, cols: 3 },
];

export function DesignerPanel({ config, onChange }: DesignerPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');

  const updateConfig = <K extends keyof LotteryConfig>(key: K, value: LotteryConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const handleLayoutChange = (layoutType: LayoutType) => {
    const layoutOption = LAYOUT_OPTIONS.find(l => l.value === layoutType);
    if (layoutOption && layoutType !== 'custom') {
      onChange({
        ...config,
        layout: layoutType,
        rows: layoutOption.rows,
        cols: layoutOption.cols,
      });
    } else {
      updateConfig('layout', layoutType);
    }
  };

  const toggleSymbol = (symbol: LotterySymbol) => {
    const isSelected = config.symbols.some(s => s.id === symbol.id);
    if (isSelected) {
      updateConfig('symbols', config.symbols.filter(s => s.id !== symbol.id));
    } else {
      updateConfig('symbols', [...config.symbols, symbol]);
    }
  };

  const toggleSpecialSymbol = (symbol: LotterySymbol) => {
    const isSelected = config.specialSymbols.some(s => s.id === symbol.id);
    if (isSelected) {
      updateConfig('specialSymbols', config.specialSymbols.filter(s => s.id !== symbol.id));
    } else {
      updateConfig('specialSymbols', [...config.specialSymbols, symbol]);
    }
  };

  const resetToDefault = () => {
    onChange(DEFAULT_CONFIG);
  };

  return (
    <div className="designer-panel">
      {/* 标签页导航 */}
      <div className="panel-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      <div className="panel-content">
        {activeTab === 'basic' && (
          <BasicTab config={config} updateConfig={updateConfig} />
        )}
        {activeTab === 'layout' && (
          <LayoutTab 
            config={config} 
            updateConfig={updateConfig}
            onLayoutChange={handleLayoutChange}
          />
        )}
        {activeTab === 'theme' && (
          <ThemeTab config={config} updateConfig={updateConfig} />
        )}
        {activeTab === 'symbols' && (
          <SymbolsTab 
            config={config}
            onToggleSymbol={toggleSymbol}
            onToggleSpecialSymbol={toggleSpecialSymbol}
          />
        )}
        {activeTab === 'effects' && (
          <EffectsTab config={config} updateConfig={updateConfig} />
        )}
      </div>

      {/* 底部操作 */}
      <div className="panel-footer">
        <button className="btn-reset" onClick={resetToDefault}>
          🔄 重置默认
        </button>
      </div>

      <style>{`
        .designer-panel {
          background: linear-gradient(180deg, #1e1e2e 0%, #2a2a3e 100%);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .panel-tabs {
          display: flex;
          background: rgba(0, 0, 0, 0.2);
          padding: 8px;
          gap: 4px;
          overflow-x: auto;
        }

        .tab-btn {
          flex: 1;
          min-width: 80px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .tab-icon {
          font-size: 18px;
        }

        .tab-label {
          font-size: 11px;
          white-space: nowrap;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .panel-footer {
          padding: 16px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: center;
        }

        .btn-reset {
          padding: 10px 24px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-reset:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        /* 通用表单样式 */
        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          transition: all 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-hint {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
        }

        .section-title {
          color: white;
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 24px 0;
        }
      `}</style>
    </div>
  );
}


// 基本信息标签页
function BasicTab({ 
  config, 
  updateConfig 
}: { 
  config: LotteryConfig; 
  updateConfig: <K extends keyof LotteryConfig>(key: K, value: LotteryConfig[K]) => void;
}) {
  return (
    <div className="basic-tab">
      <div className="form-group">
        <label className="form-label">彩票名称</label>
        <input
          type="text"
          className="form-input"
          value={config.name}
          onChange={e => updateConfig('name', e.target.value)}
          placeholder="输入彩票名称"
        />
      </div>

      <div className="form-group">
        <label className="form-label">彩票描述</label>
        <textarea
          className="form-input form-textarea"
          value={config.description}
          onChange={e => updateConfig('description', e.target.value)}
          placeholder="输入彩票描述和玩法说明"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">单价 (元)</label>
          <input
            type="number"
            className="form-input"
            value={config.price}
            onChange={e => updateConfig('price', Number(e.target.value))}
            min={1}
          />
        </div>
        <div className="form-group">
          <label className="form-label">最高奖金 (元)</label>
          <input
            type="number"
            className="form-input"
            value={config.maxPrize}
            onChange={e => updateConfig('maxPrize', Number(e.target.value))}
            min={1}
          />
        </div>
      </div>

      <div className="divider" />

      <div className="section-title">🎮 游戏规则</div>

      <div className="form-group">
        <label className="form-label">中奖条件</label>
        <select
          className="form-input"
          value={config.winCondition}
          onChange={e => updateConfig('winCondition', e.target.value as LotteryConfig['winCondition'])}
        >
          <option value="match-3">匹配相同符号</option>
          <option value="match-any">任意匹配</option>
          <option value="sum">积分累加</option>
          <option value="multiplier">倍数计算</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">需要匹配数量</label>
        <input
          type="number"
          className="form-input"
          value={config.matchCount}
          onChange={e => updateConfig('matchCount', Number(e.target.value))}
          min={2}
          max={5}
        />
        <div className="form-hint">刮出几个相同符号算中奖</div>
      </div>

      <style>{`
        .basic-tab select.form-input {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' fill-opacity='0.5' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }
      `}</style>
    </div>
  );
}

// 布局设置标签页
function LayoutTab({ 
  config, 
  updateConfig,
  onLayoutChange
}: { 
  config: LotteryConfig; 
  updateConfig: <K extends keyof LotteryConfig>(key: K, value: LotteryConfig[K]) => void;
  onLayoutChange: (layout: LayoutType) => void;
}) {
  return (
    <div className="layout-tab">
      <div className="section-title">📐 布局模板</div>
      
      <div className="layout-grid">
        {LAYOUT_OPTIONS.map(option => (
          <button
            key={option.value}
            className={`layout-option ${config.layout === option.value ? 'active' : ''}`}
            onClick={() => onLayoutChange(option.value)}
          >
            <div className="layout-preview">
              {Array.from({ length: Math.min(option.rows * option.cols, 12) }).map((_, i) => (
                <div key={i} className="preview-cell" />
              ))}
            </div>
            <span className="layout-label">{option.label}</span>
          </button>
        ))}
      </div>

      {config.layout === 'custom' && (
        <>
          <div className="divider" />
          <div className="section-title">⚙️ 自定义尺寸</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">行数</label>
              <input
                type="number"
                className="form-input"
                value={config.rows}
                onChange={e => updateConfig('rows', Number(e.target.value))}
                min={2}
                max={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">列数</label>
              <input
                type="number"
                className="form-input"
                value={config.cols}
                onChange={e => updateConfig('cols', Number(e.target.value))}
                min={2}
                max={6}
              />
            </div>
          </div>
        </>
      )}

      <div className="divider" />
      <div className="section-title">📏 单元格设置</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">单元格大小 (px)</label>
          <input
            type="range"
            className="form-range"
            value={config.cellSize}
            onChange={e => updateConfig('cellSize', Number(e.target.value))}
            min={50}
            max={100}
          />
          <div className="range-value">{config.cellSize}px</div>
        </div>
        <div className="form-group">
          <label className="form-label">单元格间距 (px)</label>
          <input
            type="range"
            className="form-range"
            value={config.cellGap}
            onChange={e => updateConfig('cellGap', Number(e.target.value))}
            min={2}
            max={16}
          />
          <div className="range-value">{config.cellGap}px</div>
        </div>
      </div>

      <style>{`
        .layout-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .layout-option {
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .layout-option:hover {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.3);
        }

        .layout-option.active {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }

        .layout-preview {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 3px;
          width: 48px;
          height: 36px;
        }

        .preview-cell {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }

        .layout-option.active .preview-cell {
          background: #667eea;
        }

        .layout-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .layout-option.active .layout-label {
          color: #667eea;
        }

        .form-range {
          width: 100%;
          height: 6px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
          appearance: none;
          cursor: pointer;
        }

        .form-range::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
        }

        .range-value {
          text-align: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}


// 主题样式标签页
function ThemeTab({ 
  config, 
  updateConfig 
}: { 
  config: LotteryConfig; 
  updateConfig: <K extends keyof LotteryConfig>(key: K, value: LotteryConfig[K]) => void;
}) {
  const [customizing, setCustomizing] = useState(false);

  const selectTheme = (theme: LotteryTheme) => {
    updateConfig('theme', theme);
    setCustomizing(false);
  };

  const updateTheme = <K extends keyof LotteryTheme>(key: K, value: LotteryTheme[K]) => {
    updateConfig('theme', { ...config.theme, [key]: value });
  };

  return (
    <div className="theme-tab">
      <div className="section-title">🎨 预设主题</div>
      
      <div className="theme-grid">
        {PRESET_THEMES.map(theme => (
          <button
            key={theme.id}
            className={`theme-card ${config.theme.id === theme.id ? 'active' : ''}`}
            onClick={() => selectTheme(theme)}
          >
            <div 
              className="theme-preview"
              style={{ background: theme.ticketBackground }}
            >
              <div 
                className="theme-header"
                style={{ background: theme.headerGradient }}
              />
              <div className="theme-cells">
                <div 
                  className="theme-cell"
                  style={{ background: theme.cellBackground }}
                />
                <div 
                  className="theme-cell win"
                  style={{ background: theme.cellWinBackground }}
                />
                <div 
                  className="theme-cell"
                  style={{ background: theme.cellBackground }}
                />
              </div>
            </div>
            <span className="theme-name">{theme.name}</span>
          </button>
        ))}
      </div>

      <div className="divider" />

      <button 
        className={`customize-btn ${customizing ? 'active' : ''}`}
        onClick={() => setCustomizing(!customizing)}
      >
        <span>🛠️ 自定义主题</span>
        <span className="arrow">{customizing ? '▲' : '▼'}</span>
      </button>

      {customizing && (
        <div className="customize-panel">
          <div className="form-group">
            <label className="form-label">刮奖层类型</label>
            <div className="scratch-type-grid">
              {(['silver', 'gold', 'bronze', 'custom'] as const).map(type => (
                <button
                  key={type}
                  className={`scratch-type-btn ${config.theme.scratchLayerType === type ? 'active' : ''}`}
                  onClick={() => updateTheme('scratchLayerType', type)}
                >
                  <div 
                    className="scratch-preview"
                    style={{ 
                      background: type === 'silver' ? '#c0c0c0' :
                                  type === 'gold' ? '#d4af37' :
                                  type === 'bronze' ? '#cd7f32' : '#8b5cf6'
                    }}
                  />
                  <span>{type === 'silver' ? '银色' : type === 'gold' ? '金色' : type === 'bronze' ? '铜色' : '自定义'}</span>
                </button>
              ))}
            </div>
          </div>

          {config.theme.scratchLayerType === 'custom' && (
            <div className="form-group">
              <label className="form-label">自定义刮奖层颜色</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={config.theme.scratchLayerColor}
                  onChange={e => updateTheme('scratchLayerColor', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input color-text"
                  value={config.theme.scratchLayerColor}
                  onChange={e => updateTheme('scratchLayerColor', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">边框样式</label>
            <select
              className="form-input"
              value={config.theme.ticketBorderStyle}
              onChange={e => updateTheme('ticketBorderStyle', e.target.value as LotteryTheme['ticketBorderStyle'])}
            >
              <option value="solid">实线</option>
              <option value="dashed">虚线</option>
              <option value="serrated">锯齿</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">边框颜色</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={config.theme.ticketBorderColor}
                  onChange={e => updateTheme('ticketBorderColor', e.target.value)}
                />
                <span className="color-value">{config.theme.ticketBorderColor}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">奖金文字颜色</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={config.theme.prizeTextColor}
                  onChange={e => updateTheme('prizeTextColor', e.target.value)}
                />
                <span className="color-value">{config.theme.prizeTextColor}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .theme-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .theme-card {
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .theme-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .theme-card.active {
          border-color: #667eea;
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
        }

        .theme-preview {
          width: 100%;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .theme-header {
          height: 16px;
        }

        .theme-cells {
          flex: 1;
          display: flex;
          gap: 4px;
          padding: 6px;
        }

        .theme-cell {
          flex: 1;
          border-radius: 4px;
        }

        .theme-name {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .theme-card.active .theme-name {
          color: #667eea;
        }

        .customize-btn {
          width: 100%;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }

        .customize-btn:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        .customize-btn.active {
          background: rgba(102, 126, 234, 0.1);
          border-color: #667eea;
          color: #667eea;
        }

        .customize-panel {
          margin-top: 16px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
        }

        .scratch-type-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .scratch-type-btn {
          padding: 10px 8px;
          background: rgba(0, 0, 0, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .scratch-type-btn:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .scratch-type-btn.active {
          border-color: #667eea;
        }

        .scratch-preview {
          width: 32px;
          height: 20px;
          border-radius: 4px;
        }

        .scratch-type-btn span {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.6);
        }

        .scratch-type-btn.active span {
          color: #667eea;
        }

        .color-input-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .color-input {
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: transparent;
        }

        .color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        .color-input::-webkit-color-swatch {
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
        }

        .color-text {
          flex: 1;
        }

        .color-value {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-family: monospace;
        }

        .theme-tab select.form-input {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' fill-opacity='0.5' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }
      `}</style>
    </div>
  );
}


// 符号配置标签页
function SymbolsTab({ 
  config,
  onToggleSymbol,
  onToggleSpecialSymbol
}: { 
  config: LotteryConfig;
  onToggleSymbol: (symbol: LotterySymbol) => void;
  onToggleSpecialSymbol: (symbol: LotterySymbol) => void;
}) {
  const normalSymbols = PRESET_SYMBOLS.filter(s => !s.isSpecial);
  const specialSymbols = PRESET_SYMBOLS.filter(s => s.isSpecial);

  return (
    <div className="symbols-tab">
      <div className="section-title">🎰 普通符号</div>
      <div className="form-hint" style={{ marginTop: '-12px', marginBottom: '12px' }}>
        选择至少3个符号用于生成彩票
      </div>
      
      <div className="symbols-grid">
        {normalSymbols.map(symbol => {
          const isSelected = config.symbols.some(s => s.id === symbol.id);
          return (
            <button
              key={symbol.id}
              className={`symbol-card ${isSelected ? 'active' : ''}`}
              onClick={() => onToggleSymbol(symbol)}
            >
              <span className="symbol-emoji">{symbol.emoji}</span>
              <span className="symbol-name">{symbol.name}</span>
              <span className="symbol-multiplier">×{symbol.prizeMultiplier}</span>
              {isSelected && <span className="check-mark">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="selected-count">
        已选择 <strong>{config.symbols.length}</strong> 个符号
      </div>

      <div className="divider" />

      <div className="section-title">⭐ 特殊符号</div>
      <div className="form-hint" style={{ marginTop: '-12px', marginBottom: '12px' }}>
        特殊符号可触发额外奖励或特殊效果
      </div>

      <div className="symbols-grid special">
        {specialSymbols.map(symbol => {
          const isSelected = config.specialSymbols.some(s => s.id === symbol.id);
          return (
            <button
              key={symbol.id}
              className={`symbol-card special ${isSelected ? 'active' : ''}`}
              onClick={() => onToggleSpecialSymbol(symbol)}
            >
              <span className="symbol-emoji">{symbol.emoji}</span>
              <span className="symbol-name">{symbol.name}</span>
              <span className="symbol-multiplier">
                {symbol.prizeMultiplier > 0 ? `×${symbol.prizeMultiplier}` : '特殊'}
              </span>
              {isSelected && <span className="check-mark">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="selected-count">
        已选择 <strong>{config.specialSymbols.length}</strong> 个特殊符号
      </div>

      <style>{`
        .symbols-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .symbols-grid.special {
          grid-template-columns: repeat(3, 1fr);
        }

        .symbol-card {
          position: relative;
          padding: 14px 10px;
          background: rgba(0, 0, 0, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .symbol-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .symbol-card.active {
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
        }

        .symbol-card.special.active {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }

        .symbol-emoji {
          font-size: 28px;
          line-height: 1;
        }

        .symbol-name {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
        }

        .symbol-multiplier {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .symbol-card.active .symbol-multiplier {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .symbol-card.special.active .symbol-multiplier {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .check-mark {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 18px;
          height: 18px;
          background: #22c55e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
        }

        .symbol-card.special .check-mark {
          background: #f59e0b;
        }

        .selected-count {
          text-align: center;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 12px;
        }

        .selected-count strong {
          color: #667eea;
        }
      `}</style>
    </div>
  );
}

// 特效设置标签页
function EffectsTab({ 
  config, 
  updateConfig 
}: { 
  config: LotteryConfig; 
  updateConfig: <K extends keyof LotteryConfig>(key: K, value: LotteryConfig[K]) => void;
}) {
  return (
    <div className="effects-tab">
      <div className="section-title">🖌️ 刮奖设置</div>

      <div className="form-group">
        <label className="form-label">画笔大小</label>
        <input
          type="range"
          className="form-range"
          value={config.scratchBrushSize}
          onChange={e => updateConfig('scratchBrushSize', Number(e.target.value))}
          min={15}
          max={60}
        />
        <div className="range-labels">
          <span>细</span>
          <span className="range-value">{config.scratchBrushSize}px</span>
          <span>粗</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">自动揭示阈值</label>
        <input
          type="range"
          className="form-range"
          value={config.revealThreshold}
          onChange={e => updateConfig('revealThreshold', Number(e.target.value))}
          min={30}
          max={90}
        />
        <div className="range-labels">
          <span>30%</span>
          <span className="range-value">{config.revealThreshold}%</span>
          <span>90%</span>
        </div>
        <div className="form-hint">刮开面积达到此比例时自动揭示全部内容</div>
      </div>

      <div className="divider" />

      <div className="section-title">✨ 视觉特效</div>

      <div className="toggle-group">
        <label className="toggle-item">
          <div className="toggle-info">
            <span className="toggle-icon">🎊</span>
            <div>
              <div className="toggle-label">中奖彩带</div>
              <div className="toggle-desc">中奖时显示彩带庆祝动画</div>
            </div>
          </div>
          <input
            type="checkbox"
            className="toggle-input"
            checked={config.enableConfetti}
            onChange={e => updateConfig('enableConfetti', e.target.checked)}
          />
          <span className="toggle-switch" />
        </label>

        <label className="toggle-item">
          <div className="toggle-info">
            <span className="toggle-icon">💫</span>
            <div>
              <div className="toggle-label">发光效果</div>
              <div className="toggle-desc">中奖格子显示发光动画</div>
            </div>
          </div>
          <input
            type="checkbox"
            className="toggle-input"
            checked={config.enableGlow}
            onChange={e => updateConfig('enableGlow', e.target.checked)}
          />
          <span className="toggle-switch" />
        </label>

        <label className="toggle-item">
          <div className="toggle-info">
            <span className="toggle-icon">🔊</span>
            <div>
              <div className="toggle-label">音效</div>
              <div className="toggle-desc">刮奖和中奖时播放音效</div>
            </div>
          </div>
          <input
            type="checkbox"
            className="toggle-input"
            checked={config.enableSound}
            onChange={e => updateConfig('enableSound', e.target.checked)}
          />
          <span className="toggle-switch" />
        </label>

        <label className="toggle-item">
          <div className="toggle-info">
            <span className="toggle-icon">🎬</span>
            <div>
              <div className="toggle-label">自动揭示</div>
              <div className="toggle-desc">达到阈值后自动揭示剩余内容</div>
            </div>
          </div>
          <input
            type="checkbox"
            className="toggle-input"
            checked={config.enableAutoReveal}
            onChange={e => updateConfig('enableAutoReveal', e.target.checked)}
          />
          <span className="toggle-switch" />
        </label>
      </div>

      <style>{`
        .effects-tab .form-range {
          width: 100%;
          height: 6px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
          appearance: none;
          cursor: pointer;
        }

        .effects-tab .form-range::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
        }

        .range-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 6px;
        }

        .range-labels .range-value {
          color: #667eea;
          font-weight: 500;
        }

        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .toggle-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-item:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        .toggle-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toggle-icon {
          font-size: 24px;
        }

        .toggle-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 2px;
        }

        .toggle-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .toggle-input {
          display: none;
        }

        .toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          transition: all 0.2s;
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .toggle-input:checked + .toggle-switch {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .toggle-input:checked + .toggle-switch::after {
          left: 22px;
        }
      `}</style>
    </div>
  );
}
