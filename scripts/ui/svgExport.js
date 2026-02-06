export function buildChartDataPayload({
  pageId,
  chartId,
  title,
  metric,
  xAxisName,
  yAxisName,
  categories,
  series
}) {
  return {
    pageId,
    chartId,
    title,
    metric,
    xAxis: { name: xAxisName, categories: categories || [] },
    yAxis: { name: yAxisName },
    series: Array.isArray(series) ? series : []
  };
}

function escapeForXml(text) {
  return String(text).replace(/&/g, '&amp;');
}

export async function downloadEChartsSVGWithData(chart, filename, payload) {
  if (!chart || typeof chart.getDataURL !== 'function') return;
  try {
    const url = chart.getDataURL({
      type: 'svg',
      pixelRatio: 2,
      backgroundColor: 'transparent'
    });
    const svgText = await fetch(url).then((r) => r.text());
    const json = escapeForXml(JSON.stringify(payload || {}));
    const withMeta = svgText.replace(
      /<svg\b([^>]*)>/,
      `<svg$1><metadata id="chart-data">${json}</metadata>`
    );
    const blob = new Blob([withMeta], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `${filename}.svg`);
  } catch (error) {
    console.error('SVG export failed:', error);
  }
}

export function exportTableSVGWithData(tableContainerEl, filename, payload, options = {}) {
  if (!tableContainerEl) return;
  const rect = tableContainerEl.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const background = options.background || '#0b1020';

  const cloned = tableContainerEl.cloneNode(true);
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

  const json = escapeForXml(JSON.stringify(payload || {}));
  const foreignObject = new XMLSerializer().serializeToString(wrapper);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <metadata id="chart-data">${json}</metadata>
  <foreignObject x="0" y="0" width="100%" height="100%">
    ${foreignObject}
  </foreignObject>
</svg>
  `.trim();

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, `${filename}.svg`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
