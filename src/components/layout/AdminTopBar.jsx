import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Clock, LogOut, User } from 'lucide-react';
import FreshiozLogo from '../common/FreshiozLogo';
import { useAdminRole, ROLES } from '../../context/AdminRoleContext';
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL } from '../../api/client';

export default function AdminTopBar({ onMobileMenuClick }) {
  const navigate = useNavigate();
  const { currentRoleId, setRole, currentUser, requestLogout, allowedRoles, canSwitchRoles } = useAdminRole();
  const { showToast } = useToast();
  const [isBackendOnline, setIsBackendOnline] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
        if (mounted) setIsBackendOnline(res.ok);
      } catch (e) {
        if (mounted) setIsBackendOnline(false);
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
        {/* Dynamic Live Backend Indicator Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isBackendOnline ? '#ECFDF5' : '#FEF2F2',
            border: isBackendOnline ? '1px solid #A7F3D0' : '1px solid #FECACA',
            color: isBackendOnline ? '#065F46' : '#991B1B',
            padding: '3px 9px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700
          }}
          title={isBackendOnline ? 'Backend: NestJS on :5000 | PostgreSQL Connected | Asia/Kolkata (IST)' : 'Backend Offline - Check NestJS server on port 5000'}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isBackendOnline ? '#10B981' : '#EF4444',
              display: 'inline-block',
              boxShadow: isBackendOnline ? '0 0 6px #10B981' : '0 0 6px #EF4444',
            }}
          />
          <span>{isBackendOnline ? 'NestJS Live (IST)' : 'Backend Offline'}</span>
        </div>
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
    </header>
  );
}
