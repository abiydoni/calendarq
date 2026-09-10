import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiBell, FiClock, FiXOctagon } from 'react-icons/fi';

export default function AlarmModal() {
  const { t, i18n } = useTranslation();
  const isId = i18n.language === 'id';
  
  const [activeAlarm, setActiveAlarm] = useState(null);
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const beepIntervalRef = useRef(null);
  
  // Custom synthetic beep
  const startBeep = () => {
    if (audioCtxRef.current) return; // already playing
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      
      const playSingleBeep = () => {
        if (!audioCtxRef.current) return;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime); // 800Hz beep
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      };
      
      // Play immediately, then loop every 1.5 seconds
      playSingleBeep();
      beepIntervalRef.current = setInterval(playSingleBeep, 1500);
      
    } catch (e) {
      console.error('AudioContext not supported or failed to start', e);
    }
  };
  
  const stopBeep = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    const handleAlarmTrigger = (e) => {
      const detail = e.detail;
      if (!detail) return;
      
      // If there's already an active alarm, we can just replace it or ignore.
      // Replacing it so the user sees the latest one.
      setActiveAlarm(detail);
      startBeep();
    };

    window.addEventListener('alarm-trigger', handleAlarmTrigger);
    return () => {
      window.removeEventListener('alarm-trigger', handleAlarmTrigger);
      stopBeep();
    };
  }, []);

  const handleStop = () => {
    stopBeep();
    setActiveAlarm(null);
  };

  const handleSnooze = () => {
    const currentAlarm = activeAlarm;
    stopBeep();
    setActiveAlarm(null);
    
    // Trigger again in 5 minutes
    setTimeout(() => {
      const event = new CustomEvent('alarm-trigger', { detail: currentAlarm });
      window.dispatchEvent(event);
    }, 5 * 60 * 1000);
  };

  if (!activeAlarm) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content alarm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="alarm-icon-pulse">
          <FiBell size={40} color="#ff4d4f" />
        </div>
        
        <h2 className="alarm-title">{isId ? 'Pengingat Acara' : 'Event Reminder'}</h2>
        
        <div className="alarm-body-text">
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
            {activeAlarm.reminder?.title}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {activeAlarm.body}
          </div>
        </div>
        
        <div className="alarm-actions">
          <button className="btn-snooze" onClick={handleSnooze}>
            <FiClock /> {isId ? 'Tunda 5 Menit' : 'Snooze 5 Min'}
          </button>
          <button className="btn-stop" onClick={handleStop}>
            <FiXOctagon /> {isId ? 'Hentikan' : 'Stop'}
          </button>
        </div>
      </div>
    </div>
  );
}
