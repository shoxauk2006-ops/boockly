import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const tg = () => window.Telegram?.WebApp;

const getHeaders = () => {
  const result: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': tg()?.initData || '',
    'X-Bookly-Language': localStorage.getItem('bookly_language') || 'ru'
  };

  try {
    const businessId = localStorage.getItem('bookly_active_business_id');
    if (businessId) {
      result['X-Bookly-Business-Id'] = businessId;
    }
  } catch {}

  return result;
};

type Props = {
  services: any[];
  reload: () => Promise<void> | void;
  t: (key: string, fallback?: string) => string;
};

type Specialist = {
  id: number;
  name: string;
  position: string;
  description: string;
  photo: string;
  active: boolean;
  service_ids: number[];
  telegram_connected?: boolean;
  telegram_user_id?: number | null;
  notifications_enabled?: boolean;
  working_hours: Array<{
    id: number;
    weekday: number;
    start: string;
    end: string;
    active: boolean;
  }>;
};

const emptyForm = {
  name: '',
  position: '',
  description: '',
  photo: '',
  active: true,
  service_ids: [] as number[]
};

const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function Specialists({ services, reload, t }: Props) {
  const [items, setItems] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Specialist | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [hours, setHours] = useState<Array<{
    weekday: number;
    start: string;
    end: string;
    active: boolean;
  }>>(dayLabels.map((_, weekday) => ({
    weekday,
    start: '09:00',
    end: '18:00',
    active: weekday < 5
  })));

  const [inviteFor, setInviteFor] = useState<number | null>(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const r = await fetch(
        API + '/admin/specialists',
        { headers: getHeaders() }
      );

      if (!r.ok) {
        throw new Error(
          `${t('owner.serverError', 'Ошибка сервера')} ${r.status}`
        );
      }

      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(
        e?.message ||
        t('owner.loadError', 'Не удалось загрузить специалистов')
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setForm(emptyForm);
    setHours(
      dayLabels.map((_, weekday) => ({
        weekday,
        start: '09:00',
        end: '18:00',
        active: weekday < 5
      }))
    );
    setError('');
  };

  const startEdit = (item: Specialist) => {
    setEditing(item);
    setFormOpen(true);
    setForm({
      name: item.name || '',
      position: item.position || '',
      description: item.description || '',
      photo: item.photo || '',
      active: item.active !== false,
      service_ids: item.service_ids || []
    });

    const byDay = new Map(
      (item.working_hours || []).map(h => [h.weekday, h])
    );

    setHours(
      dayLabels.map((_, weekday) => {
        const h: any = byDay.get(weekday);

        return h
          ? {
              weekday,
              start: h.start,
              end: h.end,
              active: h.active !== false
            }
          : {
              weekday,
              start: '09:00',
              end: '18:00',
              active: false
            };
      })
    );

    setError('');
  };

  const choosePhoto = (file?: File) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () =>
      setForm(prev => ({
        ...prev,
        photo: String(reader.result || '')
      }));

    reader.readAsDataURL(file);
  };

  const save = async () => {
    const name = form.name.trim();

    if (!name) {
      setError(
        t('specialists.nameRequired', 'Укажите имя специалиста')
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = editing
        ? `${API}/admin/specialists/${editing.id}`
        : `${API}/admin/specialists`;

      const r = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...form,
          name,
          position: form.position.trim(),
          description: form.description.trim()
        })
      });

      const text = await r.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!r.ok) {
        throw new Error(
          data?.detail ||
          t('specialists.saveError', 'Не удалось сохранить специалиста')
        );
      }

      const hr = await fetch(
        `${API}/admin/specialists/${data.id}/working-hours`,
        {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(hours.filter(h => h.active))
        }
      );

      if (!hr.ok) {
        throw new Error(
          t(
            'specialists.hoursSaveError',
            'Специалист сохранён, но график не удалось сохранить'
          )
        );
      }

      setEditing(null);
      setFormOpen(false);
      setForm(emptyForm);

      await load();
      await reload();
    } catch (e: any) {
      setError(
        e?.message ||
        t('specialists.saveError', 'Не удалось сохранить специалиста')
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Specialist) => {
    if (
      !window.confirm(
        t(
          'specialists.deleteConfirm',
          `Удалить специалиста «${item.name}»?`
        )
      )
    ) {
      return;
    }

    try {
      const r = await fetch(
        `${API}/admin/specialists/${item.id}`,
        {
          method: 'DELETE',
          headers: getHeaders()
        }
      );

      if (!r.ok) {
        throw new Error(
          t('specialists.deleteError', 'Не удалось удалить специалиста')
        );
      }

      await load();
      await reload();
    } catch (e: any) {
      setError(
        e?.message ||
        t('specialists.deleteError', 'Не удалось удалить специалиста')
      );
    }
  };

  const createTelegramInvite = async (item: Specialist) => {
    setInviteLoading(true);
    setError('');
    setCopiedInvite(false);

    try {
      const r = await fetch(
        `${API}/admin/specialists/${item.id}/telegram-link`,
        {
          method: 'POST',
          headers: getHeaders()
        }
      );

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(
          data?.detail ||
          t(
            'specialists.telegramInviteError',
            'Не удалось создать ссылку для сотрудника'
          )
        );
      }

      setInviteFor(item.id);
      setInviteUrl(String(data?.telegram_url || ''));
    } catch (e: any) {
      setError(
        e?.message ||
        t(
          'specialists.telegramInviteError',
          'Не удалось создать ссылку для сотрудника'
        )
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
    } catch {
      setError(
        t(
          'specialists.copyInviteError',
          'Не удалось скопировать ссылку'
        )
      );
    }
  };

  const shareInvite = () => {
    if (!inviteUrl) return;

    const shareUrl =
      'https://t.me/share/url?url=' +
      encodeURIComponent(inviteUrl) +
      '&text=' +
      encodeURIComponent(
        t(
          'specialists.telegramInviteShareText',
          'Подключитесь к команде в Skedwoo'
        )
      );

    try {
      if (tg()?.openTelegramLink) {
        tg().openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {}
  };

  const disconnectTelegram = async (item: Specialist) => {
    if (
      !window.confirm(
        t(
          'specialists.disconnectTelegramConfirm',
          'Отключить Telegram этого сотрудника?'
        )
      )
    ) {
      return;
    }

    try {
      const r = await fetch(
        `${API}/admin/specialists/${item.id}/telegram`,
        {
          method: 'DELETE',
          headers: getHeaders()
        }
      );

      if (!r.ok) {
        const data = await r.json().catch(() => null);
        throw new Error(
          data?.detail ||
          t(
            'specialists.disconnectTelegramError',
            'Не удалось отключить Telegram'
          )
        );
      }

      if (inviteFor === item.id) {
        setInviteFor(null);
        setInviteUrl('');
      }

      await load();
    } catch (e: any) {
      setError(
        e?.message ||
        t(
          'specialists.disconnectTelegramError',
          'Не удалось отключить Telegram'
        )
      );
    }
  };

  const closeForm = () => {
    setEditing(null);
    setFormOpen(false);
    setForm(emptyForm);
    setError('');
  };

  if (loading) {
    return (
      <div className="card">
        <p className="muted">
          {t('common.loading', 'Загрузка...')}
        </p>
      </div>
    );
  }

  if (formOpen) {
    return (
      <section>
        <button className="back" onClick={closeForm}>
          ← {t('common.back', 'Назад')}
        </button>

        <div className="card">
          <h2>
            {editing
              ? t('specialists.edit', 'Редактировать специалиста')
              : t('specialists.add', 'Добавить специалиста')}
          </h2>

          <input
            placeholder={t('specialists.name', 'Имя специалиста')}
            value={form.name}
            onChange={e =>
              setForm(p => ({ ...p, name: e.target.value }))
            }
          />

          <input
            placeholder={t(
              'specialists.position',
              'Должность, например мастер'
            )}
            value={form.position}
            onChange={e =>
              setForm(p => ({
                ...p,
                position: e.target.value
              }))
            }
          />

          <textarea
            rows={3}
            placeholder={t(
              'specialists.description',
              'Краткое описание'
            )}
            value={form.description}
            onChange={e =>
              setForm(p => ({
                ...p,
                description: e.target.value
              }))
            }
          />

          <label style={{ display: 'block', marginTop: 10 }}>
            <span
              className="muted"
              style={{
                display: 'block',
                marginBottom: 8
              }}
            >
              {t('specialists.photo', 'Фото')}
            </span>

            <input
              type="file"
              accept="image/*"
              onChange={e =>
                choosePhoto(e.target.files?.[0])
              }
            />
          </label>

          {form.photo && (
            <img
              src={form.photo}
              alt={form.name}
              style={{
                width: 96,
                height: 96,
                objectFit: 'cover',
                borderRadius: 16,
                marginTop: 10
              }}
            />
          )}

          <h3 style={{ marginTop: 20 }}>
            {t('specialists.services', 'Услуги')}
          </h3>

          <p className="muted">
            {t(
              'specialists.servicesHint',
              'Выберите услуги, которые выполняет этот специалист.'
            )}
          </p>

          <div style={{ display: 'grid', gap: 8 }}>
            {services.map(service => {
              const checked =
                form.service_ids.includes(
                  Number(service.id)
                );

              return (
                <label
                  key={service.id}
                  className="card"
                  style={{
                    margin: 0,
                    padding: 12,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    boxShadow: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e =>
                      setForm(p => ({
                        ...p,
                        service_ids: e.target.checked
                          ? [
                              ...p.service_ids,
                              Number(service.id)
                            ]
                          : p.service_ids.filter(
                              id =>
                                id !== Number(service.id)
                            )
                      }))
                    }
                  />

                  <span>
                    <strong>{service.name}</strong>
                    <br />
                    <small className="muted">
                      {service.duration_min
                        ? `${service.duration_min} мин`
                        : ''}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>

          <h3 style={{ marginTop: 20 }}>
            {t(
              'specialists.schedule',
              'График специалиста'
            )}
          </h3>

          <p className="muted">
            {t(
              'specialists.scheduleHint',
              'Укажите дни и часы работы специалиста.'
            )}
          </p>

          <div
            className="card"
            style={{
              margin: 0,
              padding: 12,
              boxShadow: 'none'
            }}
          >
            {hours.map((day, index) => (
              <div
                key={day.weekday}
                style={{
                  padding: '10px 0',
                  borderBottom:
                    index < hours.length - 1
                      ? '1px solid #eee'
                      : 'none'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                  }}
                >
                  <strong>
                    {dayLabels[day.weekday]}
                  </strong>

                  <input
                    type="checkbox"
                    checked={day.active}
                    onChange={e =>
                      setHours(prev =>
                        prev.map((x, i) =>
                          i === index
                            ? {
                                ...x,
                                active:
                                  e.target.checked
                              }
                            : x
                        )
                      )
                    }
                  />
                </div>

                {day.active && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      marginTop: 8
                    }}
                  >
                    <input
                      type="time"
                      value={day.start}
                      onChange={e =>
                        setHours(prev =>
                          prev.map((x, i) =>
                            i === index
                              ? {
                                  ...x,
                                  start:
                                    e.target.value
                                }
                              : x
                          )
                        )
                      }
                    />

                    <input
                      type="time"
                      value={day.end}
                      onChange={e =>
                        setHours(prev =>
                          prev.map((x, i) =>
                            i === index
                              ? {
                                  ...x,
                                  end:
                                    e.target.value
                                }
                              : x
                          )
                        )
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              marginTop: 16
            }}
          >
            <input
              type="checkbox"
              checked={form.active}
              onChange={e =>
                setForm(p => ({
                  ...p,
                  active: e.target.checked
                }))
              }
            />

            <span>
              {t(
                'specialists.active',
                'Специалист активен'
              )}
            </span>
          </label>

          {error && (
            <div
              className="error"
              style={{ marginTop: 12 }}
            >
              ❌ {error}
            </div>
          )}

          <button
            className="primary full"
            disabled={saving}
            onClick={save}
            style={{ marginTop: 16 }}
          >
            {saving
              ? t('common.saving', 'Сохранение...')
              : t('common.save', 'Сохранить')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div>
            <h2 style={{ marginBottom: 4 }}>
              {t(
                'nav.specialists',
                'Специалисты'
              )}
            </h2>

            <p
              className="muted"
              style={{ margin: 0 }}
            >
              {t(
                'specialists.subtitle',
                'Добавляйте сотрудников, назначайте им услуги и подключайте их Telegram.'
              )}
            </p>
          </div>

          <button
            className="primary"
            onClick={startCreate}
          >
            +
          </button>
        </div>
      </div>

      {error && (
        <div
          className="error"
          style={{ marginBottom: 12 }}
        >
          ❌ {error}
        </div>
      )}

      {items.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center' }}
        >
          <div
            style={{
              fontSize: 36,
              marginBottom: 8
            }}
          >
            👤
          </div>

          <h3>
            {t(
              'specialists.emptyTitle',
              'Пока нет специалистов'
            )}
          </h3>

          <p className="muted">
            {t(
              'specialists.emptyText',
              'Добавьте первого специалиста, если клиенты должны выбирать его при записи.'
            )}
          </p>

          <button
            className="primary full"
            onClick={startCreate}
          >
            {t(
              'specialists.add',
              'Добавить специалиста'
            )}
          </button>
        </div>
      ) : (
        items.map(item => (
          <div className="card" key={item.id}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center'
              }}
            >
              {item.photo ? (
                <img
                  src={item.photo}
                  alt={item.name}
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 14
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 14,
                    background: '#f1f3f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 25
                  }}
                >
                  👤
                </div>
              )}

              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 18 }}>
                  {item.name}
                </strong>

                {item.position && (
                  <p
                    className="muted"
                    style={{
                      margin: '3px 0 0'
                    }}
                  >
                    {item.position}
                  </p>
                )}

                <small className="muted">
                  {item.active
                    ? t(
                        'specialists.active',
                        'Активен'
                      )
                    : t(
                        'specialists.inactive',
                        'Неактивен'
                      )}
                </small>
              </div>
            </div>

            {item.description && (
              <p className="muted">
                {item.description}
              </p>
            )}

            <p
              className="muted"
              style={{ marginBottom: 8 }}
            >
              {t(
                'specialists.servicesCount',
                'Услуг'
              )}
              : {item.service_ids?.length || 0}
            </p>

            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: '#f7f8fa',
                border: '1px solid #e8eaed',
                marginBottom: 12
              }}
            >
              <strong
                style={{
                  display: 'block',
                  fontSize: 13,
                  marginBottom: 4
                }}
              >
                Telegram
              </strong>

              <p
                className="muted"
                style={{
                  margin: '0 0 10px',
                  fontSize: 12
                }}
              >
                {item.telegram_connected
                  ? t(
                      'specialists.telegramConnected',
                      'Telegram сотрудника подключён. Новые записи к этому специалисту будут приходить ему лично.'
                    )
                  : t(
                      'specialists.telegramNotConnected',
                      'Подключите Telegram сотрудника, чтобы он получал свои записи и видел личный рабочий экран.'
                    )}
              </p>

              {item.telegram_connected ? (
                <button
                  onClick={() =>
                    disconnectTelegram(item)
                  }
                >
                  {t(
                    'specialists.disconnectTelegram',
                    'Отключить Telegram'
                  )}
                </button>
              ) : (
                <button
                  onClick={() =>
                    createTelegramInvite(item)
                  }
                  disabled={inviteLoading}
                >
                  {inviteLoading &&
                  inviteFor === item.id
                    ? t(
                        'common.loading',
                        'Загрузка...'
                      )
                    : t(
                        'specialists.connectTelegram',
                        'Подключить Telegram'
                      )}
                </button>
              )}

              {inviteFor === item.id &&
                inviteUrl &&
                !item.telegram_connected && (
                  <div
                    style={{
                      marginTop: 10,
                      display: 'grid',
                      gap: 8
                    }}
                  >
                    <p
                      className="muted"
                      style={{
                        margin: 0,
                        fontSize: 12
                      }}
                    >
                      {t(
                        'specialists.telegramInviteHint',
                        'Отправьте эту ссылку сотруднику. Он должен открыть её со своего Telegram.'
                      )}
                    </p>

                    <input
                      value={inviteUrl}
                      readOnly
                    />

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '1fr 1fr',
                        gap: 8
                      }}
                    >
                      <button onClick={copyInvite}>
                        {copiedInvite
                          ? t(
                              'common.copied',
                              'Скопировано'
                            )
                          : t(
                              'common.copy',
                              'Скопировать'
                            )}
                      </button>

                      <button
                        onClick={shareInvite}
                      >
                        {t(
                          'specialists.shareInvite',
                          'Поделиться'
                        )}
                      </button>
                    </div>
                  </div>
                )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8
              }}
            >
              <button
                onClick={() => startEdit(item)}
              >
                {t(
                  'common.edit',
                  'Изменить'
                )}
              </button>

              <button
                onClick={() => remove(item)}
              >
                {t(
                  'common.delete',
                  'Удалить'
                )}
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
