import { format, parseISO } from 'date-fns';

/**
 * Recurrence types
 * @type {{ id: string, label: string, labelEn: string, badge: string }[]}
 */
export const RECURRENCE_TYPES = [
  { id: 'once',    label: 'Sekali',        labelEn: 'Once',        badge: null  },
  { id: 'weekly',  label: 'Tiap Minggu',   labelEn: 'Weekly',      badge: '🔁W' },
  { id: 'monthly', label: 'Tiap Bulan',    labelEn: 'Monthly',     badge: '🔁M' },
  { id: 'yearly',  label: 'Tiap Tahun',    labelEn: 'Yearly',      badge: '🔁Y' },
];

export const getRecurrenceType = (id) =>
  RECURRENCE_TYPES.find(r => r.id === id) || RECURRENCE_TYPES[0];

/**
 * Returns true if the given event (which has a recurrenceStart date string)
 * should appear on the target date according to its recurrence rule.
 */
export function matchesRecurrence(event, targetDate) {
  if (!event.recurrenceStart || !event.recurrence || event.recurrence === 'once') return false;

  const startDate = parseISO(event.recurrenceStart);
  // Target must be on or after the start date
  if (targetDate < startDate) return false;
  // Don't double-count the original date — it's already stored in reminders[startDate]
  if (format(targetDate, 'yyyy-MM-dd') === event.recurrenceStart) return false;

  switch (event.recurrence) {
    case 'weekly':
      return targetDate.getDay() === startDate.getDay();

    case 'monthly':
      return targetDate.getDate() === startDate.getDate();

    case 'yearly':
      return (
        targetDate.getMonth() === startDate.getMonth() &&
        targetDate.getDate()  === startDate.getDate()
      );

    default:
      return false;
  }
}

/**
 * Returns all events that should appear on a given date:
 *   - direct events stored on that date
 *   - recurring events from any other origin date
 *
 * @param {Date}   targetDate
 * @param {Object} allReminders  { [dateStr]: Event[] }
 * @returns {Event[]}
 */
export function getEventsForDate(targetDate, allReminders) {
  const dateStr = format(targetDate, 'yyyy-MM-dd');

  // 1. Direct events
  const direct = allReminders[dateStr] || [];

  // 2. Recurring events from other origin dates
  const recurring = [];
  for (const [originDateStr, events] of Object.entries(allReminders)) {
    if (originDateStr === dateStr) continue; // already in direct
    for (const ev of events) {
      if (matchesRecurrence(ev, targetDate)) {
        // Clone with a virtual flag so UI can distinguish
        recurring.push({ ...ev, _recurring: true, _originDate: originDateStr });
      }
    }
  }

  return [...direct, ...recurring];
}
