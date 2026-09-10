import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUser, FiMail, FiCheck, FiAlertCircle } from 'react-icons/fi';

/**
 * OnboardingModal — Wajib diisi saat pertama kali install untuk memulai masa coba gratis 14 hari.
 *
 * Props:
 *  isOpen       : boolean
 *  onRegistered : () => void — dipanggil setelah registrasi email & nama berhasil
 */
export default function OnboardingModal({ isOpen, onRegistered }) {
  const { i18n } = useTranslation();
  const isId = i18n.language === 'id';

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [status, setStatus]     = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const result = await window.electronAPI?.userRegister({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });

      if (result?.success) {
        setStatus('success');
        setTimeout(() => {
          onRegistered?.();
        }, 1000);
      } else {
        setStatus('error');
        setErrorMsg(result?.error || (isId ? 'Gagal mendaftar. Periksa kembali email Anda.' : 'Registration failed. Check your email.'));
      }
    } catch {
      setStatus('error');
      setErrorMsg(isId ? 'Tidak ada koneksi internet. Pastikan PC Anda terhubung ke internet.' : 'No internet connection.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content license-modal" style={{ maxWidth: '340px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '36px', marginBottom: '6px' }}>📆✨</div>
          <div className="modal-title" style={{ fontSize: '18px', fontWeight: '800' }}>
            {isId ? 'Selamat Datang di CalendarQ!' : 'Welcome to CalendarQ!'}
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', lineHeight: '1.4' }}>
            {isId
              ? 'Daftarkan nama & email (Gmail) Anda untuk memulai uji coba gratis 14 hari.'
              : 'Register your name & email to begin your 14-day free trial.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name input */}
          <div className="license-input-wrap" style={{ marginBottom: '10px' }}>
            <FiUser className="license-input-icon" />
            <input
              type="text"
              className="license-key-input"
              placeholder={isId ? 'Nama Lengkap' : 'Full Name'}
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={status === 'loading' || status === 'success'}
              required
              autoFocus
              style={{ textTransform: 'none' }}
            />
          </div>

          {/* Email input */}
          <div className="license-input-wrap" style={{ marginBottom: '14px' }}>
            <FiMail className="license-input-icon" />
            <input
              type="email"
              className="license-key-input"
              placeholder={isId ? 'Alamat Email (Gmail)' : 'Email Address'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={status === 'loading' || status === 'success'}
              required
              style={{ textTransform: 'none' }}
            />
          </div>

          {/* Status message */}
          {status === 'error' && (
            <div className="license-msg license-msg-error" style={{ marginBottom: '12px' }}>
              <FiAlertCircle /> {errorMsg}
            </div>
          )}
          {status === 'success' && (
            <div className="license-msg license-msg-success" style={{ marginBottom: '12px' }}>
              <FiCheck /> {isId ? 'Berhasil! Selamat menikmati CalendarQ.' : 'Success! Enjoy CalendarQ.'}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            className="btn-toggle active full-width"
            disabled={!name.trim() || !email.trim() || status === 'loading' || status === 'success'}
            style={{ justifyContent: 'center', padding: '10px 14px', fontWeight: '700' }}
          >
            {status === 'loading'
              ? (isId ? '⏳ Mendaftarkan...' : '⏳ Registering...')
              : (isId ? '🚀 Mulai Coba Gratis 14 Hari' : '🚀 Start 14-Day Free Trial')}
          </button>
        </form>

        <p className="license-note" style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px', opacity: 0.7 }}>
          {isId
            ? '🔒 Data Anda aman dan digunakan untuk pencatatan lisensi aplikasi.'
            : '🔒 Your email is safe and used for app licensing records.'}
        </p>
      </div>
    </div>
  );
}
