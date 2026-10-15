import React, { useState, useEffect } from 'react';

export default function AdminAppSplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Check if splash was already shown in this admin session
    const hasShown = sessionStorage.getItem('freshioz_admin_splash_shown');
    if (hasShown) {
      setIsVisible(false);
      return;
    }

    // Play splash sequence: animate 1.5s, then smooth fade-out over 0.5s
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1500);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('freshioz_admin_splash_shown', 'true');
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="admin-splash-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: 'linear-gradient(145deg, #0B1320 0%, #152238 50%, #080D16 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFading ? 0 : 1,
        transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isFading ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes adminOrangeRotateIn {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-180deg);
          }
          60% {
            opacity: 1;
            transform: scale(1.15) rotate(15deg);
          }
          80% {
            transform: scale(0.95) rotate(-5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes adminLeavesPop {
          0% {
            opacity: 0;
            transform: scale(0) translateY(10px);
          }
          70% {
            opacity: 1;
            transform: scale(1.25) translateY(-2px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
        @keyframes adminTextReveal {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
          }
        }
        @keyframes adminGlowAura {
          0%, 100% {
            opacity: 0.35;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.15);
          }
        }
        @keyframes adminSpinnerBar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>

      {/* Ambient Radial Backlight Glow */}
      <div
        style={{
          position: 'absolute',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(15, 23, 42, 0) 70%)',
          animation: 'adminGlowAura 2s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Animated Emblem: Rotating Citrus & Sprouting Leaves */}
      <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          viewBox="0 0 120 120"
          width="100"
          height="100"
          style={{ overflow: 'visible' }}
        >
          {/* Sprout Green Twin Leaves (pops after orange spins in) */}
          <g style={{ transformOrigin: '60px 38px', animation: 'adminLeavesPop 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both' }}>
            {/* Left Leaf */}
            <path
              d="M 58 38 C 48 20, 32 24, 34 38 C 36 46, 52 42, 58 38 Z"
              fill="url(#adminLeftLeaf)"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
            />
            {/* Right Leaf */}
            <path
              d="M 62 38 C 72 20, 88 24, 86 38 C 84 46, 68 42, 62 38 Z"
              fill="url(#adminRightLeaf)"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
            />
          </g>

          {/* Plump Rotating Citrus Fruit with specularity */}
          <g style={{ transformOrigin: '60px 72px', animation: 'adminOrangeRotateIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <circle
              cx="60"
              cy="72"
              r="34"
              fill="url(#adminOrangeGrad)"
              filter="drop-shadow(0 8px 16px rgba(0,0,0,0.5))"
            />
            {/* Specular White Shine Reflection */}
            <ellipse
              cx="50"
              cy="58"
              rx="9"
              ry="5"
              transform="rotate(-30 50 58)"
              fill="#FFFFFF"
              opacity="0.65"
            />
          </g>

          {/* Gradients */}
          <defs>
            <linearGradient id="adminOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFA726" />
              <stop offset="40%" stopColor="#FB8C00" />
              <stop offset="100%" stopColor="#E65100" />
            </linearGradient>
            <linearGradient id="adminLeftLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="adminRightLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typography Reveal: "Freshioz Admin" */}
      <div
        style={{
          marginTop: '16px',
          textAlign: 'center',
          animation: 'adminTextReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            Fresh<span style={{ color: '#FB8C00' }}>ioz</span>
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Admin
          </span>
        </div>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: '11px',
            fontWeight: 700,
            color: '#94A3B8',
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
          }}
        >
          Operations & Control Desk
        </p>
      </div>

      {/* Bottom Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          width: '120px',
          height: '3px',
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #10B981 0%, #F59E0B 100%)',
            borderRadius: '9999px',
            animation: 'adminSpinnerBar 1.4s ease-in-out forwards',
          }}
        />
      </div>
    </div>
  );
}
