import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiKey, FiX, FiExternalLink, FiCheck, FiAlertCircle } from 'react-icons/fi';

/**
 * LicenseModal — shown when trial expires, user must enter a license key.
 *
 * Props:
 *  isOpen        : boolean
 *  onClose       : () => void  — only callable if canClose is true
 *  onActivated   : () => void  — called when license is successfully activated
 *  canClose      : boolean     — if false, user cannot close without activating (expired)
 *  daysLeft      : number|null — pass to show trial info during activation from Settings
 *  licenseKey    : string|null — existing active key (for info display)
 *  onDeactivate  : () => void  — callback when deactivating from Settings
 */
export default function LicenseModal({
  isOpen,
  onClose,
  onActivated,
  canClose = true,
  daysLeft = null,
  licenseKey = null,
  licenseInfo = null,
  systemSettings = {},
  onDeactivate,
}) {
  const { i18n } = useTranslation();
  const isId = i18n.language === 'id';

  const [key, setKey]         = useState('');
  const [status, setStatus]   = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleActivate = async () => {
    if (!key.trim()) return;
    setStatus('loading');
    setErrorMsg('');

    try {
      const result = await window.electronAPI?.licenseActivate(key.trim());
      if (result?.success) {
        setStatus('success');
        setTimeout(() => {
          onActivated?.();
          if (canClose) onClose?.();
          setStatus('idle');
          setKey('');
        }, 800);
      } else {
        setStatus('error');
        setErrorMsg(result?.error || (isId ? 'Aktivasi gagal. Coba lagi.' : 'Activation failed. Try again.'));
      }
    } catch {
      setStatus('error');
      setErrorMsg(isId ? 'Tidak ada koneksi internet.' : 'No internet connection.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && key.trim() && status !== 'loading') {
      handleActivate();
    }
  };

  const handleBuy = () => {
    // Open Order Web Page
    window.electronAPI?.openExternalLink('http://localhost:3001/order.html');
  };

  const handleDeactivate = async () => {
    if (!window.confirm(isId ? 'Nonaktifkan license di PC ini?' : 'Deactivate license on this PC?')) return;
    await window.electronAPI?.licenseDeactivate();
    onDeactivate?.();
    onClose?.();
  };

  // ── Info mode: user is already licensed (opened from Settings) ──
  if (licenseKey) {
    return (
      <div className="modal-overlay" onClick={canClose ? onClose : undefined}>
        <div className="modal-content license-modal" onClick={e => e.stopPropagation()}>
          <div className="day-detail-header">
            <div className="modal-title">🔑 {isId ? 'Info Lisensi' : 'License Info'}</div>
            {canClose && <button className="btn-icon" onClick={onClose}><FiX /></button>}
          </div>

          <div className="license-status-badge active">
            <FiCheck />
            {isId ? 'Lisensi Aktif' : 'License Active'}
          </div>

          <div className="license-key-display">
            <span className="license-key-label">{isId ? 'Key:' : 'Key:'}</span>
            <code className="license-key-value">{licenseKey}</code>
          </div>

          {licenseInfo?.clientName && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: '6px 0 10px', textAlign: 'center' }}>
              👤 {isId ? 'Dilisensikan kepada:' : 'Licensed to:'} <strong>{licenseInfo.clientName}</strong>
              {licenseInfo.licenseType && (
                <span style={{ marginLeft: '6px', opacity: 0.8, textTransform: 'capitalize' }}>
                  ({licenseInfo.licenseType})
                </span>
              )}
            </div>
          )}

          <p className="license-note">
            {isId
              ? 'Lisensi ini aktif di PC ini. Nonaktifkan jika ingin memindahkan ke PC lain.'
              : 'This license is active on this PC. Deactivate to transfer to another PC.'}
          </p>

          <button className="btn-toggle full-width license-deactivate-btn" onClick={handleDeactivate}>
            {isId ? '🔓 Nonaktifkan di PC ini' : '🔓 Deactivate on this PC'}
          </button>
        </div>
      </div>
    );
  }

  // ── Activation mode ──
  return (
    <div className="modal-overlay" onClick={canClose ? onClose : undefined}>
      <div className="modal-content license-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="day-detail-header">
          <div className="modal-title">
            {canClose
              ? `🔑 ${isId ? 'Aktifkan Lisensi' : 'Activate License'}`
              : `⏰ ${isId ? 'Trial Berakhir' : 'Trial Ended'}`}
          </div>
          {canClose && <button className="btn-icon" onClick={onClose}><FiX /></button>}
        </div>

        {/* Expired message */}
        {!canClose && (
          <div className="license-expired-notice">
            <FiAlertCircle />
            <span>
              {isId
                ? 'Masa trial 14 hari telah berakhir. Masukkan license key untuk melanjutkan.'
                : 'Your 14-day trial has ended. Enter a license key to continue.'}
            </span>
          </div>
        )}

        {/* Trial info (if still in trial, opened from Settings) */}
        {canClose && daysLeft !== null && (
          <div className="license-trial-info">
            ⏳ {isId ? `${daysLeft} hari tersisa dalam trial` : `${daysLeft} days left in trial`}
          </div>
        )}

        {/* Key input */}
        <div className="license-input-wrap">
          <FiKey className="license-input-icon" />
          <input
            type="text"
            className="license-key-input"
            placeholder="CQAPP-XXXXX-XXXXX-XXXXX"
            value={key}
            onChange={e => setKey(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            disabled={status === 'loading' || status === 'success'}
            autoFocus
            spellCheck={false}
          />
        </div>

        {/* Status messages */}
        {status === 'error' && (
          <div className="license-msg license-msg-error">
            <FiAlertCircle /> {errorMsg}
          </div>
        )}
        {status === 'success' && (
          <div className="license-msg license-msg-success">
            <FiCheck /> {isId ? 'Aktivasi berhasil! ✨' : 'Activation successful! ✨'}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', margin: '12px 0 8px' }}>
          {isId ? 'Belum punya Key? Dapatkan lisensi dengan klik tombol di bawah.' : "Don't have a Key? Buy a license by clicking the button below."}
        </div>

        {/* Buttons */}
        <div className="license-actions">
          <button
            className="btn-toggle active full-width"
            onClick={handleActivate}
            disabled={!key.trim() || status === 'loading' || status === 'success'}
            style={{ justifyContent: 'center', gap: '8px' }}
          >
            {status === 'loading'
              ? (isId ? '⏳ Memvalidasi...' : '⏳ Validating...')
              : (isId ? '✅ Aktifkan' : '✅ Activate')}
          </button>

          <button className="license-buy-btn" onClick={handleBuy}>
            <FiExternalLink />
            {isId ? 'Beli Lisensi' : 'Buy License'}
          </button>
        </div>

        {/* Dynamic Bank Account Info from Settings */}
        {systemSettings?.bank_account && (
          <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', fontSize: '11px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{isId ? 'Atau transfer langsung ke:' : 'Or transfer directly to:'}</div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '12px' }}>
              {systemSettings.bank_name ? `${systemSettings.bank_name} ` : ''} 
              {systemSettings.bank_account}
            </div>
            {systemSettings.bank_owner && (
              <div style={{ color: 'var(--text-muted)' }}>a/n {systemSettings.bank_owner}</div>
            )}
          </div>
        )}

        <p className="license-note">
          {isId
            ? 'Satu key dapat digunakan di maks 2 PC.'
            : 'One key can be used on up to 2 PCs.'}
        </p>
      </div>
    </div>
  );
}
