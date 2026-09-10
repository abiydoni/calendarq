import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EVENT_TYPES } from '../utils/eventTypes';
import { RECURRENCE_TYPES } from '../utils/recurrence';

// remindBefore value in minutes
const REMIND_OPTIONS = [
  { value: 0,     icon: '⏰', labelId: 'Saat acara',       labelEn: 'At event time' },
  { value: 30,    icon: '⏳', labelId: '30 mnt sebelum',   labelEn: '30 min before' },
  { value: 60,    icon: '⏱️', labelId: '1 jam sebelum',    labelEn: '1 hour before' },
  { value: 120,   icon: '⏱️', labelId: '2 jam sebelum',    labelEn: '2 hours before' },
  { value: 180,   icon: '⏱️', labelId: '3 jam sebelum',    labelEn: '3 hours before' },
  { value: 1440,  icon: '📅', labelId: '1 hari sebelum',   labelEn: '1 day before'  },
  { value: 2880,  icon: '📅', labelId: '2 hari sebelum',   labelEn: '2 days before' },
  { value: 10080, icon: '🗓️', labelId: '1 minggu sebelum', labelEn: '1 week before' },
];

export default function ReminderModal({ isOpen, onClose, onSave, reminderToEdit }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [title,        setTitle]        = useState('');
  const [time,         setTime]         = useState('09:00');
  const [type,         setType]         = useState('other');
  const [note,         setNote]         = useState('');
  const [recurrence,   setRecurrence]   = useState('once');
  const [remindBefore, setRemindBefore] = useState(0); // minutes before

  useEffect(() => {
    if (reminderToEdit) {
      setTitle(reminderToEdit.title);
      setTime(reminderToEdit.time || '09:00');
      setType(reminderToEdit.type || 'other');
      setNote(reminderToEdit.note || '');
      setRecurrence(reminderToEdit.recurrence || 'once');
      setRemindBefore(reminderToEdit.remindBefore ?? 0);
    } else {
      setTitle('');
      setTime('09:00');
      setType('other');
      setNote('');
      setRecurrence('once');
      setRemindBefore(0);
    }
  }, [reminderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      id:           reminderToEdit ? reminderToEdit.id : Date.now().toString(),
      title,
      time,
      type,
      note,
      recurrence,
      remindBefore, // minutes before event time
    });
  };

  const recLabels = {
    once:    t('recOnce'),
    weekly:  t('recWeekly'),
    monthly: t('recMonthly'),
    yearly:  t('recYearly'),
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{reminderToEdit ? t('editReminder') : t('addReminder')}</div>

        <form onSubmit={handleSubmit}>
          {/* ── Jenis Acara ── */}
          <div className="form-group">
            <label>{t('type')}</label>
            <div className="type-grid">
              {EVENT_TYPES.map(et => (
                <button
                  type="button"
                  key={et.id}
                  className={`type-btn ${type === et.id ? 'type-btn-active' : ''}`}
                  style={{ '--type-color': et.color }}
                  onClick={() => setType(et.id)}
                  title={lang === 'id' ? et.label : et.labelEn}
                >
                  <span className="type-icon">{et.icon}</span>
                  <span className="type-label">{lang === 'id' ? et.label : et.labelEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Judul ── */}
          <div className="form-group">
            <label>{t('title')}</label>
            <input
              type="text"
              className="form-control"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* ── Waktu ── */}
          <div className="form-group">
            <label>{t('time')}</label>
            <input
              type="time"
              className="form-control"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>

          {/* ── Pengulangan ── */}
          <div className="form-group">
            <label>{t('recurrence')}</label>
            <div className="rec-grid">
              {RECURRENCE_TYPES.map(rt => (
                <button
                  type="button"
                  key={rt.id}
                  className={`rec-btn ${recurrence === rt.id ? 'rec-btn-active' : ''}`}
                  onClick={() => setRecurrence(rt.id)}
                >
                  <span className="rec-icon">
                    {rt.id === 'once'    && '📌'}
                    {rt.id === 'weekly'  && '🔁'}
                    {rt.id === 'monthly' && '🗓️'}
                    {rt.id === 'yearly'  && '🌟'}
                  </span>
                  <span className="rec-label">{recLabels[rt.id]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Ingatkan Saya ── */}
          <div className="form-group">
            <label>{t('remindAdvance')}</label>
            <div className="remind-grid">
              {REMIND_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  className={`remind-btn ${remindBefore === opt.value ? 'remind-btn-active' : ''}`}
                  onClick={() => setRemindBefore(opt.value)}
                >
                  <span className="remind-icon">{opt.icon}</span>
                  <span className="remind-text">{lang === 'id' ? opt.labelId : opt.labelEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Catatan ── */}
          <div className="form-group">
            <label>{t('note')}</label>
            <textarea
              className="form-control"
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('optionalNote')}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn-add">{t('save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
