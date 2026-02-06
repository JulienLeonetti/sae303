export class Header {
  static init() {
    this.renderLogo();
    this.setupBurger();
    this.setupNavigation();
    this.setupScrollTop();
  }

  static renderLogo() {
    const logoAnchor = document.querySelector('a.logo');
    if (!logoAnchor) return;

    const prefix = location.pathname.includes('/pages/') ? '../' : './';

    const logoImg = document.createElement('img');
    logoImg.src = prefix + 'assets/pl-logo.png';
    logoImg.alt = 'Premier League';
    logoImg.className = 'pl-logo';

    logoAnchor.innerHTML = '';
    logoAnchor.href = prefix + 'index.html';
    logoAnchor.appendChild(logoImg);
  }

  static setupBurger() {
    const burger = document.querySelector('.burger-btn');
    const nav = document.querySelector('nav');

    if (!burger || !nav) return;

    burger.addEventListener('click', () => {
      const isOpen = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', !isOpen);
      nav.setAttribute('data-open', !isOpen);
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        burger.setAttribute('aria-expanded', 'false');
        nav.setAttribute('data-open', 'false');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        burger.setAttribute('aria-expanded', 'false');
        nav.setAttribute('data-open', 'false');
      }
    });
  }

  static setupNavigation() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      const isActive =
        (href === '/' && currentPath === '/') ||
        (href !== '/' && currentPath.includes(href));
      
      if (isActive) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  static setActive(href) {
    document.querySelectorAll('nav a').forEach(link => {
      link.classList.remove('active');
    });
    const link = document.querySelector(`nav a[href="${href}"]`);
    if (link) link.classList.add('active');
  }

  static setupScrollTop() {
    if (document.getElementById('backToTop')) return;
    const button = document.createElement('button');
    button.id = 'backToTop';
    button.className = 'back-to-top';
    button.type = 'button';
    button.setAttribute('aria-label', 'Remonter en haut de la page');
    button.setAttribute('title', 'Remonter en haut de la page');
    button.dataset.visible = 'false';
    button.innerHTML = `
      <svg class="back-to-top__icon" width="44" height="44" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3l-8 8h5v10h6V11h5z" fill="white"/>
      </svg>
    `;
    document.body.appendChild(button);

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onScroll = () => {
      button.dataset.visible = window.scrollY > 300 ? 'true' : 'false';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    button.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: reduceMotionQuery.matches ? 'auto' : 'smooth'
      });
    });
  }
}

export const header = Header;
