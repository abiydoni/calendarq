import Holidays from 'date-holidays';

const hd = new Holidays('ID');

// Data resmi SKB 3 Menteri (Hari Libur Nasional & Cuti Bersama)
export const OFFICIAL_HOLIDAYS_DEFAULT = {
  2025: [
    { date: '2025-01-01', description: 'Tahun Baru 2025 Masehi', isCutiBersama: false },
    { date: '2025-01-27', description: "Isra Mi'raj Nabi Muhammad SAW", isCutiBersama: false },
    { date: '2025-01-28', description: 'Cuti Bersama Tahun Baru Imlek 2576 Kongzili', isCutiBersama: true },
    { date: '2025-01-29', description: 'Tahun Baru Imlek 2576 Kongzili', isCutiBersama: false },
    { date: '2025-03-28', description: 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1947', isCutiBersama: true },
    { date: '2025-03-29', description: 'Hari Suci Nyepi Tahun Baru Saka 1947', isCutiBersama: false },
    { date: '2025-03-31', description: 'Hari Raya Idul Fitri 1446 Hijriyah', isCutiBersama: false },
    { date: '2025-04-01', description: 'Hari Raya Idul Fitri 1446 Hijriyah', isCutiBersama: false },
    { date: '2025-04-02', description: 'Cuti Bersama Hari Raya Idul Fitri 1446 Hijriyah', isCutiBersama: true },
    { date: '2025-04-03', description: 'Cuti Bersama Hari Raya Idul Fitri 1446 Hijriyah', isCutiBersama: true },
    { date: '2025-04-04', description: 'Cuti Bersama Hari Raya Idul Fitri 1446 Hijriyah', isCutiBersama: true },
    { date: '2025-04-07', description: 'Cuti Bersama Hari Raya Idul Fitri 1446 Hijriyah', isCutiBersama: true },
    { date: '2025-04-18', description: 'Wafat Yesus Kristus / Jumat Agung', isCutiBersama: false },
    { date: '2025-04-20', description: 'Kebangkitan Yesus Kristus (Paskah)', isCutiBersama: false },
    { date: '2025-05-01', description: 'Hari Buruh Internasional', isCutiBersama: false },
    { date: '2025-05-12', description: 'Hari Raya Waisak 2569 BE', isCutiBersama: false },
    { date: '2025-05-13', description: 'Cuti Bersama Hari Raya Waisak 2569 BE', isCutiBersama: true },
    { date: '2025-05-29', description: 'Kenaikan Yesus Kristus', isCutiBersama: false },
    { date: '2025-05-30', description: 'Cuti Bersama Kenaikan Yesus Kristus', isCutiBersama: true },
    { date: '2025-06-01', description: 'Hari Lahir Pancasila', isCutiBersama: false },
    { date: '2025-06-06', description: 'Hari Raya Idul Adha 1446 Hijriyah', isCutiBersama: false },
    { date: '2025-06-09', description: 'Cuti Bersama Hari Raya Idul Adha 1446 Hijriyah', isCutiBersama: true },
    { date: '2025-06-27', description: 'Tahun Baru Islam 1447 Hijriyah', isCutiBersama: false },
    { date: '2025-08-17', description: 'Hari Kemerdekaan Republik Indonesia', isCutiBersama: false },
    { date: '2025-08-18', description: 'Cuti Bersama Hari Kemerdekaan Republik Indonesia', isCutiBersama: true },
    { date: '2025-09-05', description: 'Maulid Nabi Muhammad SAW', isCutiBersama: false },
    { date: '2025-12-25', description: 'Hari Raya Natal', isCutiBersama: false },
    { date: '2025-12-26', description: 'Cuti Bersama Hari Raya Natal', isCutiBersama: true }
  ],
  2026: [
    { date: '2026-01-01', description: 'Tahun Baru 2026 Masehi', isCutiBersama: false },
    { date: '2026-01-16', description: "Isra Mi'raj Nabi Muhammad SAW", isCutiBersama: false },
    { date: '2026-02-17', description: 'Tahun Baru Imlek 2577 Kongzili', isCutiBersama: false },
    { date: '2026-03-18', description: 'Cuti Bersama Hari Suci Nyepi', isCutiBersama: true },
    { date: '2026-03-19', description: 'Hari Suci Nyepi Tahun Baru Saka 1948', isCutiBersama: false },
    { date: '2026-03-20', description: 'Cuti Bersama Hari Raya Idul Fitri', isCutiBersama: true },
    { date: '2026-03-21', description: 'Hari Raya Idul Fitri 1447 Hijriyah', isCutiBersama: false },
    { date: '2026-03-22', description: 'Hari Raya Idul Fitri 1447 Hijriyah', isCutiBersama: false },
    { date: '2026-03-23', description: 'Cuti Bersama Hari Raya Idul Fitri', isCutiBersama: true },
    { date: '2026-03-24', description: 'Cuti Bersama Hari Raya Idul Fitri', isCutiBersama: true },
    { date: '2026-04-03', description: 'Wafat Yesus Kristus / Jumat Agung', isCutiBersama: false },
    { date: '2026-04-05', description: 'Kebangkitan Yesus Kristus (Paskah)', isCutiBersama: false },
    { date: '2026-05-01', description: 'Hari Buruh Internasional', isCutiBersama: false },
    { date: '2026-05-14', description: 'Kenaikan Yesus Kristus', isCutiBersama: false },
    { date: '2026-05-15', description: 'Cuti Bersama Kenaikan Yesus Kristus', isCutiBersama: true },
    { date: '2026-05-27', description: 'Hari Raya Idul Adha 1447 Hijriyah', isCutiBersama: false },
    { date: '2026-05-28', description: 'Cuti Bersama Hari Raya Idul Adha', isCutiBersama: true },
    { date: '2026-05-31', description: 'Hari Raya Waisak 2570 BE', isCutiBersama: false },
    { date: '2026-06-01', description: 'Hari Lahir Pancasila', isCutiBersama: false },
    { date: '2026-06-16', description: 'Tahun Baru Islam 1448 Hijriyah', isCutiBersama: false },
    { date: '2026-08-17', description: 'Hari Kemerdekaan Republik Indonesia', isCutiBersama: false },
    { date: '2026-08-25', description: 'Maulid Nabi Muhammad SAW', isCutiBersama: false },
    { date: '2026-12-24', description: 'Cuti Bersama Hari Raya Natal', isCutiBersama: true },
    { date: '2026-12-25', description: 'Hari Raya Natal', isCutiBersama: false }
  ],
  2027: [
    { date: '2027-01-01', description: 'Tahun Baru 2027 Masehi', isCutiBersama: false },
    { date: '2027-01-05', description: "Isra Mi'raj Nabi Muhammad SAW", isCutiBersama: false },
    { date: '2027-02-06', description: 'Tahun Baru Imlek 2578 Kongzili', isCutiBersama: false },
    { date: '2027-03-09', description: 'Hari Suci Nyepi Tahun Baru Saka 1949', isCutiBersama: false },
    { date: '2027-03-10', description: 'Hari Raya Idul Fitri 1448 Hijriyah', isCutiBersama: false },
    { date: '2027-03-26', description: 'Wafat Yesus Kristus / Jumat Agung', isCutiBersama: false },
    { date: '2027-05-01', description: 'Hari Buruh Internasional', isCutiBersama: false },
    { date: '2027-05-06', description: 'Kenaikan Yesus Kristus', isCutiBersama: false },
    { date: '2027-05-17', description: 'Hari Raya Idul Adha 1448 Hijriyah', isCutiBersama: false },
    { date: '2027-05-20', description: 'Hari Raya Waisak 2571 BE', isCutiBersama: false },
    { date: '2027-06-01', description: 'Hari Lahir Pancasila', isCutiBersama: false },
    { date: '2027-06-06', description: 'Tahun Baru Islam 1449 Hijriyah', isCutiBersama: false },
    { date: '2027-08-15', description: 'Maulid Nabi Muhammad SAW', isCutiBersama: false },
    { date: '2027-08-17', description: 'Hari Kemerdekaan Republik Indonesia', isCutiBersama: false },
    { date: '2027-12-25', description: 'Hari Raya Natal', isCutiBersama: false }
  ]
};

export function normalizeHolidaysMap(holidayList) {
  const map = {};
  if (!Array.isArray(holidayList)) return map;
  holidayList.forEach(item => {
    if (!item || !item.date) return;
    const dateStr = item.date.split(' ')[0];
    const desc = item.description || item.name || '';
    const isCuti = item.isCutiBersama ?? desc.toLowerCase().includes('cuti bersama');
    map[dateStr] = { date: dateStr, description: desc, isCutiBersama: isCuti, isHoliday: true };
  });
  return map;
}

export function getFallbackHolidaysFromLibrary(year) {
  try {
    const list = hd.getHolidays(year);
    if (!list || list.length === 0) return {};
    const map = {};
    list.forEach(h => {
      const dateStr = h.date.split(' ')[0];
      let desc = h.name || '';
      if (h.rule && h.rule.includes('27 Rajab')) desc = "Isra Mi'raj Nabi Muhammad SAW";
      map[dateStr] = { date: dateStr, description: desc, isCutiBersama: false, isHoliday: true };
    });
    return map;
  } catch (err) {
    console.error('getFallbackHolidaysFromLibrary error:', err);
    return {};
  }
}

export function getInitialHolidaysForYear(year) {
  if (OFFICIAL_HOLIDAYS_DEFAULT[year]) {
    return normalizeHolidaysMap(OFFICIAL_HOLIDAYS_DEFAULT[year]);
  }
  return getFallbackHolidaysFromLibrary(year);
}

export async function syncOfficialHolidays(year, force = false) {
  const cacheKey = 'calendarq_holidays_' + year;
  const timestampKey = 'calendarq_holidays_ts_' + year;
  if (!force && window.electronAPI?.storeGet) {
    try {
      const cached = await window.electronAPI.storeGet(cacheKey);
      const lastSync = await window.electronAPI.storeGet(timestampKey);
      const isFresh = lastSync && (Date.now() - lastSync < 7 * 24 * 60 * 60 * 1000);
      if (cached && Object.keys(cached).length > 0 && isFresh) return cached;
    } catch (e) { console.warn('Holiday cache read error:', e); }
  }
  try {
    const url = 'https://api-hari-libur.vercel.app/api?year=' + year;
    // Use Electron IPC proxy to avoid CSP/fetch restrictions in renderer
    const result = window.electronAPI?.fetchUrl
      ? await window.electronAPI.fetchUrl(url)
      : await fetch(url).then(r => ({ ok: r.ok, text: r.text() }));
    if (result.ok && result.text) {
      const json = JSON.parse(result.text);
      if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        const normalized = normalizeHolidaysMap(json.data);
        if (window.electronAPI?.storeSet) {
          await window.electronAPI.storeSet(cacheKey, normalized);
          await window.electronAPI.storeSet(timestampKey, Date.now());
        }
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Online holiday sync failed for ' + year + ':', err.message);
  }
  if (window.electronAPI?.storeGet) {
    try {
      const cached = await window.electronAPI.storeGet(cacheKey);
      if (cached && Object.keys(cached).length > 0) return cached;
    } catch (e) {}
  }
  return getInitialHolidaysForYear(year);
}


export function getHolidayForDate(date, holidaysMap) {
  if (!date || !holidaysMap) return null;
  let dateStr;
  if (typeof date === 'string') {
    dateStr = date.split(' ')[0];
  } else if (date instanceof Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    dateStr = y + '-' + m + '-' + d;
  } else return null;
  return holidaysMap[dateStr] || null;
}

export function getMonthHolidays(year, month, holidaysMap) {
  if (!holidaysMap) return [];
  const targetPrefix = year + '-' + String(month + 1).padStart(2, '0') + '-';
  const list = [];
  Object.keys(holidaysMap).forEach(key => {
    if (key.startsWith(targetPrefix)) {
      const item = holidaysMap[key];
      const dayNum = parseInt(key.slice(targetPrefix.length), 10);
      list.push({ ...item, dateStr: key, dayNum });
    }
  });
  list.sort((a, b) => a.dayNum - b.dayNum);
  return list;
}
