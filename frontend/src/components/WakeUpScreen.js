import React, { useEffect, useState } from 'react';

const BACKEND_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : '';

const messages = [
  'Starting up your inventory system…',
  'Connecting to the database…',
  'Almost there…',
  'Warming up the server…',
  'Just a few more seconds…',
];

export default function WakeUpScreen({ onReady }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots]         = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Cycle through friendly messages
    const msgTimer = setInterval(() => {
      setMsgIndex(i => (i + 1) % messages.length);
    }, 4000);

    // Animate dots
    const dotsTimer = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);

    return () => { clearInterval(msgTimer); clearInterval(dotsTimer); };
  }, []);

  useEffect(() => {
    let stopped = false;

    async function check() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`);
        if (res.ok && !stopped) {
          onReady();
          return;
        }
      } catch {}

      if (!stopped) {
        setAttempts(a => a + 1);
        setTimeout(check, 3000); // Retry every 3 seconds
      }
    }

    check();
    return () => { stopped = true; };
  }, [onReady]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #017d6e 0%, #02A793 50%, #04c9af 100%)',
      gap: 32,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36,
          margin: '0 auto 16px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          🌽
        </div>
        <div style={{ color: '#fff', fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>
          Rindex
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
          Inventory Management System
        </div>
      </div>

      {/* Spinner */}
      <div style={{
        width: 48, height: 48,
        border: '4px solid rgba(255,255,255,0.2)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
      }} />

      {/* Message */}
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
          {messages[msgIndex]}{dots}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 8 }}>
          {attempts < 3
            ? 'The server is starting up — this takes about 30 seconds on first load.'
            : attempts < 8
            ? 'Still loading… Railway free tier takes a moment to wake up.'
            : 'Taking longer than usual. Please wait or refresh the page.'}
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
