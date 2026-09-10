import { useTranslation } from 'react-i18next';
import { FiX, FiExternalLink } from 'react-icons/fi';

export default function AboutModal({ isOpen, onClose, systemSettings = {} }) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
  const latestVersion = systemSettings.latest_version || appVersion;
  const updateUrl = systemSettings.update_link || 'https://calendarq.com/download';

  const handleUpdateClick = () => {
    if (window.electronAPI?.openExternalLink) {
      window.electronAPI.openExternalLink(updateUrl);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="day-detail-header">
          <div className="modal-title">ℹ️ {t('about')}</div>
          <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>

        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📆</div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>CalendarQ</div>
          <div style={{ fontSize: '12px', color: 'var(--accent)', marginBottom: '16px', fontWeight: 'bold' }}>
            v{appVersion}
          </div>
          
          <div style={{ fontSize: '12px', lineHeight: '1.5', marginBottom: '20px' }}>
            Aplikasi widget kalender yang cantik dan praktis untuk mengelola jadwal Anda langsung dari desktop.
          </div>
          
          {systemSettings.announcement && (
            <div style={{ margin: '0 0 20px 0', padding: '10px', background: 'rgba(255, 215, 0, 0.1)', color: '#fbbf24', border: '1px solid rgba(255, 215, 0, 0.2)', borderRadius: '6px', fontSize: '11px', textAlign: 'center', lineHeight: '1.4' }}>
              <strong>📢 Pengumuman:</strong><br/>
              {systemSettings.announcement}
            </div>
          )}

          <button 
            className="btn-toggle full-width" 
            onClick={handleUpdateClick}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)' }}
          >
            <FiExternalLink /> Cek Update Terbaru {latestVersion !== appVersion ? `(v${latestVersion} Tersedia!)` : ''}
          </button>

          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '24px' }}>
            &copy; 2026 CalendarQ. All rights reserved by appsbee.
          </div>
        </div>
      </div>
    </div>
  );
}
