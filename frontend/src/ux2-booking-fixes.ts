const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

const CANCEL_LABELS = new Set([
  'Отменить',
  'Cancel',
  'Bekor qilish',
  'İptal',
  'إلغاء'
]);

const BACK_LABELS = new Set([
  '← Назад',
  'Назад',
  '← Back',
  'Back',
  '← Orqaga',
  'Orqaga',
  '← Geri',
  'Geri',
  '← رجوع',
  'رجوع'
]);

const ADMIN_LABELS = new Set([
  'Открыть админ-панель',
  'Open admin panel',
  'Admin panelni ochish',
  'Yönetim panelini aç',
  'فتح لوحة الإدارة'
]);

const SLOT_LOADING_LABELS = new Set([
  'Загружаем свободное время...',
  'Loading available time...',
  'Bo‘sh vaqt yuklanmoqda...',
  'Uygun saatler yükleniyor...',
  'جارٍ تحميل الأوقات المتاحة...'
]);

const restoreKey = 'bookly_restore_admin_after_booking_cancel';

function buttonText(button: HTMLButtonElement) {
  return normalize(button.textContent || '');
}

function findButton(labels: Set<string>) {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find((button) => labels.has(buttonText(button))) || null;
}

function restoreAdminAfterReload() {
  if (sessionStorage.getItem(restoreKey) !== '1') return;
  sessionStorage.removeItem(restoreKey);

  let attempts = 0;
  const run = () => {
    attempts += 1;

    const adminButton = findButton(ADMIN_LABELS);
    if (adminButton) {
      adminButton.click();
      return;
    }

    const backButton = findButton(BACK_LABELS);
    if (backButton) {
      backButton.click();
    }

    if (attempts < 30) {
      window.setTimeout(run, 200);
    }
  };

  window.setTimeout(run, 250);
}

function scheduleBookingFormScroll() {
  let attempts = 0;
  const run = () => {
    attempts += 1;
    const form = document.getElementById('booking-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (attempts < 30) window.setTimeout(run, 100);
  };
  window.setTimeout(run, 50);
}

function ensureSlotSpinner() {
  const candidates = Array.from(document.querySelectorAll('p,div,span')) as HTMLElement[];
  for (const element of candidates) {
    if (element.dataset.booklySlotSpinner === '1') continue;
    const text = normalize(element.textContent || '');
    if (!SLOT_LOADING_LABELS.has(text)) continue;

    element.dataset.booklySlotSpinner = '1';
    element.classList.add('bookly-slot-loading');

    const spinner = document.createElement('span');
    spinner.className = 'bookly-slot-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    element.prepend(spinner);
  }
}

function init() {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button') as HTMLButtonElement | null;
    if (!button) return;

    const label = buttonText(button);
    if (button.closest('.booking') && CANCEL_LABELS.has(label)) {
      sessionStorage.setItem(restoreKey, '1');
      return;
    }

    if (button.classList.contains('client-service-button')) {
      scheduleBookingFormScroll();
    }
  }, true);

  const observer = new MutationObserver(() => {
    ensureSlotSpinner();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  ensureSlotSpinner();
  restoreAdminAfterReload();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
