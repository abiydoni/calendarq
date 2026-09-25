import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  format, addMonths, subMonths, startOfMonth,
  endOfMonth, startOfWeek, endOfWeek, isSameMonth,
  isSameDay, addDays
} from 'date-fns';
import { FiChevronLeft, FiChevronRight, FiSettings, FiInfo } from 'react-icons/fi';
import ReminderModal from './components/ReminderModal';
import DayDetailsModal from './components/DayDetailsModal';
import SettingsModal from './components/SettingsModal';
import AboutModal from './components/AboutModal';
import LicenseModal from './components/LicenseModal';
import OnboardingModal from './components/OnboardingModal';
import TrialBanner from './components/TrialBanner';
import AlarmModal from './components/AlarmModal';
import { setupNotifications } from './utils/notifications';
import { getEventType } from './utils/eventTypes';
import { getEventsForDate } from './utils/recurrence';
import {
  syncOfficialHolidays,
  getHolidayForDate,
  getMonthHolidays,
  getInitialHolidaysForYear
} from './utils/holidays';

function App() {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [reminders, setReminders]       = useState({});
  const [isLocked, setIsLocked]         = useState(false);
  const [currentSize, setCurrentSize]   = useState('medium');

  const [isAddModalOpen, setIsAddModalOpen]           = useState(false);
  const [editingReminder, setEditingReminder]         = useState(null);
  const [isDayDetailOpen, setIsDayDetailOpen]         = useState(false);
  const [isSettingsOpen, setIsSettingsOpen]           = useState(false);
  const [isAboutOpen, setIsAboutOpen]                 = useState(false);
  const [isLicenseOpen, setIsLicenseOpen]             = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen]       = useState(false);
  const [selectedDate, setSelectedDate]               = useState(null);
  const [currentTime, setCurrentTime]                 = useState(new Date());
  // licenseStatus: null (loading) | { status: 'trial'|'active'|'expired', daysLeft, key }
  const [licenseStatus, setLicenseStatus]             = useState(null);
  const [licenseKey, setLicenseKey]                   = useState(null);
  const [holidaysData, setHolidaysData]               = useState(() => {
    const y = new Date().getFullYear();
    return { [y]: getInitialHolidaysForYear(y) };
  });
  const [systemSettings, setSystemSettings]           = useState({});

  // Double-click detection
  const clickTimerRef = useRef(null);
  const isExpiredRef = useRef(false);
  // Guard: do not save before first load completes
  const isLoadedRef = useRef(false);
  const contentRef = useRef(null);
  const lastSizeRef = useRef({ w: 0, h: 0 });

  const adjustWindowHeight = useCallback(() => {
    if (!window.electronAPI?.resizeWindow || !contentRef.current) return;

    let w = 360;
    let minH = 460;
    if (currentSize === 'small') { w = 325; minH = 410; }
    else if (currentSize === 'large') { w = 420; minH = 520; }

    const contentH = contentRef.current.offsetHeight || contentRef.current.scrollHeight;
    
    // When any modal is open, ensure ample room for modal dialogs
    const isModalOpen = isAddModalOpen || isDayDetailOpen || isSettingsOpen || isAboutOpen || isLicenseOpen || isOnboardingOpen;
    const modalMinH = currentSize === 'small' ? 490 : (currentSize === 'large' ? 590 : 540);

    const neededH = isModalOpen ? Math.max(contentH, modalMinH) : contentH;
    const finalH = Math.max(minH, Math.ceil(neededH) + 4);

    if (lastSizeRef.current.w === w && Math.abs(lastSizeRef.current.h - finalH) < 2) {
      return;
    }

    lastSizeRef.current = { w, h: finalH };
    window.electronAPI.resizeWindow(w, finalH);
  }, [currentSize, isAddModalOpen, isDayDetailOpen, isSettingsOpen, isAboutOpen, isLicenseOpen, isOnboardingOpen]);

  // Adjust height on state changes
  useEffect(() => {
    adjustWindowHeight();
  }, [adjustWindowHeight, currentDate, reminders, holidaysData]);

  // Auto-resize on content dimension change
  useEffect(() => {
    if (!contentRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      adjustWindowHeight();
    });
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [adjustWindowHeight]);

  // Ticks every 10 seconds to update live event animations & expiration
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Sync official holidays when year changes (online API + local cache)
  useEffect(() => {
    const year = currentDate.getFullYear();
    // Pre-load initial data immediately
    if (!holidaysData[year]) {
      setHolidaysData(prev => ({ ...prev, [year]: getInitialHolidaysForYear(year) }));
    }
    // Then try to sync from online source
    syncOfficialHolidays(year).then(data => {
      if (data && Object.keys(data).length > 0) {
        setHolidaysData(prev => ({ ...prev, [year]: data }));
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate.getFullYear()]);

  /* ──────────────────── Data load / save ──────────────────── */
  useEffect(() => {
    const loadData = async () => {
      if (window.electronAPI?.storeGet) {
        const savedReminders = await window.electronAPI.storeGet('calendarq_reminders');
        if (savedReminders) setReminders(savedReminders);

        const savedLang = await window.electronAPI.storeGet('calendarq_lang');
        if (savedLang) i18n.changeLanguage(savedLang);

        const savedLock = await window.electronAPI.storeGet('calendarq_locked');
        if (savedLock != null) setIsLocked(savedLock);
        
        const savedSize = await window.electronAPI.storeGet('calendarq_size');
        const activeSize = savedSize || 'medium';
        setCurrentSize(activeSize);
        let w = 360, h = 620;
        if (activeSize === 'small') { w = 325; h = 540; }
        else if (activeSize === 'large') { w = 420; h = 710; }
        window.electronAPI?.resizeWindow(w, h);
      } else {
        const saved = localStorage.getItem('calendarq_reminders');
        if (saved) setReminders(JSON.parse(saved));
      }
      
      // ── System Settings ──
      if (window.electronAPI?.fetchSystemSettings) {
        const settings = await window.electronAPI.fetchSystemSettings();
        if (settings) setSystemSettings(settings);
      }

      isLoadedRef.current = true;

      // ── License check ──
      if (window.electronAPI?.licenseCheck) {
        const status = await window.electronAPI.licenseCheck();
        setLicenseStatus(status);
        setLicenseKey(status?.key || null);
        // Auto-open onboarding if email unregistered
        if (status?.status === 'unregistered') {
          setIsOnboardingOpen(true);
        } else if (status?.status === 'expired') {
          setIsLicenseOpen(true);
        }
      }
    };
    loadData();
  }, [i18n]);

  useEffect(() => {
    isExpiredRef.current = licenseStatus?.status === 'expired';
  }, [licenseStatus]);

  /* ── Listen for heartbeat license revocation ── */
  useEffect(() => {
    if (!window.electronAPI?.onLicenseStatusChanged) return;
    const remove = window.electronAPI.onLicenseStatusChanged((status) => {
      setLicenseStatus(status);
      setLicenseKey(status?.key || null);
      if (status?.status === 'expired') {
        setIsLicenseOpen(true);
      }
    });
    return () => { if (typeof remove === 'function') remove(); };
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return; // skip save until initial load is done
    if (window.electronAPI?.storeSet) {
      window.electronAPI.storeSet('calendarq_reminders', reminders);
    } else {
      localStorage.setItem('calendarq_reminders', JSON.stringify(reminders));
    }
  }, [reminders]);

  /* ──────────────────── Notifications ──────────────────── */
  useEffect(() => {
    return setupNotifications(() => reminders);
  }, [reminders]);

  /* ──────────────────── Context menu (Right-click) ──────────────────── */
  useEffect(() => {
    if (!window.electronAPI?.onContextMenuCommand) return;
    const removeCtx = window.electronAPI.onContextMenuCommand((command) => {
      if (command === 'toggle-lock') {
        setIsLocked(prev => {
          const next = !prev;
          window.electronAPI.storeSet('calendarq_locked', next);
          return next;
        });
      }
    });

    const removeDateCtx = window.electronAPI.onDateContextCommand?.(({ command, dateStr }) => {
      if (isExpiredRef.current) {
        setIsLicenseOpen(true);
        return;
      }
      if (command === 'add-event') {
        // parseISO doesn't work perfectly for local 'YYYY-MM-DD', so manual parse:
        const [y, m, d] = dateStr.split('-');
        setSelectedDate(new Date(y, m - 1, d));
        setEditingReminder(null);
        setIsAddModalOpen(true);
      }
    });

    return () => {
      if (typeof removeCtx === 'function') removeCtx();
      if (typeof removeDateCtx === 'function') removeDateCtx();
    };
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    if (isExpiredRef.current) {
      setIsLicenseOpen(true);
      return;
    }
    if (window.electronAPI?.showContextMenu) {
      window.electronAPI.showContextMenu(isLocked);
    }
  }, [isLocked]);

  // Manual drag — only works when NOT locked
  const handleDragStart = useCallback((e) => {
    // Only left mouse button, ignore if locked
    if (e.button !== 0 || isLocked) return;
    // Ignore drags starting on interactive elements
    const tag = e.target.tagName.toLowerCase();
    if (['button', 'input', 'select', 'textarea', 'a'].includes(tag)) return;

    e.preventDefault();
    let lastX = e.screenX;
    let lastY = e.screenY;

    const onMove = (moveEvent) => {
      const dx = moveEvent.screenX - lastX;
      const dy = moveEvent.screenY - lastY;
      lastX = moveEvent.screenX;
      lastY = moveEvent.screenY;
      if (dx !== 0 || dy !== 0) {
        window.electronAPI?.moveWindow?.(dx, dy);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [isLocked]);


  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'id' : 'en';
    i18n.changeLanguage(newLang);
    window.electronAPI?.storeSet('calendarq_lang', newLang);
  };

  const handleChangeSize = (sizeId) => {
    setCurrentSize(sizeId);
    window.electronAPI?.storeSet('calendarq_size', sizeId);
    
    let w = 360, h = 620;
    if (sizeId === 'small') { w = 325; h = 540; }
    else if (sizeId === 'large') { w = 420; h = 710; }
    window.electronAPI?.resizeWindow(w, h);
  };

  const toggleLock = () => {
    setIsLocked(prev => {
      const next = !prev;
      window.electronAPI?.storeSet('calendarq_locked', next);
      return next;
    });
  };

  /* ──────────────────── Navigation ──────────────────── */
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  /* ──────────────────── Date click / double-click ──────────────────── */
  const handleDateClick = (day) => {
    if (isExpiredRef.current) {
      setIsLicenseOpen(true);
      return;
    }
    if (clickTimerRef.current) {
      // Second click → double click
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setSelectedDate(day);
      setIsDayDetailOpen(true);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        setSelectedDate(day);
      }, 260);
    }
  };

  /* ──────────────────── Reminder CRUD ──────────────────── */
  const handleSaveReminder = (reminder) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setReminders(prev => {
      const dayArr = prev[dateStr] || [];
      let updated;
      if (editingReminder) {
        updated = dayArr.map(r => r.id === reminder.id ? { ...reminder, recurrenceStart: r.recurrenceStart || dateStr } : r);
      } else {
        // Attach the origin date as recurrenceStart
        const newEvent = { ...reminder, recurrenceStart: dateStr };
        updated = [...dayArr, newEvent].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      }
      return { ...prev, [dateStr]: updated };
    });
    setIsAddModalOpen(false);
    setEditingReminder(null);
    setIsDayDetailOpen(true);
  };

  const handleDeleteReminder = (id, originDate) => {
    // For recurring events, delete from the origin date; otherwise from selected date
    const dateStr = originDate || (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null);
    if (!dateStr) return;
    setReminders(prev => {
      const updated = (prev[dateStr] || []).filter(r => r.id !== id);
      const copy = { ...prev };
      if (updated.length === 0) delete copy[dateStr];
      else copy[dateStr] = updated;
      return copy;
    });
  };

  const openAddFromDetail = () => {
    setIsDayDetailOpen(false);
    setEditingReminder(null);
    setIsAddModalOpen(true);
  };

  const openEditFromDetail = (reminder) => {
    setIsDayDetailOpen(false);
    setEditingReminder(reminder);
    setIsAddModalOpen(true);
  };

  // Navigate to the origin date and open edit modal for a recurring event
  const openEditFromOrigin = (reminder) => {
    if (!reminder._originDate) return;
    const [y, m, d] = reminder._originDate.split('-');
    const originDateObj = new Date(Number(y), Number(m) - 1, Number(d));
    // Navigate calendar to that month
    setCurrentDate(originDateObj);
    setSelectedDate(originDateObj);
    setIsDayDetailOpen(false);
    setEditingReminder(reminder);
    setIsAddModalOpen(true);
  };

  /* ──────────────────── Render header ──────────────────── */
  const renderHeader = () => {
    const months = t('months', { returnObjects: true });
    return (
      <div className="calendar-header">
        <button className="month-nav" onClick={prevMonth} title={t('prevMonth')}><FiChevronLeft /></button>
        <div className="month-title-wrap">
          <span className="month-title">
            {months[currentDate.getMonth()]} {format(currentDate, 'yyyy')}
          </span>
          <button className="btn-today" onClick={goToToday} title={t('today')}>
            {t('today')}
          </button>
        </div>
        <button className="month-nav" onClick={nextMonth} title={t('nextMonth')}><FiChevronRight /></button>
      </div>
    );
  };

  /* ──────────────────── Render day names ──────────────────── */
  const renderDays = () => (
    <div className="calendar-grid">
      {['sun','mon','tue','wed','thu','fri','sat'].map((d, i) => (
        <div className="day-name" key={i}>{t(d)}</div>
      ))}
    </div>
  );

  /* ──────────────────── Render cells ──────────────────── */
  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd   = endOfMonth(monthStart);
    const startDate  = startOfWeek(monthStart);
    const endDate    = endOfWeek(monthEnd);
    const today      = new Date();

    const rows = [];
    let days = [];
    let day  = startDate;

    const yearHolidayMap = holidaysData[currentDate.getFullYear()] || {};

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay   = day;
        const inMonth    = isSameMonth(day, monthStart);
        const isToday    = isSameDay(day, today);
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isSunday   = day.getDay() === 0;
        const hInfo      = inMonth ? getHolidayForDate(day, yearHolidayMap) : null;
        const isHoliday  = !!hInfo;
        const holidayName = hInfo ? hInfo.description : '';

        // Get ALL events for this date (direct + recurring)
        const dayEvents  = inMonth ? getEventsForDate(day, reminders) : [];

        // Max 3 icons shown
        const shownEvents = dayEvents.slice(0, 3);

        let cellClass = 'calendar-cell';
        if (!inMonth)    cellClass += ' empty';
        else if (isToday) cellClass += ' today';
        if (isSelected && inMonth) cellClass += ' active';
        if ((isSunday || isHoliday) && inMonth) cellClass += ' holiday';
        if (isHoliday && inMonth)  cellClass += ' holiday-bg';

        days.push(
          <div
            className={cellClass}
            key={day.toString()}
            title={isHoliday ? holidayName : undefined}
            onClick={() => inMonth && handleDateClick(cloneDay)}
            onContextMenu={(e) => {
              if (inMonth) {
                e.stopPropagation();
                window.electronAPI?.showDateContextMenu(format(cloneDay, 'yyyy-MM-dd'), isLocked);
              } else {
                handleContextMenu(e);
              }
            }}
          >
            {inMonth ? (
              <>
                {/* Today indicator: cute red circle */}
                {isToday && <div className="today-ring" />}
                <span
                  className="cell-date"
                  style={
                    (isHoliday || isSunday)
                      ? { color: 'var(--holiday)', fontWeight: isHoliday ? 700 : 500 }
                      : (dayEvents.length > 0 ? { color: getEventType(dayEvents[0].type).color } : undefined)
                  }
                >
                  {format(day, 'd')}
                </span>

                {/* Event type icons — top right */}
                {dayEvents.length > 0 && (
                  <div className="cell-icons">
                    {dayEvents.slice(0, 3).map(ev => {
                      const et = getEventType(ev.type);
                      return (
                        <span
                          key={ev.id}
                          className="cell-event-icon"
                          title={ev.title}
                        >
                          {et.icon}
                        </span>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="cell-event-more">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <span className="cell-date faded">{format(day, 'd')}</span>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="calendar-grid" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="calendar-rows">{rows}</div>;
  };

  /* ──────────────────── Render Month Holidays ──────────────────── */
  const renderMonthHolidays = () => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const yearMap = holidaysData[year] || {};
    const holidays = getMonthHolidays(year, month, yearMap);

    if (holidays.length === 0) return null;

    const monthNames = [
      'Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'
    ];

    return (
      <div className="month-holidays-section">
        <div className="month-holidays-header">
          <span className="month-holidays-title">🗓️ {t('monthHolidays')}</span>
          <span className="month-holidays-count">{holidays.length}</span>
        </div>
        <div className="month-holidays-list">
          {holidays.map(h => {
            const [, , dayStr] = h.dateStr.split('-');
            const dayNum = parseInt(dayStr, 10);
            const dateObj = new Date(year, month, dayNum);
            return (
              <div
                key={h.dateStr}
                className={`month-holiday-item ${h.isCutiBersama ? 'cuti-bersama' : 'libur-nasional'}`}
                onClick={() => {
                  if (isExpiredRef.current) {
                    setIsLicenseOpen(true);
                    return;
                  }
                  setCurrentDate(dateObj);
                  setSelectedDate(dateObj);
                  setIsDayDetailOpen(true);
                }}
                title={h.description}
              >
                <span className="mh-date-chip">
                  {dayNum} {monthNames[month]}
                </span>
                <span className="mh-name">{h.description}</span>
                {h.isCutiBersama && (
                  <span className="mh-cuti-tag">
                    {i18n.language === 'id' ? 'Cuti' : 'Leave'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ──────────────────── Render Upcoming Events ──────────────────── */
  const renderUpcomingEvents = () => {
    const today = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    const end = addDays(today, 6); // 7 days total (today + next 6 days = 1 week)
    
    const upcoming = [];
    let d = today;
    while (d <= end) {
      const evs = getEventsForDate(d, reminders);
      evs.forEach(ev => {
        let eventStart, eventExpire;
        if (ev.time) {
          const [hh, mm] = ev.time.split(':').map(Number);
          eventStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
          eventExpire = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour after start
        } else {
          // All-day event
          eventStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
          eventExpire = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        }

        // List acara akan hilang setelah 1 jam acara dimulai
        if (currentTime < eventExpire) {
          const isOngoing = currentTime >= eventStart && currentTime < eventExpire;
          const minutesLeft = isOngoing
            ? Math.max(1, Math.ceil((eventExpire.getTime() - currentTime.getTime()) / 60000))
            : 0;

          upcoming.push({
            ...ev,
            dateObj: d,
            eventStart,
            eventExpire,
            isOngoing,
            minutesLeft,
          });
        }
      });
      d = addDays(d, 1);
    }
    
    // sort by eventStart datetime
    upcoming.sort((a, b) => a.eventStart - b.eventStart);

    // Maksimal 5 baris acara di bawah tanggal
    const displayed = upcoming.slice(0, 5);

    if (displayed.length === 0) return null;

    return (
      <div className="upcoming-container">
        <div className="upcoming-header">{t('upcomingEvents')}</div>
        <div className="upcoming-list">
          {displayed.map(ev => {
            const et = getEventType(ev.type);
            const isToday = isSameDay(ev.dateObj, currentTime);
            return (
              <div
                className={`upcoming-item ${ev.isOngoing ? 'upcoming-item-ongoing' : ''}`}
                key={ev.id + ev.dateObj.getTime()}
                style={{ '--ev-color': et.color }}
                onClick={() => {
                  if (isExpiredRef.current) {
                    setIsLicenseOpen(true);
                    return;
                  }
                  setSelectedDate(ev.dateObj);
                  setIsDayDetailOpen(true);
                }}
              >
                <div className={`upcoming-date ${ev.isOngoing ? 'ongoing' : ''}`}>
                  <div className="upcoming-day">{format(ev.dateObj, 'd')}</div>
                  <div
                    className="upcoming-month"
                    style={{ color: ev.isOngoing ? '#ff4d4f' : (isToday ? 'var(--today-ring)' : undefined) }}
                  >
                    {ev.isOngoing ? 'LIVE' : (isToday ? (i18n.language === 'id' ? 'HARI INI' : 'TODAY') : format(ev.dateObj, 'MMM'))}
                  </div>
                </div>
                <div className="upcoming-info">
                  <div className="upcoming-title-row">
                    <span className="upcoming-title">{ev.title}</span>
                    {ev.isOngoing && (
                      <span
                        className="live-indicator"
                        title={i18n.language === 'id' ? `Hilang dalam ${ev.minutesLeft} menit` : `Hides in ${ev.minutesLeft}m`}
                      >
                        <span className="live-dot"></span>
                        {t('minutesLeft', { m: ev.minutesLeft })}
                      </span>
                    )}
                  </div>
                  <div className="upcoming-time">
                    {et.icon} {i18n.language === 'id' ? et.label : et.labelEn} {ev.time ? `• ${ev.time}` : ''}
                    {ev.isOngoing && (
                      <span className="ongoing-label">
                        • {t('ongoingSubtitle')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ──────────────────── JSX ──────────────────── */
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const dayReminders    = reminders[selectedDateStr] || [];

  return (
    <div className="widget-container" onContextMenu={handleContextMenu} onMouseDown={handleDragStart}>
      <div className="widget-content" ref={contentRef}>
        {/* Header bar — draggable */}
        <div className="app-header">
          <div className="app-title">
            📆 CalendarQ
            {isLocked && <span className="lock-badge">🔒</span>}
          </div>
          <div className="header-controls">
            <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title={t('settings')}><FiSettings /></button>
            <button className="btn-icon" onClick={() => setIsAboutOpen(true)} title={t('about')}><FiInfo /></button>
          </div>
        </div>

        {/* Trial banner — shown during trial or when expired */}
        {(licenseStatus?.status === 'trial' || licenseStatus?.status === 'expired') && (
          <TrialBanner
            daysLeft={licenseStatus.daysLeft}
            isExpired={licenseStatus?.status === 'expired'}
            onActivate={() => setIsLicenseOpen(true)}
          />
        )}

        {renderHeader()}
        {renderDays()}
        {renderCells()}
        {renderMonthHolidays()}
        {renderUpcomingEvents()}
      </div>

      {/* Modals */}
      <ReminderModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsDayDetailOpen(!!selectedDate); }}
        onSave={handleSaveReminder}
        reminderToEdit={editingReminder}
      />
      <DayDetailsModal
        isOpen={isDayDetailOpen}
        date={selectedDate}
        reminders={selectedDate ? getEventsForDate(selectedDate, reminders) : []}
        onClose={() => setIsDayDetailOpen(false)}
        onAdd={openAddFromDetail}
        onEdit={openEditFromDetail}
        onEditFromOrigin={openEditFromOrigin}
        onDelete={handleDeleteReminder}
      />
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isLocked={isLocked}
        onToggleLock={toggleLock}
        currentSize={currentSize}
        onChangeSize={handleChangeSize}
        licenseStatus={licenseStatus}
        licenseKey={licenseKey}
        onOpenLicense={() => {
          setIsSettingsOpen(false);
          setIsLicenseOpen(true);
        }}
      />
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        systemSettings={systemSettings}
      />
      <LicenseModal
        isOpen={isLicenseOpen}
        onClose={() => setIsLicenseOpen(false)}
        canClose={true}
        daysLeft={licenseStatus?.status === 'trial' ? licenseStatus.daysLeft : null}
        licenseKey={licenseKey}
        licenseInfo={licenseStatus?.info}
        systemSettings={systemSettings}
        onActivated={async () => {
          setIsLicenseOpen(false);
          setIsSettingsOpen(false);
          setIsOnboardingOpen(false);
          const status = await window.electronAPI?.licenseCheck();
          setLicenseStatus(status);
          setLicenseKey(status?.key || null);
        }}
        onDeactivate={async () => {
          setIsLicenseOpen(false);
          setIsSettingsOpen(false);
          const status = await window.electronAPI?.licenseCheck();
          setLicenseStatus(status);
          setLicenseKey(status?.key || null);
        }}
      />
      <OnboardingModal
        isOpen={isOnboardingOpen || licenseStatus?.status === 'unregistered'}
        onRegistered={async () => {
          setIsOnboardingOpen(false);
          if (window.electronAPI?.licenseCheck) {
            const status = await window.electronAPI.licenseCheck();
            setLicenseStatus(status);
            setLicenseKey(status?.key || null);
          }
        }}
      />
      <AlarmModal />
    </div>
  );
}

export default App;
