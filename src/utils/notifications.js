import { matchesRecurrence } from './recurrence';
import i18n from '../i18n';

export const setupNotifications = (getReminders) => {
  const firedKeys = new Set();

  const checkReminders = () => {
    const raw = getReminders();
    if (!raw) return;

    // Normalize to reminders map { [dateStr]: Event[] }
    let remindersMap = {};
    if (Array.isArray(raw)) {
      raw.forEach(r => {
        const d = r.date || 'unknown';
        if (!remindersMap[d]) remindersMap[d] = [];
        remindersMap[d].push(r);
      });
    } else if (typeof raw === 'object') {
      remindersMap = raw;
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');

    for (const [originDateStr, eventList] of Object.entries(remindersMap)) {
      if (!Array.isArray(eventList)) continue;
      for (const reminder of eventList) {
        if (!reminder.time) continue;

        const remindBefore = reminder.remindBefore ?? 0; // minutes before

        // Calculate what event time would fire right now: targetDt = now + remindBefore minutes
        const targetDt = new Date(now.getTime() + remindBefore * 60 * 1000);
        const targetDateStr = `${targetDt.getFullYear()}-${pad(targetDt.getMonth() + 1)}-${pad(targetDt.getDate())}`;
        const targetTimeStr = `${pad(targetDt.getHours())}:${pad(targetDt.getMinutes())}`;

        // Quick check: does the reminder time match the target time?
        if (reminder.time !== targetTimeStr) continue;

        // Check if event occurs on target date
        let occurs = false;
        if (!reminder.recurrence || reminder.recurrence === 'once') {
          occurs = (originDateStr === targetDateStr);
        } else {
          occurs = (originDateStr === targetDateStr) ||
            matchesRecurrence({ ...reminder, recurrenceStart: reminder.recurrenceStart || originDateStr }, targetDt);
        }

        if (!occurs) continue;

        // Deduplication key
        const fireKey = `${reminder.id}_${targetDateStr}_${targetTimeStr}_${remindBefore}`;
        if (firedKeys.has(fireKey)) continue;
        firedKeys.add(fireKey);

        if (firedKeys.size > 200) {
          const oldest = firedKeys.values().next().value;
          firedKeys.delete(oldest);
        }

        // Notification text
        const lang = i18n?.language || 'id';
        let body = '';

        if (remindBefore === 0) {
          body = lang === 'id'
            ? `${reminder.title} — sekarang! (${reminder.time})`
            : `${reminder.title} — now! (${reminder.time})`;
        } else if (remindBefore < 60) {
          body = lang === 'id'
            ? `${reminder.title} — ${remindBefore} menit lagi (${reminder.time})`
            : `${reminder.title} — in ${remindBefore} minutes (${reminder.time})`;
        } else if (remindBefore < 1440) {
          const hours = Math.round(remindBefore / 60);
          body = lang === 'id'
            ? `${reminder.title} — ${hours} jam lagi (${reminder.time})`
            : `${reminder.title} — in ${hours} hour${hours > 1 ? 's' : ''} (${reminder.time})`;
        } else if (remindBefore < 10080) {
          const days = Math.round(remindBefore / 1440);
          body = lang === 'id'
            ? `${reminder.title} — ${days} hari lagi (${reminder.time})`
            : `${reminder.title} — in ${days} day${days > 1 ? 's' : ''} (${reminder.time})`;
        } else {
          const weeks = Math.round(remindBefore / 10080);
          body = lang === 'id'
            ? `${reminder.title} — ${weeks} minggu lagi (${reminder.time})`
            : `${reminder.title} — in ${weeks} week${weeks > 1 ? 's' : ''} (${reminder.time})`;
        }

        const title = `🔔 ${reminder.title}`;

        if (window.electronAPI?.showNotification) {
          window.electronAPI.showNotification(title, body);
        } else if (Notification?.permission === 'granted') {
          new Notification(title, { body });
        } else if (Notification && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body });
            }
          });
        }

        // Dispatch internal event for the In-App Alarm Modal
        const alarmEvent = new CustomEvent('alarm-trigger', {
          detail: {
            reminder,
            title,
            body,
            remindBefore
          }
        });
        window.dispatchEvent(alarmEvent);
      }
    }
  };

  // Run immediately and then every 20 seconds
  checkReminders();
  const interval = setInterval(checkReminders, 20000);

  return () => clearInterval(interval);
};
