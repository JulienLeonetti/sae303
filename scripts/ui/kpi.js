export function animateKPI(element, duration = 1500) {
  if (!element) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targetAttr = element.getAttribute('data-target') ?? element.getAttribute('data-value');
  const finalValue = Number(targetAttr) || 0;

  if (prefersReducedMotion || duration <= 0) {
    element.textContent = KPI.formatNumber(finalValue);
    return;
  }

  const startValue = 0;
  const startTime = performance.now();

  const update = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentValue = Math.floor(startValue + (finalValue - startValue) * progress);
    element.textContent = KPI.formatNumber(currentValue);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);
}

export class KPI {
  static createCountUp(element, finalValue, duration = 2000) {
    if (!element) return;
    element.setAttribute('data-target', finalValue);
    animateKPI(element, duration);
  }

  static formatNumber(num) {
    return Number(num || 0).toLocaleString('fr-FR');
  }

  static animateMultiple(container, delay = 100) {
    if (!container) return;
    const elements = container.querySelectorAll('.kpi-value');
    elements.forEach((el, index) => {
      setTimeout(() => {
        animateKPI(el, 1500);
      }, index * delay);
    });
  }
}

export const kpi = KPI;
