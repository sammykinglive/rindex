import React, { useEffect, useState, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : '';

// ── Background floating icons (SVG paths) ─────────────────────────────────────
const BG_ICONS = [
  // Box/Package
  { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12', size: 28 },
  // Truck
  { d: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', size: 32 },
  // BarChart
  { d: 'M12 20V10M18 20V4M6 20v-4', size: 24 },
  // Clipboard
  { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM12 11h4M12 16h4M8 11h.01M8 16h.01', size: 26 },
  // Settings/Gear
  { d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z', size: 26 },
  // Users/Team
  { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', size: 28 },
  // Calendar
  { d: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18', size: 26 },
  // MapPin/Location
  { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', size: 24 },
  // TrendingUp
  { d: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6', size: 28 },
  // FileText/Document
  { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8', size: 24 },
  // Bell/Notification
  { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0', size: 24 },
  // PieChart
  { d: 'M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z', size: 26 },
  // Warehouse
  { d: 'M22 20v-9H2v9a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1zM2 11l10-9 10 9M12 2v9M8 14v6M16 14v6M4 14v6M20 14v6', size: 28 },
  // QR/Barcode
  { d: 'M3 3h7v7H3zM3 14h7v7H3zM14 3h7v7h-7zM14 14h3v3h-3zM17 17h3v3h-3zM20 14h1v1h-1z', size: 24 },
  // Dashboard
  { d: 'M3 13h8V3H3zM3 21h8v-6H3zM13 21h8v-8h-8zM13 3v6h8V3z', size: 24 },
];

// Deterministic layout — same positions every render
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: ((i * 37 + 11) % 97),
  top:  ((i * 53 + 7)  % 93),
  size: BG_ICONS[i % BG_ICONS.length].size,
  d:    BG_ICONS[i % BG_ICONS.length].d,
  dur:  14 + (i % 7) * 2,
  del:  (i % 6) * -2.5,
  dx:   (i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 3),
  dy:   (i % 3 === 0 ? 1 : -1) * (6 + (i % 4) * 2),
}));

// ── Product cards data ─────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    key: 'inventory',
    label: 'Inventory',
    sub: 'Management System',
    available: true,
    gradient: ['#02A793', '#017d6e'],
    wave: '#01927f',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={40} height={40}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    key: 'fleet',
    label: 'Fleet',
    sub: 'Management System',
    available: false,
    gradient: ['#2d6a4f', '#1b4332'],
    wave: '#1b4332',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={40} height={40}>
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    key: 'productivity',
    label: 'Productivity',
    sub: 'System',
    available: false,
    gradient: ['#b5830a', '#7d5a05'],
    wave: '#7d5a05',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={40} height={40}>
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
        <polyline points="22 20 2 20"/>
        <polyline points="14 6 18 2 22 6"/>
      </svg>
    ),
  },
];

// ── Wave SVG ──────────────────────────────────────────────────────────────────
function Wave({ color }) {
  return (
    <svg viewBox="0 0 400 80" preserveAspectRatio="none" style={{ width:'100%', height:70, display:'block', marginTop:'auto' }}>
      <path d="M0,40 C80,10 160,70 240,40 C320,10 360,60 400,40 L400,80 L0,80 Z" fill={color} opacity="0.6"/>
      <path d="M0,55 C60,30 140,75 220,50 C300,25 360,65 400,50 L400,80 L0,80 Z" fill={color} opacity="0.9"/>
    </svg>
  );
}

// ── Loading overlay ───────────────────────────────────────────────────────────
function LoadingOverlay() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 85) { clearInterval(t); return p; }
        return p + (Math.random() * 8 + 2);
      });
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:100,
      background:'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1f2e 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:32,
    }}>
      {/* Logo */}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:42, fontWeight:900, color:'#fff', letterSpacing:'-2px', marginBottom:4 }}>
          Rindex
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', letterSpacing:'2px', textTransform:'uppercase' }}>
          Inventory Management
        </div>
      </div>

      {/* Animated ring */}
      <div style={{ position:'relative', width:72, height:72 }}>
        <svg viewBox="0 0 72 72" style={{ width:72, height:72, animation:'spin 1.4s linear infinite' }}>
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(2,167,147,0.15)" strokeWidth="4"/>
          <circle cx="36" cy="36" r="30" fill="none" stroke="#02A793" strokeWidth="4"
            strokeDasharray="48 140" strokeLinecap="round"/>
        </svg>
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          color:'#02A793', fontSize:13, fontWeight:700,
        }}>
          {Math.min(Math.round(progress), 99)}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width:220, height:2, background:'rgba(255,255,255,0.1)', borderRadius:99, overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${Math.min(progress,99)}%`,
          background:'linear-gradient(90deg, #02A793, #04c9af)',
          borderRadius:99, transition:'width 0.4s ease',
        }}/>
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WakeUpScreen({ onReady }) {
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const stoppedRef = useRef(false);

  // Silently ping backend; call onReady when it responds
  function startInventory() {
    setLoading(true);
    stoppedRef.current = false;

    // Clear expired token
    try {
      const token = localStorage.getItem('rindex_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('rindex_token');
          localStorage.removeItem('rindex_user');
        }
      }
    } catch {}

    async function check() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`);
        if (res.ok && !stoppedRef.current) { onReady(); return; }
      } catch {}
      if (!stoppedRef.current) setTimeout(check, 3000);
    }
    check();
  }

  useEffect(() => () => { stoppedRef.current = true; }, []);

  return (
    <div style={{
      minHeight:'100vh', position:'relative', overflow:'hidden',
      background:'linear-gradient(135deg, #0a1628 0%, #0d2137 60%, #081520 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'40px 20px',
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    }}>

      {loading && <LoadingOverlay />}

      {/* ── Animated background icons ───────────────────────────────── */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} aria-hidden>
        {PARTICLES.map((p, i) => (
          <g key={i} style={{ animation:`float${i%4} ${p.dur}s ease-in-out ${p.del}s infinite` }}>
            <svg x={`${p.left}%`} y={`${p.top}%`} width={p.size} height={p.size} viewBox="0 0 24 24"
              fill="none" stroke="rgba(2,167,147,0.12)" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round" overflow="visible">
              <path d={p.d}/>
            </svg>
          </g>
        ))}
      </svg>

      {/* Glow orbs */}
      <div style={{ position:'absolute', top:'15%', left:'10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(2,167,147,0.08) 0%, transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:'20%', right:'8%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(4,201,175,0.06) 0%, transparent 70%)', pointerEvents:'none' }}/>

      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div style={{ textAlign:'center', marginBottom:56, position:'relative', zIndex:2 }}>
        <div style={{ fontSize:52, fontWeight:900, color:'#fff', letterSpacing:'-2.5px', lineHeight:1, marginBottom:10 }}>
          Rindex
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', letterSpacing:'3px', textTransform:'uppercase', fontWeight:500 }}>
          Business Management Platform
        </div>
        {/* Teal underline accent */}
        <div style={{ width:48, height:3, background:'linear-gradient(90deg, #02A793, #04c9af)', borderRadius:99, margin:'14px auto 0' }}/>
      </div>

      {/* ── Product cards ─────────────────────────────────────────────── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(3, 1fr)',
        gap:24, width:'100%', maxWidth:900,
        position:'relative', zIndex:2,
      }} className="rindex-cards-grid">
        {PRODUCTS.map(p => {
          const isHovered = hoveredCard === p.key;
          return (
            <div
              key={p.key}
              onClick={() => p.available && startInventory()}
              onMouseEnter={() => setHoveredCard(p.key)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                position:'relative', overflow:'hidden',
                borderRadius:20,
                background:`linear-gradient(160deg, ${p.gradient[0]}22 0%, ${p.gradient[1]}44 100%)`,
                border: isHovered && p.available
                  ? `1.5px solid ${p.gradient[0]}88`
                  : '1.5px solid rgba(255,255,255,0.08)',
                cursor: p.available ? 'pointer' : 'default',
                transition:'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                transform: isHovered && p.available ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                boxShadow: isHovered && p.available
                  ? `0 24px 60px rgba(0,0,0,0.5), 0 0 40px ${p.gradient[0]}30`
                  : '0 8px 32px rgba(0,0,0,0.3)',
                display:'flex', flexDirection:'column', minHeight:280,
                backdropFilter:'blur(12px)',
              }}
            >
              {/* Coming soon badge */}
              {!p.available && (
                <div style={{
                  position:'absolute', top:16, right:16, zIndex:3,
                  fontSize:10, fontWeight:700, letterSpacing:'1px',
                  color:'rgba(255,255,255,0.5)',
                  background:'rgba(255,255,255,0.08)',
                  border:'1px solid rgba(255,255,255,0.12)',
                  borderRadius:99, padding:'3px 10px', textTransform:'uppercase',
                }}>
                  Coming Soon
                </div>
              )}

              {/* Card body */}
              <div style={{ padding:'32px 28px 16px', flex:1, display:'flex', flexDirection:'column', gap:16 }}>
                {/* Icon box */}
                <div style={{
                  width:64, height:64, borderRadius:16,
                  background: p.available
                    ? `linear-gradient(135deg, ${p.gradient[0]} 0%, ${p.gradient[1]} 100%)`
                    : 'rgba(255,255,255,0.07)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: p.available ? '#fff' : 'rgba(255,255,255,0.35)',
                  boxShadow: p.available ? `0 8px 24px ${p.gradient[0]}44` : 'none',
                  transition:'transform 0.3s ease',
                  transform: isHovered && p.available ? 'scale(1.08)' : 'scale(1)',
                }}>
                  {p.icon}
                </div>

                {/* Label */}
                <div>
                  <div style={{
                    fontSize:20, fontWeight:800,
                    color: p.available ? '#fff' : 'rgba(255,255,255,0.4)',
                    letterSpacing:'-0.5px', lineHeight:1.2, marginBottom:4,
                  }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', fontWeight:400 }}>
                    {p.sub}
                  </div>
                </div>
              </div>

              {/* Wave + arrow row */}
              <div style={{ position:'relative' }}>
                <Wave color={p.wave}/>
                <div style={{
                  position:'absolute', bottom:16, right:20,
                  width:36, height:36, borderRadius:'50%',
                  background: p.available ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: p.available ? '#fff' : 'rgba(255,255,255,0.2)',
                  transition:'transform 0.3s ease, background 0.3s ease',
                  transform: isHovered && p.available ? 'translateX(3px)' : 'none',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div style={{ marginTop:48, fontSize:12, color:'rgba(255,255,255,0.2)', position:'relative', zIndex:2, letterSpacing:'0.5px' }}>
        © {new Date().getFullYear()} Rindex · All rights reserved
      </div>

      {/* ── Styles ────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes float0 {
          0%,100% { transform: translate(0px, 0px) rotate(0deg); }
          33%      { transform: translate(12px, -18px) rotate(5deg); }
          66%      { transform: translate(-8px, 10px) rotate(-3deg); }
        }
        @keyframes float1 {
          0%,100% { transform: translate(0px, 0px) rotate(0deg); }
          33%      { transform: translate(-15px, 12px) rotate(-6deg); }
          66%      { transform: translate(10px, -8px) rotate(4deg); }
        }
        @keyframes float2 {
          0%,100% { transform: translate(0px, 0px); }
          50%      { transform: translate(18px, -14px) rotate(8deg); }
        }
        @keyframes float3 {
          0%,100% { transform: translate(0px, 0px); }
          50%      { transform: translate(-12px, 16px) rotate(-5deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .rindex-cards-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
          }
        }
        @media (max-width: 480px) {
          .rindex-cards-grid {
            grid-template-columns: 1fr !important;
            max-width: 340px !important;
          }
        }
      `}</style>
    </div>
  );
}
