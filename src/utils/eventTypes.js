// Tipe acara dengan icon, warna, dan label
export const EVENT_TYPES = [
  { id: 'work',       label: 'Pekerjaan',     labelEn: 'Work',        icon: '💼', color: '#4c8aff' },
  { id: 'meeting',    label: 'Rapat',         labelEn: 'Meeting',     icon: '🤝', color: '#a78bfa' },
  { id: 'personal',   label: 'Pribadi',       labelEn: 'Personal',    icon: '🌸', color: '#f472b6' },
  { id: 'health',     label: 'Kesehatan',     labelEn: 'Health',      icon: '💊', color: '#34d399' },
  { id: 'birthday',   label: 'Ulang Tahun',   labelEn: 'Birthday',    icon: '🎂', color: '#fb923c' },
  { id: 'holiday',    label: 'Liburan',       labelEn: 'Holiday',     icon: '✈️', color: '#22d3ee' },
  { id: 'finance',    label: 'Keuangan',      labelEn: 'Finance',     icon: '💰', color: '#a3e635' },
  { id: 'education',  label: 'Pendidikan',    labelEn: 'Education',   icon: '📚', color: '#fbbf24' },
  { id: 'deadline',   label: 'Deadline',      labelEn: 'Deadline',    icon: '🔥', color: '#f87171' },
  { id: 'sport',      label: 'Olahraga',      labelEn: 'Sport',       icon: '🏃', color: '#4ade80' },
  { id: 'food',       label: 'Makan / Resto', labelEn: 'Food',        icon: '🍽️', color: '#fdba74' },
  { id: 'other',      label: 'Lainnya',       labelEn: 'Other',       icon: '📌', color: '#94a3b8' },
];

export const getEventType = (id) =>
  EVENT_TYPES.find(t => t.id === id) || EVENT_TYPES[EVENT_TYPES.length - 1];
