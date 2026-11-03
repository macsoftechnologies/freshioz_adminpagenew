import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCheck, 
  LogOut, 
  User, 
  CreditCard, 
  Settings, 
  TrendingUp, 
  ExternalLink, 
  ChevronDown
} from 'lucide-react';
import FreshiozLogo from '../common/FreshiozLogo';
import PaymentGatewaySettingsModal from '../common/PaymentGatewaySettingsModal';
import { useAdminRole, ROLES } from '../../context/AdminRoleContext';

export default function AdminTopBar({ onMobileMenuClick }) {
  const navigate = useNavigate();
  const { 
    currentRoleId, 
    setRole, 
    currentUser, 
    requestLogout, 
    allowedRoles, 
    canSwitchRoles,
  } = useAdminRole();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOpenPaymentModal = () => navigate('/settings');
    window.addEventListener('open_payment_gateway_settings', handleOpenPaymentModal);
    return () => window.removeEventListener('open_payment_gateway_settings', handleOpenPaymentModal);
  }, []);

  const handleLogout = () => {
    setIsProfileDropdownOpen(false);
    requestLogout();
  };

  const handleOpenExecutiveMis = () => {
    setIsProfileDropdownOpen(false);
    window.open('/admin/executive-mis', '_blank');
  };

  return (
    <header className="admin-topbar">
      {/* Left Branding */}
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

      {/* Right Controls */}
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
        {/* Dynamic Role Switcher Pill - visible to multi-role or Super Admin users */}
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

        {/* Interactive User Profile Chip & Dropdown Menu */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isProfileDropdownOpen ? '#E2E8F0' : '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '9999px',
              padding: '4px 12px 4px 5px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            title="Account & Executive Menu"
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#234B3C',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800
            }}>
              {currentUser?.avatar || 'SA'}
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser?.name?.split(' ')[0] || 'Super Admin'}
            </div>
            <ChevronDown size={14} color="#64748B" style={{ transform: isProfileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileDropdownOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: '280px',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
              zIndex: 9999,
              padding: '10px',
              boxSizing: 'border-box',
            }}>
              {/* Profile Card Header */}
              <div style={{ padding: '8px 10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                  {currentUser?.name || 'Super Admin'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 8px' }}>
                  {currentUser?.email || 'superadmin@gmail.com'}
                </div>
                <span style={{
                  display: 'inline-block',
                  background: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #A7F3D0',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  {ROLES[currentRoleId]?.label || 'Super Admin'}
                </span>
              </div>

              {/* Menu Links */}
              <div style={{ padding: '8px 0' }}>
                {/* Executive MIS Command Center Link */}
                {(currentRoleId === 'SUPER_ADMIN' || currentRoleId === 'WAREHOUSE_MANAGER') && (
                  <button
                    type="button"
                    onClick={handleOpenExecutiveMis}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(35, 75, 60, 0.06)',
                      border: '1px solid rgba(35, 75, 60, 0.15)',
                      color: '#234B3C',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={16} color="#234B3C" />
                      <div>
                        <div>Executive Analytics & MIS ↗</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                          Opens in New Browser Tab
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={14} color="#234B3C" />
                  </button>
                )}
              </div>

              {/* Sign Out Action */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    color: '#DC2626',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={15} color="#DC2626" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Direct Logout Button */}
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
