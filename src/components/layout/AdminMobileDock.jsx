import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckCircle, 
  Coins, 
  Warehouse, 
  FilePlus, 
  Building2, 
  ClipboardList, 
  Truck,
  Users,
  Store,
  Menu
} from 'lucide-react';
import { useAdminRole } from '../../context/AdminRoleContext';

export default function AdminMobileDock() {
  const { currentRoleId, store, setIsMobileDrawerOpen } = useAdminRole();
  const location = useLocation();
  const isWarehouseRoute = location.pathname.startsWith('/warehouse');

  const pendingCount = (store.societies || []).filter(s => s.status === 'PENDING').length;
  const inboundLeadsCount = (store.societyRequests || []).filter(r => r.status !== 'CONVERTED' && r.status !== 'REJECTED').length;

  return (
    <nav className="admin-mobile-dock" aria-label="Admin Mobile Navigation">
      {/* Super Admin Tabs */}
      {currentRoleId === 'SUPER_ADMIN' && (
        <>
          <NavLink to="/dashboard" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Graphs</span>
          </NavLink>
          <NavLink to="/employees" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            <span>Staff</span>
          </NavLink>
          <NavLink to="/approvals" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={18} />
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-7px',
                  background: '#F28E14',
                  color: '#FFF',
                  fontSize: '9px',
                  fontWeight: 800,
                  borderRadius: '9999px',
                  minWidth: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 2px'
                }}>
                  {pendingCount}
                </span>
              )}
            </div>
            <span>Approvals</span>
          </NavLink>
          <NavLink to="/orders-fulfillment" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <Truck size={18} />
            <span>Orders</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="admin-dock-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={18} />
            <span>All Desks</span>
          </button>
        </>
      )}

      {/* Field Sales Officer Tabs */}
      {currentRoleId === 'SALES_OFFICER' && (
        <>
          <NavLink to="/sales-onboarding" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <FilePlus size={18} />
            <span>+ Onboard</span>
          </NavLink>
          <NavLink to="/sales-my-societies" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <Building2 size={18} />
            <span>Societies</span>
          </NavLink>
          <NavLink to="/inbound-leads" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
            <ClipboardList size={18} />
            <span>Leads</span>
            {inboundLeadsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '18px',
                background: '#F59E0B',
                color: '#FFF',
                fontSize: '9px',
                fontWeight: 900,
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #FFF'
              }}>
                {inboundLeadsCount}
              </span>
            )}
          </NavLink>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="admin-dock-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={18} />
            <span>Menu</span>
          </button>
        </>
      )}

      {/* Procurement Officer Tabs */}
      {currentRoleId === 'PROCUREMENT_OFFICER' && (
        <>
          <NavLink to="/procurement-demand" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <ClipboardList size={18} />
            <span>Demand</span>
          </NavLink>
          <NavLink to="/procurement-entry" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <FilePlus size={18} />
            <span>Purchase</span>
          </NavLink>
          <NavLink to="/procurement-logs" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <Truck size={18} />
            <span>Bills</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="admin-dock-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={18} />
            <span>Menu</span>
          </button>
        </>
      )}

      {/* Procurement Officer Tabs */}
      {currentRoleId === 'PROCUREMENT_OFFICER' && (
        <>
          <NavLink to="/procurement-demand" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <ClipboardList size={18} />
            <span>Demand</span>
          </NavLink>
          <NavLink to="/procurement-entry" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <FilePlus size={18} />
            <span>Log Bill</span>
          </NavLink>
          <NavLink to="/vendors" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <Store size={18} />
            <span>Vendors</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="admin-dock-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={18} />
            <span>Menu</span>
          </button>
        </>
      )}

      {/* Warehouse Manager Tabs */}
      {currentRoleId === 'WAREHOUSE_MANAGER' && (
        <>
          <NavLink to="/warehouse-settings" className={({ isActive }) => `admin-dock-item ${isActive || isWarehouseRoute ? 'active' : ''}`}>
            <Warehouse size={18} />
            <span>Cut-Off</span>
          </NavLink>
          <NavLink to="/warehouse-crating" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <ClipboardList size={18} />
            <span>Crating</span>
          </NavLink>
          <NavLink to="/orders-fulfillment" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <Truck size={18} />
            <span>Live Orders</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="admin-dock-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={18} />
            <span>Menu</span>
          </button>
        </>
      )}



      {/* Delivery Executive (Rider) Tabs */}
      {currentRoleId === 'DELIVERY_EXECUTIVE' && (
        <>
          <NavLink to="/orders-fulfillment" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <Truck size={18} />
            <span>Route Manifest</span>
          </NavLink>
          <NavLink to="/warehouse-crating" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <ClipboardList size={18} />
            <span>Loaded Crates</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="admin-dock-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={18} />
            <span>Menu</span>
          </button>
        </>
      )}
    </nav>
  );
}
