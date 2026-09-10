import { useTranslation } from 'react-i18next';

/**
 * TrialBanner — compact banner shown below the app header during trial period.
 *
 * Props:
 *  daysLeft      : number — days remaining in trial
 *  onActivate    : () => void — opens LicenseModal
 */
export default function TrialBanner({ daysLeft, isExpired, onActivate }) {
  const { i18n } = useTranslation();
  const isId = i18n.language === 'id';

  const isUrgent = isExpired || daysLeft <= 3;

  return (
    <div className={`trial-banner ${isUrgent ? 'trial-banner-urgent' : ''}`}>
      <span className="trial-banner-text">
        {isExpired ? '🚫 ' : (isUrgent ? '⚠️ ' : '⏳ ')}
        {isExpired 
          ? (isId ? 'Trial Berakhir - Aplikasi Dikunci' : 'Trial Ended - App Locked')
          : (isId ? `Trial: ${daysLeft} hari tersisa` : `Trial: ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`)}
      </span>
      <button className="trial-banner-btn" onClick={onActivate}>
        {isId ? (isExpired ? 'Beli / Aktifkan' : 'Aktifkan') : (isExpired ? 'Buy / Activate' : 'Activate')}
      </button>
    </div>
  );
}
