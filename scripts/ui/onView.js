const observerCache = new Map();

function buildObserver(options) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.seen === '1') {
        observer.unobserve(el);
        return;
      }
      el.dataset.seen = '1';
      const cb = el.__onViewOnce;
      if (typeof cb === 'function') cb();
      observer.unobserve(el);
    });
  }, options);
  return observer;
}

function observerKey(options) {
  const threshold = Array.isArray(options.threshold) ? options.threshold.join(',') : options.threshold;
  return `${threshold}|${options.rootMargin}`;
}

export function observeOnce(el, callback, opts = {}) {
  if (!el || typeof callback !== 'function') return;
  if (el.dataset.seen === '1') return;

  const options = {
    threshold: 0.25,
    rootMargin: '0px 0px -10% 0px',
    ...opts
  };

  if (!('IntersectionObserver' in window)) {
    el.dataset.seen = '1';
    callback();
    return;
  }

  el.__onViewOnce = callback;
  const key = observerKey(options);
  let observer = observerCache.get(key);
  if (!observer) {
    observer = buildObserver(options);
    observerCache.set(key, observer);
  }
  observer.observe(el);
}
