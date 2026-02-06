export function assetPrefix() {
  return location.pathname.startsWith('/pages/') || location.pathname.includes('/pages/') ? '../' : './';
}

export function slugify(teamName) {
  if (!teamName) return 'default';

  let slug = teamName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.']/g, '')
    .replace(/&/g, 'and')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const suffixesToRemove = ['fc', 'f.c', 'united', 'city', 'town', 'athletic'];
  for (const suffix of suffixesToRemove) {
    const pattern = new RegExp(`-${suffix}$|^${suffix}-|\\b${suffix}\\b`, 'i');
    slug = slug.replace(pattern, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  
  return slug;
}

function baseSlug(teamName) {
  if (!teamName) return 'default';
  return teamName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.']/g, '')
    .replace(/&/g, 'and')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const ALIASES = {
  'manchester-united': 'manchester-united',
  'manchester-city': 'manchester-city',
  'tottenham-hotspur': 'tottenham',
  'west-bromwich-albion': 'west-brom',
  'wolverhampton-wanderers': 'wolves',
  'nottingham-forest': 'forest',
  'queens-park-rangers': 'qpr',
  'sheffield-united': 'sheffield',
  'stoke-city': 'stoke-city',
  'crystal-palace': 'crystal-palace',
  'hull-city': 'hull-city',
  'brighton-and-hove-albion': 'brighton',
  'aston-villa': 'aston-villa',
  'birmingham-city': 'birmingham',
  'blackburn-rovers': 'blackburn',
  'blackpool': 'blackpool',
  'bolton-wanderers': 'bolton',
  'bournemouth': 'bournemouth',
  'afc-bournemouth': 'bournemouth',
  'cardiff-city': 'cardiff',
  'charlton-athletic': 'charlton',
  'derby-county': 'derby',
  'everton': 'everton',
  'fulham': 'fulham',
  'huddersfield-town': 'huddersfield',
  'ipswich-town': 'ipswich',
  'leeds-united': 'leeds',
  'leicester-city': 'leicester',
  'middlesbrough': 'middlesbrough',
  'norwich-city': 'norwich',
  'portsmouth': 'portsmouth',
  'reading': 'reading',
  'sheffield-wednesday': 'sheffield',
  'southampton': 'southampton',
  'sunderland': 'sunderland',
  'swansea-city': 'swansea',
  'watford': 'watford',
  'west-ham-united': 'west-ham',
  'wigan-athletic': 'wigan',
  'arsenal': 'arsenal',
  'chelsea': 'chelsea',
  'liverpool': 'liverpool',
  'newcastle-united': 'newcastle'
};

function resolveLogoCandidates(teamName) {
  const normalized = slugify(teamName);
  const preserved = baseSlug(teamName);
  const slug = ALIASES[normalized] ?? ALIASES[preserved] ?? preserved;
  const prefix = assetPrefix();

  return [
    `${prefix}assets/logo/${slug}.png`,
    `${prefix}assets/logo/${slug}.svg`,
    `${prefix}assets/logo/${slug}.webp`
  ];
}

function getDefaultLogo() {
  return `${assetPrefix()}assets/logo/default.png`;
}

const REMOTE_OVERRIDES = {
  liverpool: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
  arsenal: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
  tottenham: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
  'tottenham-hotspur': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
  'manchester-city': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  'man-city': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  'manchester-united': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  'man-utd': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  chelsea: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
  newcastle: 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
  'newcastle-united': 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg'
};

const WIKI_OVERRIDES = {
  'manchester-city': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  'manchester-united': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg'
};

const CACHE_PREFIX = 'pl_logo_cache::';

function checkImage(url, timeout = 5000) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    img.onload = () => { if (!done) { done = true; resolve(true); } };
    img.onerror = () => { if (!done) { done = true; resolve(false); } };
    img.src = url;
    setTimeout(() => { if (!done) { done = true; resolve(false); } }, timeout);
  });
}

function getCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj.expiresAt && Date.now() > obj.expiresAt) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return obj.url || null;
  } catch (e) {
    return null;
  }
}

function setCache(key, url) {
  try {
    const obj = { url, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(obj));
  } catch (e) {}
}

