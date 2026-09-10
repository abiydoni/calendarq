import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { FiTrash2, FiEdit2, FiPlus, FiX } from 'react-icons/fi';
import { getEventType } from '../utils/eventTypes';
import { getRecurrenceType } from '../utils/recurrence';

export default function DayDetailsModal({ isOpen, date, reminders, onClose, onAdd, onEdit, onDelete, onEditFromOrigin }) {
  const { t, i18n } = useTranslation();
  if (!isOpen || !date) return null;

  const months   = t('months', { returnObjects: true });
  const dayLabel = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  const lang     = i18n.language;

  const recBadgeKey = {
    weekly:  'recBadgeWeekly',
    monthly: 'recBadgeMonthly',
    yearly:  'recBadgeYearly',
  };

  const getRemindLabel = (remindBefore) => {
    switch (remindBefore) {
      case 0:
        return lang === 'id' ? 'Saat acara' : 'At event';
      case 30:
        return lang === 'id' ? '30 mnt sblm' : '30m before';
      case 60:
        return lang === 'id' ? '1 jam sblm' : '1h before';
      case 120:
        return lang === 'id' ? '2 jam sblm' : '2h before';
      case 180:
        return lang === 'id' ? '3 jam sblm' : '3h before';
      case 1440:
        return lang === 'id' ? '1 hari sblm' : '1d before';
      case 2880:
        return lang === 'id' ? '2 hari sblm' : '2d before';
      case 10080:
        return lang === 'id' ? '1 mgg sblm' : '1w before';
      default:
        if (!remindBefore) return lang === 'id' ? 'Saat acara' : 'At event';
        if (remindBefore < 60) return `${remindBefore}m ${lang === 'id' ? 'sblm' : 'before'}`;
        if (remindBefore < 1440) return `${Math.round(remindBefore / 60)}j ${lang === 'id' ? 'sblm' : 'before'}`;
        return `${Math.round(remindBefore / 1440)}h ${lang === 'id' ? 'sblm' : 'before'}`;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content day-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="day-detail-header">
          <div className="modal-title">📅 {dayLabel}</div>
          <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>

        <div className="day-detail-list">
          {reminders.length === 0 ? (
            <div className="empty-state">{t('noReminders')}</div>
          ) : (
            reminders.map(r => {
              const et  = getEventType(r.type);
              const rt  = getRecurrenceType(r.recurrence);
              const typeLabel = lang === 'id' ? et.label : et.labelEn;
              const isRecurring = rt && rt.id !== 'once';

              return (
                <div className="detail-item" key={r.id + (r._originDate || '')} style={{ '--ev-color': et.color }}>
                  <div className="detail-icon">{et.icon}</div>
                  <div className="detail-info">
                    <div className="detail-title">
                      {r.title}
                      {isRecurring && (
                        <span className="rec-pill" title={t(recBadgeKey[rt.id] || 'recOnce')}>
                          {rt.id === 'weekly'  && ' 🔁W'}
                          {rt.id === 'monthly' && ' 🔁M'}
                          {rt.id === 'yearly'  && ' 🔁Y'}
                        </span>
                      )}
                    </div>
                    <div className="detail-meta">
                      <span className="detail-type-badge" style={{ background: et.color + '30', color: et.color }}>
                        {typeLabel}
                      </span>
                      {r.time && <span className="detail-time">⏰ {r.time}</span>}
                      {r.time && (
                        <span className="detail-remind-badge" title={lang === 'id' ? 'Waktu Pengingat' : 'Reminder Time'}>
                          🔔 {getRemindLabel(r.remindBefore ?? 0)}
                        </span>
                      )}
                      {isRecurring && (
                        <span className="detail-rec-badge">
                          {lang === 'id' ? rt.label : rt.labelEn}
                        </span>
                      )}
                    </div>
                    {r.note && <div className="detail-note">{r.note}</div>}
                    {/* Origin date label for recurring instances */}
                    {r._recurring && r._originDate && (
                      <div className="detail-origin">
                        🔁 dari {r._originDate}
                      </div>
                    )}
                  </div>
                  {/* Edit/Delete actions */}
                  <div className="reminder-actions">
                    {r._recurring ? (
                      /* For recurring instances: only delete the whole series (go to origin) */
                      <button
                        className="btn-icon"
                        title={`Edit di asal: ${r._originDate}`}
                        onClick={() => onEditFromOrigin(r)}
                      >
                        <FiEdit2 />
                      </button>
                    ) : (
                      <button className="btn-icon" onClick={() => onEdit(r)} title={t('editReminder')}>
                        <FiEdit2 />
                      </button>
                    )}
                    <button className="btn-icon danger" onClick={() => onDelete(r.id, r._originDate)} title={t('delete')}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button className="btn-add btn-add-full" onClick={onAdd}>
          <FiPlus /> {t('addReminder')}
        </button>
      </div>
    </div>
  );
}
