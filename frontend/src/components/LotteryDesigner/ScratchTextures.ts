// 刮刮乐纹理生成器 - 生成银箔/金箔等金属质感纹理

// 银箔纹理 Base64
export const SILVER_FOIL_TEXTURE = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <defs>
    <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e8e8e8"/>
      <stop offset="25%" style="stop-color:#d0d0d0"/>
      <stop offset="50%" style="stop-color:#c8c8c8"/>
      <stop offset="75%" style="stop-color:#d8d8d8"/>
      <stop offset="100%" style="stop-color:#e0e0e0"/>
    </linearGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" in2="noise" mode="multiply"/>
    </filter>
  </defs>
  <rect width="200" height="200" fill="url(#silverGrad)" filter="url(#noise)"/>
</svg>
`)}`;

// 金箔纹理 Base64
export const GOLD_FOIL_TEXTURE = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f5d742"/>
      <stop offset="25%" style="stop-color:#d4af37"/>
      <stop offset="50%" style="stop-color:#c9a227"/>
      <stop offset="75%" style="stop-color:#d4af37"/>
      <stop offset="100%" style="stop-color:#f5d742"/>
    </linearGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" in2="noise" mode="multiply"/>
    </filter>
  </defs>
  <rect width="200" height="200" fill="url(#goldGrad)" filter="url(#noise)"/>
</svg>
`)}`;

// 铜箔纹理 Base64
export const BRONZE_FOIL_TEXTURE = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <defs>
    <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#cd7f32"/>
      <stop offset="25%" style="stop-color:#b87333"/>
      <stop offset="50%" style="stop-color:#a56729"/>
      <stop offset="75%" style="stop-color:#b87333"/>
      <stop offset="100%" style="stop-color:#cd7f32"/>
    </linearGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" in2="noise" mode="multiply"/>
    </filter>
  </defs>
  <rect width="200" height="200" fill="url(#bronzeGrad)" filter="url(#noise)"/>
</svg>
`)}`;

// 生成金属纹理的Canvas函数
export function generateMetallicTexture(
  width: number,
  height: number,
  baseColor: string,
  highlightColor: string,
  type: 'silver' | 'gold' | 'bronze' | 'custom' = 'silver'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 基础渐变
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  
  if (type === 'silver') {
    gradient.addColorStop(0, '#e8e8e8');
    gradient.addColorStop(0.2, '#d0d0d0');
    gradient.addColorStop(0.4, '#b8b8b8');
    gradient.addColorStop(0.6, '#c8c8c8');
    gradient.addColorStop(0.8, '#d8d8d8');
    gradient.addColorStop(1, '#e0e0e0');
  } else if (type === 'gold') {
    gradient.addColorStop(0, '#f5d742');
    gradient.addColorStop(0.2, '#d4af37');
    gradient.addColorStop(0.4, '#c9a227');
    gradient.addColorStop(0.6, '#d4af37');
    gradient.addColorStop(0.8, '#e8c547');
    gradient.addColorStop(1, '#f5d742');
  } else if (type === 'bronze') {
    gradient.addColorStop(0, '#cd7f32');
    gradient.addColorStop(0.3, '#b87333');
    gradient.addColorStop(0.5, '#a56729');
    gradient.addColorStop(0.7, '#b87333');
    gradient.addColorStop(1, '#cd7f32');
  } else {
    gradient.addColorStop(0, highlightColor);
    gradient.addColorStop(0.5, baseColor);
    gradient.addColorStop(1, highlightColor);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 添加噪点纹理
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  
  ctx.putImageData(imageData, 0, 0);

  // 添加光泽条纹
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * width;
    const stripeGradient = ctx.createLinearGradient(x - 20, 0, x + 20, height);
    stripeGradient.addColorStop(0, 'transparent');
    stripeGradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    stripeGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = stripeGradient;
    ctx.fillRect(x - 20, 0, 40, height);
  }
  ctx.globalAlpha = 1;

  return canvas;
}

// 生成"刮开此处"水印文字
export function generateWatermarkText(
  width: number,
  height: number,
  text: string = '刮开此处',
  fontSize: number = 16
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 重复绘制水印
  const textWidth = ctx.measureText(text).width;
  const gap = 20;
  const cols = Math.ceil(width / (textWidth + gap)) + 1;
  const rows = Math.ceil(height / (fontSize + gap)) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * (textWidth + gap) + (row % 2 === 0 ? 0 : textWidth / 2);
      const y = row * (fontSize + gap);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-15 * Math.PI / 180);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  return canvas;
}

// 合成最终的刮刮乐覆盖层
export function generateScratchCover(
  width: number,
  height: number,
  type: 'silver' | 'gold' | 'bronze' | 'custom' = 'silver',
  customColor?: string,
  watermarkText?: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 绘制金属纹理
  const metalTexture = generateMetallicTexture(
    width, 
    height, 
    customColor || '#c0c0c0',
    customColor ? lightenColor(customColor, 30) : '#e0e0e0',
    type
  );
  ctx.drawImage(metalTexture, 0, 0);

  // 绘制水印
  if (watermarkText !== '') {
    const watermark = generateWatermarkText(width, height, watermarkText || '刮开此处');
    ctx.drawImage(watermark, 0, 0);
  }

  // 添加边框高光
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  return canvas;
}

// 辅助函数：使颜色变亮
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}
