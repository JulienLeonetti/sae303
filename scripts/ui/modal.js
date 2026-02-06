export class Modal {
  constructor() {
    this.overlay = null;
    this.modal = null;
    this.previousFocus = null;
  }

  init() {
    this.overlay = document.querySelector('.modal-overlay');
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'modal-overlay';
      this.overlay.setAttribute('role', 'dialog');
      this.overlay.setAttribute('aria-modal', 'true');
      this.overlay.setAttribute('aria-labelledby', 'modal-title');
      document.body.appendChild(this.overlay);
    }

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.getAttribute('data-open') === 'true') {
        this.close();
      }
    });
  }

  show(title, message, onClose = null) {
    if (!this.overlay) this.init();

    this.modal = document.createElement('div');
    this.modal.className = 'modal';
    this.modal.innerHTML = `
      <button class="modal-close" aria-label="Fermer la dialog">&times;</button>
      <h2 id="modal-title">${title}</h2>
      <p>${message}</p>
      <div class="modal-actions">
        <button class="btn btn-primary modal-btn-ok">OK</button>
      </div>
    `;

    this.overlay.innerHTML = '';
    this.overlay.appendChild(this.modal);
    this.overlay.setAttribute('data-open', 'true');

    this.previousFocus = document.activeElement;

    const closeBtn = this.modal.querySelector('.modal-close');
    const okBtn = this.modal.querySelector('.modal-btn-ok');

    closeBtn.addEventListener('click', () => this.close(onClose));
    okBtn.addEventListener('click', () => this.close(onClose));

    setTimeout(() => {
      okBtn.focus();
      this.setupFocusTrap();
    }, 100);
  }

  setupFocusTrap() {
    const focusables = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    this.modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    });
  }

  close(callback = null) {
    if (this.overlay) {
      this.overlay.setAttribute('data-open', 'false');
      setTimeout(() => {
        this.overlay.innerHTML = '';
      }, 300);
    }
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
    if (callback) callback();
  }
}

export const modal = new Modal();
modal.init();
