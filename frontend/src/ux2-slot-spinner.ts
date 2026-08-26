const SLOT_LOADING_LABELS = new Set([
  'Загружаем свободное время...',
  'Loading available time...',
  'Bo‘sh vaqt yuklanmoqda...',
  'Uygun saatler yükleniyor...',
  'جارٍ تحميل الأوقات المتاحة...'
]);

const normalize = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

function ensureSlotSpinner() {
  const elements = Array.from(
    document.querySelectorAll('p,div,span')
  ) as HTMLElement[];

  for (const element of elements) {
    if (element.dataset.booklySlotSpinner === '1') continue;

    const text = normalize(
      element.textContent || ''
    );

    if (!SLOT_LOADING_LABELS.has(text)) continue;

    element.dataset.booklySlotSpinner = '1';
    element.style.display = 'inline-flex';
    element.style.alignItems = 'center';
    element.style.gap = '8px';

    const spinner = document.createElement('span');
    spinner.setAttribute('aria-hidden', 'true');
    spinner.style.display = 'inline-block';
    spinner.style.width = '14px';
    spinner.style.height = '14px';
    spinner.style.border = '2px solid #ddd';
    spinner.style.borderTopColor = '#111';
    spinner.style.borderRadius = '50%';
    spinner.style.animation =
      'bookly-slot-spinner .8s linear infinite';
    spinner.style.flexShrink = '0';

    element.prepend(spinner);
  }
}

function initSlotSpinner() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bookly-slot-spinner {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(
    ensureSlotSpinner
  );

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  ensureSlotSpinner();
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initSlotSpinner,
    { once: true }
  );
} else {
  initSlotSpinner();
}
