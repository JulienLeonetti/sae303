export class ExportManager {
  static exportChartSVG(chart, filename) {
    if (!chart || typeof chart.getDataURL !== 'function') return;
    try {
      const svgText = chart.getDataURL({
        type: 'svg',
        pixelRatio: 2,
        backgroundColor: 'transparent'
      });
      ExportManager.downloadBlob(svgText, `${filename}.svg`, 'image/svg+xml;charset=utf-8', true);
    } catch (error) {
      console.error('SVG export failed:', error);
    }
  }

  static async exportElementAsSVG(element, filename, options = {}) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);

    const background = options.background || '#0b1020';
    const cloned = element.cloneNode(true);

    const images = Array.from(cloned.querySelectorAll('img'));
    await Promise.all(images.map(async (img) => {
      const rawSrc = img.getAttribute('src') || img.src;
      if (!rawSrc) return;
      let absoluteSrc = rawSrc;
      try {
        absoluteSrc = new URL(rawSrc, window.location.href).href;
      } catch (e) {
        absoluteSrc = rawSrc;
      }
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      try {
        const response = await fetch(absoluteSrc);
        if (!response.ok) return;
        const blob = await response.blob();
        const dataUri = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (typeof dataUri === 'string') {
          img.setAttribute('src', dataUri);
        }
      } catch (e) {}
    }));

    const wrapper = document.createElement('div');
    wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
    wrapper.style.background = background;
    wrapper.style.color = '#ffffff';
    wrapper.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    wrapper.style.fontSize = '14px';
    wrapper.style.lineHeight = '1.4';
    wrapper.style.padding = '16px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.borderRadius = '16px';

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px 12px; border-bottom: 1px solid rgba(108, 76, 255, 0.18); }
      th { text-align: left; font-weight: 600; color: #ffffff; }
      td { color: rgba(255,255,255,0.75); }
      .club-cell { display: flex; align-items: center; gap: 8px; }
      img { max-width: 22px; max-height: 22px; }
    `;
    wrapper.appendChild(style);
    wrapper.appendChild(cloned);

    const serialized = new XMLSerializer().serializeToString(wrapper);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject x="0" y="0" width="100%" height="100%">
          ${serialized}
        </foreignObject>
      </svg>
    `.trim();

    ExportManager.downloadBlob(svg, `${filename}.svg`, 'image/svg+xml;charset=utf-8');
  }

  static downloadBlob(content, filename, mime, contentIsDataUrl = false) {
    const blob = contentIsDataUrl
      ? ExportManager.dataUrlToBlob(content)
      : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}

export function exportEchartSVG(chart, filename) {
  ExportManager.exportChartSVG(chart, filename);
}
