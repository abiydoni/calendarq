import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import { syncOfficialHolidays } from '../utils/holidays';

export default function SettingsModal({ isOpen, onClose, isLocked, onToggleLock, currentSize, onChangeSize, licenseStatus, licenseKey, onOpenLicense }) {
  const { t, i18n } = useTranslation();
  const [autoStart, setAutoStart] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null); // null | 'loading' | 'ok' | 'error'

  useEffect(() => {
    if (isOpen && window.electronAPI?.getAutoStart) {
      window.electronAPI.getAutoStart().then(val => setAutoStart(val !== false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    if (window.electronAPI?.storeSet) {
      window.electronAPI.storeSet('calendarq_lang', lang);
    }
  };

  const handleToggleAutoStart = async () => {
    const next = !autoStart;
    setAutoStart(next);
    if (window.electronAPI?.setAutoStart) {
      await window.electronAPI.setAutoStart(next);
    }
  };

  const handleSyncHolidays = async () => {
    setSyncStatus('loading');
    try {
      const year = new Date().getFullYear();
      // Force refresh for current year and adjacent years
      await Promise.all([
        syncOfficialHolidays(year - 1, true),
        syncOfficialHolidays(year, true),
        syncOfficialHolidays(year + 1, true)
      ]);
      setSyncStatus('ok');
    } catch (e) {
      setSyncStatus('error');
    }
    setTimeout(() => setSyncStatus(null), 2500);
  };

  const sizes = [
    { id: 'small', label: t('sizeSmall') },
    { id: 'medium', label: t('sizeMedium') },
    { id: 'large', label: t('sizeLarge') }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="day-detail-header">
          <div className="modal-title">⚙️ {t('settings')}</div>
          <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>

        <div className="settings-section">
          <div className="settings-label">{t('language')}</div>
          <div className="btn-group">
            <button 
              className={`btn-toggle ${i18n.language === 'id' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('id')}
            >
              Indonesia
            </button>
            <button 
              className={`btn-toggle ${i18n.language === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              English
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label">{t('size')}</div>
          <div className="btn-group">
            {sizes.map(s => (
              <button
                key={s.id}
                className={`btn-toggle ${currentSize === s.id ? 'active' : ''}`}
                onClick={() => onChangeSize(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label">{t('autoStart')}</div>
          <button 
            className={`btn-toggle full-width ${autoStart ? 'active' : ''}`}
            onClick={handleToggleAutoStart}
            style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            {autoStart
              ? '🚀 ' + (i18n.language === 'id' ? 'Aktif (Mulai saat Windows Menyala)' : 'Active (Start with Windows)')
              : '⏸️ ' + (i18n.language === 'id' ? 'Nonaktif' : 'Disabled')}
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-label">{t('lockPosition')}</div>
          <button 
            className={`btn-toggle full-width ${isLocked ? 'active' : ''}`}
            onClick={onToggleLock}
            style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            {isLocked ? '🔒 ' + t('unlockPosition') : '🔓 ' + t('lockPosition')}
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-label">🗓️ {t('officialSource')}</div>
          <button
            className={`btn-toggle full-width ${syncStatus === 'ok' ? 'active' : ''}`}
            onClick={handleSyncHolidays}
            disabled={syncStatus === 'loading'}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '7px' }}
          >
            <FiRefreshCw
              style={{
                animation: syncStatus === 'loading' ? 'spin 1s linear infinite' : 'none',
                fontSize: '12px'
              }}
            />
            {syncStatus === 'loading'
              ? (i18n.language === 'id' ? 'Memperbarui...' : 'Updating...')
              : syncStatus === 'ok'
                ? '✓ ' + t('syncSuccess')
                : syncStatus === 'error'
                  ? (i18n.language === 'id' ? '✗ Gagal (offline?)' : '✗ Failed (offline?)')
                  : t('syncHolidays')
            }
          </button>
        </div>
        <div className="settings-section">
          <div className="settings-label">🔑 {i18n.language === 'id' ? 'Lisensi' : 'License'}</div>
          {!licenseStatus && (
            <div className="license-settings-status checking">
              {i18n.language === 'id' ? 'Memeriksa...' : 'Checking...'}
            </div>
          )}
          {licenseStatus?.status === 'trial' && (
            <button className="btn-toggle full-width" onClick={onOpenLicense}
              style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              ⏳ {i18n.language === 'id'
                ? `Trial — ${licenseStatus.daysLeft} hari tersisa`
                : `Trial — ${licenseStatus.daysLeft} day${licenseStatus.daysLeft !== 1 ? 's' : ''} left`}
            </button>
          )}
          {licenseStatus?.status === 'active' && (
            <button className="btn-toggle full-width active" onClick={onOpenLicense}
              style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              ✅ {i18n.language === 'id' ? 'Lisensi Aktif' : 'License Active'}
            </button>
          )}
          {licenseStatus?.status === 'expired' && (
            <button className="btn-toggle full-width" onClick={onOpenLicense}
              style={{ display: 'flex', justifyContent: 'center', gap: '8px', color: 'var(--holiday)' }}>
              ⚠️ {i18n.language === 'id' ? 'Trial Berakhir — Aktifkan' : 'Trial Ended — Activate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
