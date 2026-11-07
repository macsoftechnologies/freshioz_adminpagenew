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
  Menu,
  PackageCheck,
  Boxes,
  RotateCcw
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
            <span>Dashboard</span>
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
          <NavLink to="/inbound-leads" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
            <ClipboardList size={18} />
            <span>1. Leads</span>
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
          <NavLink to="/sales-onboarding" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <FilePlus size={18} />
            <span>2. Onboard</span>
          </NavLink>
          <NavLink to="/sales-my-societies" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <Building2 size={18} />
            <span>3. Societies</span>
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

      {/* Warehouse Staff / Packer Tabs */}
      {currentRoleId === 'WAREHOUSE_STAFF' && (
        <>
          <NavLink 
            to="/warehouse-crating#packing" 
            className={() => `admin-dock-item ${location.pathname === '/warehouse-crating' && (!location.hash || location.hash === '#packing') ? 'active' : ''}`}
          >
            <PackageCheck size={18} />
            <span>1. Pack</span>
          </NavLink>
          <NavLink 
            to="/warehouse-crating#dispatch" 
            className={() => `admin-dock-item ${location.pathname === '/warehouse-crating' && ['#dispatch', '#lots', '#ready', '#out-for-delivery', '#delivered'].includes(location.hash) ? 'active' : ''}`}
          >
            <Boxes size={18} />
            <span>2. Dispatch</span>
          </NavLink>
          <NavLink 
            to="/warehouse-crating#returns" 
            className={() => `admin-dock-item ${location.pathname === '/warehouse-crating' && (location.hash === '#returns' || location.hash === '#return-audit') ? 'active' : ''}`}
          >
            <RotateCcw size={18} />
            <span>3. Returns</span>
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

      {/* Warehouse & Procurement Manager Tabs */}
      {(currentRoleId === 'WAREHOUSE_MANAGER' || currentRoleId === 'PROCUREMENT_OFFICER') && (
        <>
          <NavLink to="/procurement-demand" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <ClipboardList size={18} />
            <span>Demand</span>
          </NavLink>
          <NavLink to="/procurement-entry" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <FilePlus size={18} />
            <span>Mandi Bill</span>
          </NavLink>
          <NavLink to="/warehouse-crating" className={({ isActive }) => `admin-dock-item ${isActive ? 'active' : ''}`}>
            <PackageCheck size={18} />
            <span>Crating</span>
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
          <NavLink 
            to="/orders-fulfillment#pending" 
            className={() => `admin-dock-item ${location.pathname === '/orders-fulfillment' && (!location.hash || location.hash === '#pending') ? 'active' : ''}`}
          >
            <Truck size={18} />
            <span>1. Deliver</span>
          </NavLink>
          <NavLink 
            to="/orders-fulfillment#delivered" 
            className={() => `admin-dock-item ${location.pathname === '/orders-fulfillment' && location.hash === '#delivered' ? 'active' : ''}`}
          >
            <CheckCircle size={18} />
            <span>2. Delivered</span>
          </NavLink>
          <NavLink 
            to="/orders-fulfillment#cancelled" 
            className={() => `admin-dock-item ${location.pathname === '/orders-fulfillment' && location.hash === '#cancelled' ? 'active' : ''}`}
          >
            <RotateCcw size={18} />
            <span>3. Returns</span>
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
