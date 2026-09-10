import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "language": "EN",
      "addReminder": "Add Reminder",
      "editReminder": "Edit Reminder",
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "title": "Title",
      "time": "Time",
      "type": "Event Type",
      "note": "Note",
      "optionalNote": "Optional note...",
      "noReminders": "No events for this day.",
      "reminders": "Events",
      "recurrence": "Repeat",
      "recOnce": "Once",
      "recWeekly": "Weekly",
      "recMonthly": "Monthly",
      "recYearly": "Yearly",
      "recBadgeWeekly": "Repeats weekly",
      "recBadgeMonthly": "Repeats monthly",
      "recBadgeYearly": "Repeats yearly",
      "settings": "Settings",
      "about": "About",
      "size": "Widget Size",
      "sizeSmall": "Small",
      "sizeMedium": "Medium",
      "sizeLarge": "Large",
      "upcomingEvents": "Upcoming Events",
      "lockPosition": "Lock Position",
      "unlockPosition": "Unlock Position",
      "autoStart": "Start with Windows",
      "sun": "Sun", "mon": "Mon", "tue": "Tue", "wed": "Wed", "thu": "Thu", "fri": "Fri", "sat": "Sat",
      "remindAdvance": "Remind Me",
      "remindSameDay": "Same day",
      "remind1Day": "1 day before",
      "remind2Days": "2 days before",
      "remind3Days": "3 days before",
      "remind1Week": "1 week before",
      "ongoing": "Live",
      "ongoingSubtitle": "Happening now",
      "minutesLeft": "{{m}}m left",
      "today": "Today",
      "prevMonth": "Previous Month",
      "nextMonth": "Next Month",
      "monthHolidays": "Holidays This Month",
      "nationalHoliday": "Public Holiday",
      "cutiBersama": "Collective Leave",
      "syncHolidays": "Update Official Holidays",
      "syncSuccess": "Official holidays updated successfully",
      "officialSource": "Official Govt. Decree (SKB 3 Menteri)",
      "months": [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ]
    }
  },
  id: {
    translation: {
      "language": "ID",
      "addReminder": "Tambah Acara",
      "editReminder": "Edit Acara",
      "save": "Simpan",
      "cancel": "Batal",
      "delete": "Hapus",
      "title": "Judul",
      "time": "Waktu",
      "type": "Jenis Acara",
      "note": "Catatan",
      "optionalNote": "Catatan tambahan...",
      "noReminders": "Tidak ada acara hari ini.",
      "reminders": "Acara",
      "recurrence": "Ulangi",
      "recOnce": "Sekali",
      "recWeekly": "Tiap Minggu",
      "recMonthly": "Tiap Bulan",
      "recYearly": "Tiap Tahun",
      "recBadgeWeekly": "Berulang tiap minggu",
      "recBadgeMonthly": "Berulang tiap bulan",
      "recBadgeYearly": "Berulang tiap tahun",
      "settings": "Pengaturan",
      "about": "Tentang",
      "size": "Ukuran Widget",
      "sizeSmall": "Kecil",
      "sizeMedium": "Sedang",
      "sizeLarge": "Besar",
      "upcomingEvents": "Acara Mendatang",
      "lockPosition": "Kunci Posisi",
      "unlockPosition": "Buka Posisi",
      "autoStart": "Jalankan Otomatis saat Startup",
      "sun": "Min", "mon": "Sen", "tue": "Sel", "wed": "Rab", "thu": "Kam", "fri": "Jum", "sat": "Sab",
      "remindAdvance": "Ingatkan Saya",
      "remindSameDay": "Hari yang sama",
      "remind1Day": "1 hari sebelum",
      "remind2Days": "2 hari sebelum",
      "remind3Days": "3 hari sebelum",
      "remind1Week": "1 minggu sebelum",
      "ongoing": "Live",
      "ongoingSubtitle": "Sedang berlangsung",
      "minutesLeft": "sisa {{m}} mnt",
      "today": "Hari Ini",
      "prevMonth": "Bulan Sebelumnya",
      "nextMonth": "Bulan Berikutnya",
      "monthHolidays": "Libur Bulan Ini",
      "nationalHoliday": "Libur Nasional",
      "cutiBersama": "Cuti Bersama",
      "syncHolidays": "Perbarui Data Libur Resmi",
      "syncSuccess": "Data libur resmi berhasil diperbarui",
      "officialSource": "Ketentuan Resmi SKB 3 Menteri",
      "months": [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ]
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "id", // default language
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
