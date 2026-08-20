import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, t }) => {
  if (!isOpen) return null;

  const steps = [
    { title: t('help.step1_title'), desc: t('help.step1_desc'), icon: '🏢' },
    { title: t('help.step2_title'), desc: t('help.step2_desc'), icon: '🖼️' },
    { title: t('help.step3_title'), desc: t('help.step3_desc'), icon: '✂️' },
    { title: t('help.step4_title'), desc: t('help.step4_desc'), icon: '📅' },
    { title: t('help.step5_title'), desc: t('help.step5_desc'), icon: '🚫' },
    { title: t('help.step6_title'), desc: t('help.step6_desc'), icon: '📋' },
    { title: t('help.step7_title'), desc: t('help.step7_desc'), icon: '⭐' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card help-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{t('help.title')}</h3>
            <p className="modal-subtitle">{t('help.subtitle')}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body help-steps-container">
          {steps.map((step, idx) => (
            <div key={idx} className={`help-step-card ${idx === 6 ? 'pro-step' : ''}`}>
              <div className="help-step-icon">{step.icon}</div>
              <div className="help-step-content">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn-primary full-width" onClick={onClose}>
            {t('help.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
