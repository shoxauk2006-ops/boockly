import React from 'react';
import {
  Language,
  SUPPORTED_LANGUAGES,
  createTranslator,
  setStoredLanguage
} from './i18n';

type ProfileProps = {
  language: Language;
  onLanguageChange: (
    language: Language
  ) => void;
  onBack?: () => void;
};

type ProfileCopy = {
  preferences: string;
  legal: string;
  legalText: string;
  effective: string;
  terms: string;
  termsText: string;
  openTerms: string;
  privacy: string;
  privacyText: string;
  openPrivacy: string;
  contact: string;
  contactText: string;
};

export default function Profile({
  language,
  onLanguageChange,
  onBack
}: ProfileProps) {
  const t =
    createTranslator(language);

  const copy: Record<
    Language,
    ProfileCopy
  > = {
    ru: {
      preferences: 'Настройки',
      legal: 'Документы и условия',
      legalText:
        'Использование Skedwoo регулируется актуальными Условиями использования и Политикой конфиденциальности. Они применяются к сайту, кабинету аккаунта и Telegram Mini App.',
      effective:
        'Актуальная версия: 18 сентября 2026',
      terms:
        'Условия использования',
      termsText:
        'Аккаунт, бизнес, записи, подписка, платежи, допустимое использование и ответственность.',
      openTerms:
        'Открыть условия',
      privacy:
        'Политика конфиденциальности',
      privacyText:
        'Какие данные обрабатывает Skedwoo, зачем они нужны, кому передаются и как запросить удаление.',
      openPrivacy:
        'Открыть политику',
      contact: 'Контакты',
      contactText:
        'По вопросам Skedwoo, аккаунта, конфиденциальности или для сообщений о нарушениях:'
    },
    en: {
      preferences: 'Preferences',
      legal: 'Legal documents',
      legalText:
        'Use of Skedwoo is governed by the current Terms of Use and Privacy Policy. They apply to the website, account workspace and Telegram Mini App.',
      effective:
        'Current version: September 18, 2026',
      terms:
        'Terms of Use',
      termsText:
        'Accounts, businesses, bookings, subscriptions, payments, acceptable use and responsibility.',
      openTerms:
        'Open terms',
      privacy:
        'Privacy Policy',
      privacyText:
        'What data Skedwoo processes, why it is needed, who receives it and how to request deletion.',
      openPrivacy:
        'Open policy',
      contact: 'Contact',
      contactText:
        'For questions about Skedwoo, your account, privacy or to report violations:'
    },
    uz: {
      preferences: 'Sozlamalar',
      legal:
        'Hujjatlar va shartlar',
      legalText:
        'Skedwoo’dan foydalanish amaldagi Foydalanish shartlari va Maxfiylik siyosati bilan tartibga solinadi. Ular sayt, akkaunt kabineti va Telegram Mini App uchun amal qiladi.',
      effective:
        'Amaldagi versiya: 2026-yil 18-sentabr',
      terms:
        'Foydalanish shartlari',
      termsText:
        'Akkauntlar, bizneslar, bronlar, obunalar, to‘lovlar, ruxsat etilgan foydalanish va javobgarlik.',
      openTerms:
        'Shartlarni ochish',
      privacy:
        'Maxfiylik siyosati',
      privacyText:
        'Skedwoo qanday ma’lumotlarni qayta ishlashi, nima uchun kerakligi, kimga berilishi va o‘chirishni qanday so‘rash mumkinligi.',
      openPrivacy:
        'Siyosatni ochish',
      contact: 'Aloqa',
      contactText:
        'Skedwoo, akkaunt, maxfiylik yoki qoidabuzarliklar haqida savollar uchun:'
    },
    tr: {
      preferences: 'Tercihler',
      legal:
        'Belgeler ve şartlar',
      legalText:
        'Skedwoo kullanımı güncel Kullanım Şartları ve Gizlilik Politikası tarafından düzenlenir. Bunlar web sitesi, hesap çalışma alanı ve Telegram Mini App için geçerlidir.',
      effective:
        'Güncel sürüm: 18 Eylül 2026',
      terms:
        'Kullanım Şartları',
      termsText:
        'Hesaplar, işletmeler, rezervasyonlar, abonelikler, ödemeler, kabul edilebilir kullanım ve sorumluluk.',
      openTerms:
        'Şartları aç',
      privacy:
        'Gizlilik Politikası',
      privacyText:
        'Skedwoo’nin hangi verileri işlediği, neden gerekli olduğu, kimlerle paylaşıldığı ve silme talebinin nasıl yapılacağı.',
      openPrivacy:
        'Politikayı aç',
      contact: 'İletişim',
      contactText:
        'Skedwoo, hesabınız, gizlilik veya ihlal bildirimleriyle ilgili sorular için:'
    },
    ar: {
      preferences: 'التفضيلات',
      legal:
        'المستندات والشروط',
      legalText:
        'يخضع استخدام Skedwoo لشروط الاستخدام وسياسة الخصوصية الساريتين. تنطبق هذه المستندات على الموقع ومساحة الحساب وTelegram Mini App.',
      effective:
        'الإصدار الحالي: 18 سبتمبر 2026',
      terms:
        'شروط الاستخدام',
      termsText:
        'الحسابات والأنشطة والحجوزات والاشتراكات والمدفوعات والاستخدام المقبول والمسؤولية.',
      openTerms:
        'فتح الشروط',
      privacy:
        'سياسة الخصوصية',
      privacyText:
        'ما البيانات التي يعالجها Skedwoo ولماذا نحتاجها ولمن قد تُعرض وكيفية طلب حذفها.',
      openPrivacy:
        'فتح السياسة',
      contact: 'التواصل',
      contactText:
        'للاستفسارات حول Skedwoo أو الحساب أو الخصوصية أو للإبلاغ عن المخالفات:'
    }
  };

  const c = copy[language];

  return (
    <section className="profile-page">
      <style>{`
        .profile-page{padding:10px 0 110px}
        .profile-back{margin:0 0 12px!important}
        .profile-hero{display:flex;align-items:center;gap:14px;padding:20px!important;background:linear-gradient(135deg,#fff,#f7f7fb);border:1px solid #e8e9ee;box-shadow:0 10px 32px rgba(15,23,42,.06)}
        .profile-avatar{width:54px;height:54px;border-radius:17px;background:#111;color:#fff;display:grid;place-items:center;font-size:24px;font-weight:850;box-shadow:0 8px 20px rgba(17,17,17,.12)}
        .profile-hero h1{font-size:28px!important;margin:0 0 4px!important;letter-spacing:-.8px!important}
        .profile-hero p{margin:0!important;color:#7a818b!important;font-size:12px!important}
        .profile-settings,.profile-info-card{border:1px solid #e7eaee!important;box-shadow:0 8px 28px rgba(15,23,42,.045)!important}
        .profile-settings h2,.profile-info-card h2{margin:0 0 12px;font-size:18px;letter-spacing:-.4px}
        .profile-card-label{font-size:10px;font-weight:850;letter-spacing:.13em;text-transform:uppercase;color:#8b919b;margin-bottom:7px}
        .profile-rule-copy{font-size:13px;color:#6e757f;line-height:1.55;margin:0 0 13px}
        .profile-effective{margin:-4px 0 14px;color:#9aa0a8;font-size:10px;font-weight:750}
        .profile-legal-list{display:grid;gap:9px}
        .profile-legal-item{padding:13px;border:1px solid #e3e6ea;border-radius:14px;background:#fafbfc}
        .profile-legal-item strong{display:block;margin-bottom:4px;font-size:13px;color:#111}
        .profile-legal-item p{margin:0 0 10px!important;color:#757c85!important;font-size:11px!important;line-height:1.45!important}
        .profile-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
        .profile-action{display:flex!important;align-items:center;justify-content:center;text-decoration:none!important;background:#111!important;color:#fff!important;border-radius:13px!important;padding:12px 10px!important;font-size:12px;font-weight:800}
        .profile-action.secondary{background:#fff!important;color:#111!important;border:1px solid #dfe3e8!important}
        .profile-contact{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #eef0f2}
        .profile-contact span{color:#7c838d;font-size:12px}
        .profile-contact a{color:#111;text-decoration:none;font-size:12px;font-weight:800;word-break:break-word}
        @media(max-width:420px){.profile-actions{grid-template-columns:1fr}.profile-contact{display:block}.profile-contact a{display:block;margin-top:5px}}
      `}</style>

      {onBack && (
        <button
          className="back profile-back"
          onClick={onBack}
        >
          ← {t('common.back')}
        </button>
      )}

      <div className="profile-hero card">
        <div className="profile-avatar">
          S
        </div>

        <div>
          <h1>{t('nav.profile')}</h1>
          <p>Skedwoo</p>
        </div>
      </div>

      <div className="card profile-settings">
        <h2>{c.preferences}</h2>

        <div className="profile-card-label">
          Language
        </div>

        <div className="language-list">
          {SUPPORTED_LANGUAGES.map(item => {
            const active =
              item.code === language;

            return (
              <button
                key={item.code}
                className={
                  `language-option${active ? ' active' : ''}`
                }
                dir={item.dir}
                onClick={() => {
                  setStoredLanguage(
                    item.code
                  );

                  onLanguageChange(
                    item.code
                  );
                }}
              >
                <span>
                  {item.code === 'ru' && '🇷🇺 '}
                  {item.code === 'en' && '🇬🇧 '}
                  {item.code === 'uz' && '🇺🇿 '}
                  {item.code === 'tr' && '🇹🇷 '}
                  {item.code === 'ar' && '🇸🇦 '}
                  {item.nativeLabel}
                </span>

                {active && <span>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card profile-info-card">
        <div className="profile-card-label">
          Skedwoo
        </div>

        <h2>{c.legal}</h2>

        <p className="profile-rule-copy">
          {c.legalText}
        </p>

        <div className="profile-effective">
          {c.effective}
        </div>

        <div className="profile-legal-list">
          <div className="profile-legal-item">
            <strong>{c.terms}</strong>
            <p>{c.termsText}</p>

            <a
              className="profile-action"
              href="/rules.html"
              target="_blank"
              rel="noreferrer"
            >
              {c.openTerms}
            </a>
          </div>

          <div className="profile-legal-item">
            <strong>{c.privacy}</strong>
            <p>{c.privacyText}</p>

            <a
              className="profile-action secondary"
              href="/privacy.html"
              target="_blank"
              rel="noreferrer"
            >
              {c.openPrivacy}
            </a>
          </div>
        </div>
      </div>

      <div className="card profile-info-card">
        <div className="profile-card-label">
          Skedwoo
        </div>

        <h2>{c.contact}</h2>

        <p className="profile-rule-copy">
          {c.contactText}
        </p>

        <div className="profile-contact">
          <span>Email</span>

          <a href="mailto:skedwoo@gmail.com">
            skedwoo@gmail.com
          </a>
        </div>
      </div>
    </section>
  );
}
