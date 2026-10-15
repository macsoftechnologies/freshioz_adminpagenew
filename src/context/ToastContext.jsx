import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast = { id, message, type };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
    return id;
  }, [hideToast]);

  useEffect(() => {
    const handleSyncError = (e) => {
      const errMsg = e.detail || 'Database synchronization failed.';
      showToast(`Database Sync Error: ${errMsg}`, 'error', 6000);
    };
    window.addEventListener('freshioz_sync_error', handleSyncError);
    return () => window.removeEventListener('freshioz_sync_error', handleSyncError);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toasts }}>
      {children}

      {/* Floating Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
          maxWidth: '420px',
          width: 'calc(100% - 40px)'
        }}
        aria-live="polite"
      >
        {toasts.map(toast => {
          let bg = '#FFFFFF';
          let border = '#CBD5E1';
          let iconColor = '#059669';
          let IconComp = CheckCircle2;
          let title = 'Success';

          if (toast.type === 'error') {
            border = '#F87171';
            iconColor = '#DC2626';
            IconComp = AlertCircle;
            title = 'Error';
          } else if (toast.type === 'warning') {
            border = '#FBBF24';
            iconColor = '#D97706';
            IconComp = AlertTriangle;
            title = 'Notice';
          } else if (toast.type === 'info') {
            border = '#60A5FA';
            iconColor = '#2563EB';
            IconComp = Info;
            title = 'Info';
          }

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                background: bg,
                border: `1.5px solid ${border}`,
                borderLeft: `5px solid ${iconColor}`,
                borderRadius: '10px',
                padding: '12px 14px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                animation: 'adminToastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ color: iconColor, flexShrink: 0, marginTop: '1px' }}>
                  <IconComp size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: iconColor, letterSpacing: '0.4px' }}>
                    {title}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px', lineHeight: 1.35 }}>
                    {toast.message}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => hideToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