export async function resolveLogoUrl(teamName) {
  const slug = slugify(teamName);
  const candidates = resolveLogoCandidates(teamName);
  const localUrl = candidates[0];
  let remoteUrl = null;

  console.log('[LOGO] resolve start', teamName, 'slug=', slug, 'local=', localUrl);

  const cached = getCache(slug);
  if (cached) {
    console.log('[LOGO] cache hit', teamName, cached);
    return cached;
  }

  try {
    const okLocal = await checkImage(localUrl, 3000);
    if (okLocal) {
      setCache(slug, localUrl);
      console.log('[LOGO] local ok', teamName, localUrl);
      return localUrl;
    }
  } catch (e) {}

  const alias = ALIASES[slug] ?? slug;
  if (REMOTE_OVERRIDES[alias]) {
    remoteUrl = REMOTE_OVERRIDES[alias];
    setCache(slug, remoteUrl);
    console.log('[LOGO] remote override used', teamName, remoteUrl);
    return remoteUrl;
  }

  try {
    const searchQ = encodeURIComponent(`${teamName} F.C.`);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQ}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json();
    const first = searchJson && searchJson.query && searchJson.query.search && searchJson.query.search[0];
    let title = first && first.title ? first.title : `${teamName} F.C.`;

    const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(title)}&pithumbsize=512&format=json&origin=*`;
    const pageRes = await fetch(pageUrl);
    const pageJson = await pageRes.json();
    if (pageJson && pageJson.query && pageJson.query.pages) {
      const pages = pageJson.query.pages;
      const pageKeys = Object.keys(pages);
      if (pageKeys.length) {
        const p = pages[pageKeys[0]];
        if (p && p.thumbnail && p.thumbnail.source) {
          remoteUrl = p.thumbnail.source;
          setCache(slug, remoteUrl);
          console.log('[LOGO] mediawiki found', teamName, remoteUrl);
          return remoteUrl;
        }
      }
    }
  } catch (e) {
    console.warn('[LOGO] mediawiki lookup failed for', teamName, e && e.message);
  }

  console.log('[LOGO] not found, fallback to dataURI', teamName);
  return null;
}

function dataUriFallback(teamName) {
  const initials = (teamName || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0,2)
    .map(w => w[0] ? w[0].toUpperCase() : '')
    .join('') || 'PL';

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='100%' height='100%' fill='#334155'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='96' fill='#f1f5f9' font-family='Arial,Helvetica,sans-serif'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createLogoElement(teamName, options = {}) {
  const { size = 22, className = '' } = options;
  
  const slug = slugify(teamName);
  const preserved = baseSlug(teamName);
  const finalSlug = ALIASES[slug] ?? ALIASES[preserved] ?? preserved;
    const prefix = assetPrefix();
  const localPath = `${prefix}assets/logo/${finalSlug}.png`;
    const wikiUrl = WIKI_OVERRIDES[finalSlug] || null;
  
  console.log('[LOGO FIX]', teamName, 'slug=', slug, 'preserved=', preserved, 'local=', localPath, 'wiki=', wikiUrl || null);
  
  const img = document.createElement('img');
  img.alt = `Logo ${teamName}`;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.style.width = `${size}px`;
  img.style.height = `${size}px`;
  const baseClass = size > 30 ? 'club-logo large' : 'club-logo';
  img.className = className ? `${baseClass} ${className}` : baseClass;
  
  img.dataset.stage = 'local';
  
  img.onerror = function() {
    const currentStage = this.dataset.stage;
      console.log('[LOGO FIX] error event', teamName, 'stage=', currentStage);
    
    if (currentStage === 'local') {
        console.log('[LOGO FIX] local failed', teamName, 'trying WIKI_OVERRIDES...');
      this.dataset.stage = 'remote';
      
        if (wikiUrl) {
          console.log('[LOGO FIX] setting WIKI_OVERRIDES', teamName, wikiUrl);
          this.src = wikiUrl;
        return;
      }
      
      (async () => {
        try {
            console.log('[LOGO FIX] querying MediaWiki API', teamName);
          const wikiUrl = await resolveLogoUrl(teamName);
          if (wikiUrl) {
            const ok = await checkImage(wikiUrl, 4000);
            if (ok) {
                console.log('[LOGO FIX] remote success via MediaWiki API', teamName, wikiUrl);
              img.src = wikiUrl;
              return;
            }
          }
        } catch (e) {
            console.warn('[LOGO FIX] wikipedia lookup failed', teamName, e && e.message);
        }
        
          console.log('[LOGO FIX] all remote failed, using data-URI', teamName);
        img.dataset.stage = 'fallback';
        img.src = dataUriFallback(teamName);
      })();
      
    } else if (currentStage === 'remote') {
        console.log('[LOGO FIX] remote failed', teamName, 'using data-URI fallback');
      this.dataset.stage = 'fallback';
      this.src = dataUriFallback(teamName);
    }
  };
  
  img.src = localPath;
  
  return img;
}

export function getClubLogo(teamName) {
  const candidates = resolveLogoCandidates(teamName);
  return candidates[0] || getDefaultLogo();
}

