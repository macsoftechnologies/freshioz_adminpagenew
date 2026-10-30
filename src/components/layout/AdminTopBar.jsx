import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Clock, LogOut, User, CreditCard, Settings } from 'lucide-react';
import FreshiozLogo from '../common/FreshiozLogo';
import PaymentGatewaySettingsModal from '../common/PaymentGatewaySettingsModal';
import { useAdminRole, ROLES } from '../../context/AdminRoleContext';
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL } from '../../api/client';

export default function AdminTopBar({ onMobileMenuClick }) {
  const navigate = useNavigate();
  const { 
    currentRoleId, 
    setRole, 
    currentUser, 
    requestLogout, 
    allowedRoles, 
    canSwitchRoles,
    hasApiError,
    apiErrorMessage,
    refetchAll
  } = useAdminRole();
  const { showToast } = useToast();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [healthStatus, setHealthStatus] = React.useState({
    isOnline: true,
    isDatabaseConnected: true,
    latencyMs: 0,
    message: 'NestJS Live (IST)'
  });

  React.useEffect(() => {
    const handleOpenPaymentModal = () => setIsPaymentModalOpen(true);
    window.addEventListener('open_payment_gateway_settings', handleOpenPaymentModal);
    return () => window.removeEventListener('open_payment_gateway_settings', handleOpenPaymentModal);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        // Probe /health/ready which specifically asserts database connectivity
        const res = await fetch(`${API_BASE_URL}/health/ready`, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (mounted) {
            setHealthStatus({
              isOnline: true,
              isDatabaseConnected: data.database === 'connected',
              latencyMs: data.latencyMs || 0,
              message: 'NestJS Live (IST)'
            });
          }
        } else {
          // If readiness fails (e.g. 503 DB down or other error), check liveness to distinguish process vs DB
          const liveRes = await fetch(`${API_BASE_URL}/health/live`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
          if (mounted) {
            if (liveRes && liveRes.ok) {
              setHealthStatus({
                isOnline: true,
                isDatabaseConnected: false,
                latencyMs: 0,
                message: 'PostgreSQL Disconnected'
              });
            } else {
              setHealthStatus({
                isOnline: false,
                isDatabaseConnected: false,
                latencyMs: 0,
                message: 'Backend Offline'
              });
            }
          }
        }
      } catch (e) {
        if (mounted) {
          setHealthStatus({
            isOnline: false,
            isDatabaseConnected: false,
            latencyMs: 0,
            message: 'Backend Offline'
          });
        }
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    requestLogout();
  };

  return (
    <header className="admin-topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <FreshiozLogo height={40} showTagline={false} />
        <div style={{ borderLeft: '1.5px solid #CBD5E1', paddingLeft: '12px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 800, letterSpacing: '0.5px' }}>
            Freshioz Operations Desk
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#234B3C', lineHeight: 1.2 }}>
            {ROLES[currentRoleId]?.label} Desk
          </div>
        </div>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Dynamic Live Backend & Database Indicator Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: !healthStatus.isOnline 
              ? '#FEF2F2' 
              : (!healthStatus.isDatabaseConnected ? '#FFFBEB' : '#ECFDF5'),
            border: !healthStatus.isOnline 
              ? '1px solid #FECACA' 
              : (!healthStatus.isDatabaseConnected ? '1px solid #FCD34D' : '1px solid #A7F3D0'),
            color: !healthStatus.isOnline 
              ? '#991B1B' 
              : (!healthStatus.isDatabaseConnected ? '#92400E' : '#065F46'),
            padding: '3px 9px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700
          }}
          title={
            !healthStatus.isOnline
              ? 'Backend Offline - Cannot reach NestJS API server on :5000'
              : (!healthStatus.isDatabaseConnected
                  ? 'PostgreSQL Disconnected - Database connection check failed'
                  : `Backend: NestJS on :5000 | PostgreSQL Connected (${healthStatus.latencyMs}ms) | Asia/Kolkata (IST)`)
          }
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: !healthStatus.isOnline 
                ? '#EF4444' 
                : (!healthStatus.isDatabaseConnected ? '#D97706' : '#10B981'),
              display: 'inline-block',
              boxShadow: !healthStatus.isOnline 
                ? '0 0 6px #EF4444' 
                : (!healthStatus.isDatabaseConnected ? '0 0 6px #D97706' : '0 0 6px #10B981'),
            }}
          />
          <span>{healthStatus.message}</span>
        </div>

        {hasApiError && (
          <div
            onClick={() => refetchAll && refetchAll()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              padding: '3px 9px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title={`API Outage Detected: ${apiErrorMessage || 'Failed to fetch live records'}. Click to retry.`}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#EF4444',
                display: 'inline-block',
                boxShadow: '0 0 6px #EF4444',
              }}
            />
            <span>API Outage Detected (Retry)</span>
          </div>
        )}
        {/* Dynamic Role Switcher Pill - ONLY visible to multi-role or Super Admin users */}
        {canSwitchRoles ? (
          <div className="role-switcher-box" title="Switch between your assigned operational workdesks">
            <UserCheck size={15} color="#234B3C" />
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Switch:</span>
            <select
              className="role-select-input"
              value={currentRoleId}
              onChange={(e) => setRole(e.target.value)}
            >
              {allowedRoles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#334155',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: 800
            }}
            title="Single-role account (locked to assigned operational desk)"
          >
            <UserCheck size={13} color="#234B3C" />
            <span>{ROLES[currentRoleId]?.label || 'Assigned Desk'}</span>
          </div>
        )}

        {/* Super Admin Payment Gateway Settings */}
        {currentRoleId === 'SUPER_ADMIN' && (
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            title="Configure Razorpay Payment Gateway & API Keys"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#F0FDF4',
              color: '#166534',
              fontSize: '12px',
              fontWeight: 700,
              border: '1px solid #BBF7D0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Settings size={14} color="#166534" />
            <span>Settings & Gateway</span>
          </button>
        )}

        {/* Current User Chip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '9999px',
          padding: '3px 10px 3px 4px'
        }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#234B3C',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 800
          }}>
            {currentUser?.avatar || 'VR'}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser?.name?.split(' ')[0] || 'User'}
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          title="Sign out of operations session"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: '#FEE2E2',
            color: '#B91C1C',
            fontSize: '12px',
            fontWeight: 700,
            border: '1px solid #FECACA',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          <LogOut size={13} />
          <span>Logout</span>
        </button>
      </div>

      <PaymentGatewaySettingsModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </header>
  );
}
