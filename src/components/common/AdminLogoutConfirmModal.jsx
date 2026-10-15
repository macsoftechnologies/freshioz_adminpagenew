import React from 'react';
import { LogOut, X } from 'lucide-react';
import { useAdminRole } from '../../context/AdminRoleContext';

export default function AdminLogoutConfirmModal() {
  const { 
    isLogoutModalOpen, 
    setIsLogoutModalOpen, 
    confirmLogout, 
    currentUser, 
    currentRoleId 
  } = useAdminRole();

  if (!isLogoutModalOpen) return null;

  return (
    <div 
      className="admin-modal-overlay" 
      style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.75)' }}
    >
      <div 
        className="admin-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '440px', 
          border: '2px solid #E2E8F0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          padding: '24px 26px',
          animation: 'adminModalEnter 0.2s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <LogOut size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Sign Out of Operations Desk?
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Are you sure you want to end your active session?
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          background: '#F8FAFC',
          borderRadius: '10px',
          border: '1.5px solid #E2E8F0',
          padding: '12px 14px',
          marginBottom: '20px',
          fontSize: '12.5px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Active Personnel:</span>
            <span style={{ color: '#0F172A', fontWeight: 800 }}>{currentUser?.name || 'Staff Member'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Email / Login ID:</span>
            <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser?.email || 'superadmin@gmail.com'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Active Desk:</span>
            <span style={{ color: '#234B3C', fontWeight: 800 }}>{currentRoleId.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1.5px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#475569',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            No, Stay Signed In
          </button>
          <button
            type="button"
            onClick={confirmLogout}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={15} />
            <span>Yes, Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
