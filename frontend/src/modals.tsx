import React from 'react';

export function BooklyAlertModal({
  open,
  title,
  message,
  onClose,
  t
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="subscription-modal-overlay"
      onClick={onClose}
    >
      <div
        className="subscription-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="subscription-modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <span className="personal-eyebrow">
          SKEDWOO
        </span>

        <h2>{title}</h2>

        <p className="muted">
          {message.replace(/\\n/g, '\n')}
        </p>

        <button
          type="button"
          className="primary full"
          onClick={onClose}
          style={{ marginTop: 16 }}
        >
         {t('common.ok')}
        </button>
      </div>
    </div>
  );
}
export function BooklyConfirmModal({
  open,
  message,
  onCancel,
  onConfirm,
  t
}: {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="subscription-modal-overlay"
      onClick={onCancel}
    >
      <div
        className="subscription-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="subscription-modal-close"
          onClick={onCancel}
        >
          ×
        </button>

        <span className="personal-eyebrow">
          SKEDWOO
        </span>

        <p className="muted">
          {message.replace(/\\n/g, '\n')}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 16
          }}
        >
          <button
            type="button"
            onClick={onCancel}
          >
           {t('common.cancel')}
          </button>

          <button
            type="button"
            className="primary"
            onClick={onConfirm}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
