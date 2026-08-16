import React from 'react';
import {
  Language,
  SUPPORTED_LANGUAGES,
  createTranslator,
  setStoredLanguage,
} from './i18n';

type ProfileProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onBack?: () => void;
};

export default function Profile({
  language,
  onLanguageChange,
  onBack,
}: ProfileProps) {
  const t = createTranslator(language);

  return (
    <section className="profile-page">
      {onBack && (
        <button className="back" onClick={onBack}>
          ← {t('common.back')}
        </button>
      )}

      <div className="profile-hero card">
        <div className="profile-avatar">B</div>
        <div>
          <h1>{t('nav.profile')}</h1>
          <p className="muted">Bookly</p>
        </div>
      </div>

      <div className="card profile-settings">
        <h2>{t('language.title')}</h2>

        <div className="language-list">
          {SUPPORTED_LANGUAGES.map((item) => {
            const active = item.code === language;

            return (
              <button
                key={item.code}
                className={`language-option${active ? ' active' : ''}`}
                dir={item.dir}
                onClick={() => {
                  setStoredLanguage(item.code);
                  onLanguageChange(item.code);
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
    </section>
  );
}
