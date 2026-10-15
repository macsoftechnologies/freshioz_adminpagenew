import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import FreshiozLogo from '../common/FreshiozLogo';
import { useAdminRole, ROLES } from '../../context/AdminRoleContext';
import { useToast } from '../../context/ToastContext';

export default function AdminMobileHeader() {
  const navigate = useNavigate();
  const { currentRoleId, setRole, requestLogout, setIsMobileDrawerOpen, allowedRoles, canSwitchRoles } = useAdminRole();
  const { showToast } = useToast();

  const handleLogout = () => {
    requestLogout();
  };

  return (
    <header className="admin-mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          style={{
            background: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1E293B',
            cursor: 'pointer'
          }}
          title="Open Full Navigation Menu"
        >
          <Menu size={18} />
        </button>
        <FreshiozLogo height={38} showTagline={false} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {canSwitchRoles ? (
          <select
            value={currentRoleId}
            onChange={(e) => setRole(e.target.value)}
            style={{
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '9999px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#234B3C',
              outline: 'none',
              maxWidth: '140px'
            }}
          >
            {allowedRoles.map(r => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        ) : (
          <span style={{
            background: '#EBF2EE',
            border: '1px solid #C8DBD0',
            color: '#234B3C',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '10.5px',
            fontWeight: 800
          }}>
            {ROLES[currentRoleId]?.label}
          </span>
        )}

        <button
          type="button"
          onClick={handleLogout}
          title="Sign out of operations session"
          style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
