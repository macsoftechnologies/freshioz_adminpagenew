import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  X, 
  LayoutDashboard, 
  CheckCircle, 
  Warehouse, 
  Tags, 
  Coins, 
  MapPin, 
  FilePlus, 
  ShoppingCart, 
  ClipboardList, 
  Truck, 
  Building2,
  Users, 
  Database, 
  Store, 
  LogOut,
  ShieldCheck,
  Receipt,
  PackageCheck
} from 'lucide-react';
import FreshiozLogo from '../common/FreshiozLogo';
import { useAdminRole, ROLES } from '../../context/AdminRoleContext';
import { useToast } from '../../context/ToastContext';

export default function AdminMobileDrawer() {
  const { 
    isMobileDrawerOpen, 
    setIsMobileDrawerOpen, 
    currentRoleId, 
    setRole, 
    currentUser, 
    requestLogout,
    store,
    allowedRoles,
    canSwitchRoles
  } = useAdminRole();
  const location = useLocation();
  const { showToast } = useToast();

  if (!isMobileDrawerOpen) return null;

  const isWarehouseRoute = location.pathname.startsWith('/warehouse');
  const pendingSocietiesCount = (store.societies || []).filter(s => s.status === 'PENDING').length;
  const pendingWithdrawalsCount = (store.withdrawals || []).filter(w => w.status === 'PENDING_APPROVAL').length;
  const inboundLeadsCount = (store.societyRequests || []).filter(r => r.status !== 'CONVERTED' && r.status !== 'REJECTED').length;

  const handleClose = () => {
    setIsMobileDrawerOpen(false);
  };

  const handleLogout = () => {
    handleClose();
    requestLogout();
  };

  return (
    <div className="admin-drawer-backdrop" onClick={handleClose}>
      <div className="admin-drawer-sidebar" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#142C22'
        }}>
          <FreshiozLogo height={32} showTagline={false} variant="white" />
          <button
            type="button"
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Close Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Role Card */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#234B3C',
              border: '1.5px solid #78B159',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '13px'
            }}>
              {currentUser?.avatar || 'AD'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '11px', color: '#97BCA6', marginTop: '1px' }}>
                {ROLES[currentRoleId]?.label || currentRoleId}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links Scroll Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {/* ================= SUPER ADMIN ONLY ================= */}
          {currentRoleId === 'SUPER_ADMIN' && (
            <>
              <div className="drawer-nav-section-title">Executive Analytics</div>
              <NavLink to="/dashboard" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={17} />
                <span>Operations Graphs</span>
              </NavLink>

              <div className="drawer-nav-section-title">Master Management</div>
              <NavLink to="/employees" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Users size={17} />
                <span style={{ flex: 1 }}>Staff & Multi-Roles</span>
                <span style={{ background: '#78B159', color: '#13281E', fontSize: '9.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>
                  MAIN
                </span>
              </NavLink>

              <NavLink to="/master-data#produce" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Database size={17} />
                <span>Master Data Catalog</span>
              </NavLink>

              <div className="drawer-nav-section-title">Logistics & Fulfillment</div>
              <NavLink to="/warehouse-settings" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive || isWarehouseRoute ? 'active' : ''}`}>
                <Warehouse size={17} />
                <span>Warehouses & Hubs</span>
              </NavLink>

              <NavLink to="/orders-fulfillment" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Truck size={17} />
                <span>Orders Fulfillment</span>
              </NavLink>

              <div className="drawer-nav-section-title">Field & Community Approvals</div>
              <NavLink to="/approvals" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <CheckCircle size={17} />
                <span style={{ flex: 1 }}>Society Approvals</span>
                {pendingSocietiesCount > 0 && (
                  <span style={{ background: '#F28E14', color: '#FFF', fontSize: '10.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '9999px' }}>
                    {pendingSocietiesCount}
                  </span>
                )}
              </NavLink>

              <NavLink to="/payouts" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Coins size={17} />
                <span style={{ flex: 1 }}>Society Payouts</span>
                {pendingWithdrawalsCount > 0 && (
                  <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '10.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '9999px' }}>
                    {pendingWithdrawalsCount}
                  </span>
                )}
              </NavLink>

              <NavLink to="/inbound-leads" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Users size={17} />
                <span style={{ flex: 1 }}>Resident Inbound Requests</span>
                {inboundLeadsCount > 0 && (
                  <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '10.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '9999px' }}>
                    {inboundLeadsCount}
                  </span>
                )}
              </NavLink>

              <div className="drawer-nav-section-title">Pricing & Mandi Audits</div>
              <NavLink to="/daily-pricing" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Tags size={17} />
                <span>Daily Rates & GST</span>
              </NavLink>

              <NavLink to="/procurement-logs" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <ClipboardList size={17} />
                <span>Mandi Purchases Audit</span>
              </NavLink>

              <NavLink to="/transactions" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Receipt size={17} />
                <span>Payment & Spent Ledger</span>
              </NavLink>
            </>
          )}

          {/* ================= FIELD SALES OFFICER ================= */}
          {currentRoleId === 'SALES_OFFICER' && (
            <>
              <div className="drawer-nav-section-title">Field Sales Workdesk</div>
              <NavLink to="/sales-onboarding" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <FilePlus size={17} />
                <span>Onboard Society / Hostel</span>
              </NavLink>
              <NavLink to="/sales-my-societies" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Building2 size={17} />
                <span>My Submitted Societies</span>
              </NavLink>
              <NavLink to="/inbound-leads" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Users size={17} />
                <span style={{ flex: 1 }}>Resident Inbound Requests</span>
                {inboundLeadsCount > 0 && (
                  <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '10.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '9999px' }}>
                    {inboundLeadsCount}
                  </span>
                )}
              </NavLink>
            </>
          )}

          {/* ================= WAREHOUSE STAFF / PACKER ================= */}
          {currentRoleId === 'WAREHOUSE_STAFF' && (
            <>
              <div className="drawer-nav-section-title">Sorting & Packing Desk</div>
              <NavLink to="/warehouse-crating" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <PackageCheck size={17} />
                <span>Crating & Society Packing</span>
              </NavLink>
              <NavLink to="/orders-fulfillment" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Truck size={17} />
                <span>Live Orders Packing Queue</span>
              </NavLink>
            </>
          )}

          {/* ================= PROCUREMENT OFFICER ================= */}
          {currentRoleId === 'PROCUREMENT_OFFICER' && (
            <>
              <div className="drawer-nav-section-title">Mandi Sourcing & Procurement</div>
              <NavLink to="/procurement-demand" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <ClipboardList size={17} />
                <span>Mandi Demand (Stock Net)</span>
              </NavLink>
              <NavLink to="/procurement-entry" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <FilePlus size={17} />
                <span>Log Mandi Bill & Transport</span>
              </NavLink>
              <NavLink to="/procurement-logs" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <FileText size={17} />
                <span>Mandi Purchases Ledger</span>
              </NavLink>
              <NavLink to="/vendors" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Store size={17} />
                <span>Vendors & Farmers Directory</span>
              </NavLink>
              <NavLink to="/daily-pricing" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Coins size={17} />
                <span>Daily Dynamic Pricing</span>
              </NavLink>
              <NavLink to="/transactions" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Receipt size={17} />
                <span>Payment & Spent Ledger</span>
              </NavLink>
            </>
          )}

          {/* ================= WAREHOUSE MANAGER ================= */}
          {currentRoleId === 'WAREHOUSE_MANAGER' && (
            <>
              <div className="drawer-nav-section-title">Warehouse Operations</div>
              <NavLink to="/procurement-demand" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <ClipboardList size={17} />
                <span>Mandi Demand (Stock Net)</span>
              </NavLink>
              <NavLink to="/procurement-entry" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <FilePlus size={17} />
                <span>Log Mandi Bill & Transport</span>
              </NavLink>
              <NavLink to="/procurement-logs" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <FileText size={17} />
                <span>Mandi Purchases Ledger</span>
              </NavLink>
              <NavLink to="/warehouse-crating" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <PackageCheck size={17} />
                <span>Society Packing & Crating</span>
              </NavLink>
              <NavLink to="/vendors" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Store size={17} />
                <span>Vendors & Farmers Directory</span>
              </NavLink>
              <NavLink to="/orders-fulfillment" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Truck size={17} />
                <span>Live Order Tracking</span>
              </NavLink>
              <NavLink to="/transactions" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Receipt size={17} />
                <span>Payment & Spent Ledger</span>
              </NavLink>
              <NavLink to="/warehouse-settings" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive || isWarehouseRoute ? 'active' : ''}`}>
                <Warehouse size={17} />
                <span>Cut-Off Time & Slots</span>
              </NavLink>
            </>
          )}

          {/* ================= DELIVERY EXECUTIVE ================= */}
          {currentRoleId === 'DELIVERY_EXECUTIVE' && (
            <>
              <div className="drawer-nav-section-title">Rider Delivery Desk</div>
              <NavLink to="/orders-fulfillment" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Truck size={17} />
                <span>Morning Route Manifest</span>
              </NavLink>
            </>
          )}
        </div>

        {/* Drawer Bottom Quick Desk Switcher & Logout */}
        <div style={{
          padding: '14px 16px',
          background: '#13281E',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {canSwitchRoles && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>
                Switch Active Workdesk:
              </div>
              <select
                value={currentRoleId}
                onChange={(e) => {
                  setRole(e.target.value);
                  handleClose();
                }}
                style={{
                  width: '100%',
                  background: '#1E3E31',
                  color: '#FFFFFF',
                  border: '1px solid #325A4A',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none'
                }}
              >
                {allowedRoles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#991B1B',
              color: '#FFF',
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
