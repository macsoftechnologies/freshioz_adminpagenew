import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
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
  Layers,
  PackageCheck,
  Receipt
} from 'lucide-react';
import FreshiozLogo from '../common/FreshiozLogo';
import { useAdminRole } from '../../context/AdminRoleContext';

export default function AdminSidebar() {
  const { currentRoleId, store } = useAdminRole();
  const location = useLocation();
  const isWarehouseRoute = location.pathname.startsWith('/warehouse');

  const pendingSocietiesCount = (store.societies || []).filter(s => s.status === 'PENDING').length;
  const pendingWithdrawalsCount = (store.withdrawals || []).filter(w => w.status === 'PENDING_APPROVAL').length;
  const totalEmployeesCount = (store.employees || []).length;
  const totalVendorsCount = (store.vendors || []).length;
  const inboundLeadsCount = (store.societyRequests || []).filter(r => r.status !== 'CONVERTED' && r.status !== 'REJECTED').length;

  return (
    <aside className="admin-sidebar">
      {/* Sidebar Top Branding */}
      <div className="sidebar-header">
        <FreshiozLogo height={42} showTagline={false} />
        <div className="sidebar-role-indicator">
          <span>Active Desk:</span>
          <strong>{currentRoleId.replace(/_/g, ' ')}</strong>
        </div>
      </div>

      {/* Role-Specific Navigation Menu */}
      <nav className="sidebar-nav-list">
        {/* ================= SUPER ADMIN ONLY ================= */}
        {currentRoleId === 'SUPER_ADMIN' && (
          <>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '8px 14px', letterSpacing: '0.6px' }}>
              Executive Analytics
            </div>
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Operations Graphs</span>
            </NavLink>

            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Master Management
            </div>
            <NavLink to="/employees" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span style={{ flex: 1 }}>Staff & Multi-Roles</span>
              <span style={{ background: '#234B3C', color: '#FFF', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                MAIN
              </span>
            </NavLink>

            <NavLink to="/master-data#produce" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Database size={18} />
              <span>Master Data Catalog</span>
            </NavLink>

            <NavLink to="/vendors" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Store size={18} />
              <span style={{ flex: 1 }}>Vendors & APMC Agents</span>
              <span style={{ background: '#EBF2EE', color: '#234B3C', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                {totalVendorsCount}
              </span>
            </NavLink>

            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Logistics & Hub Operations
            </div>
            <NavLink to="/warehouse-settings" className={({ isActive }) => `sidebar-nav-item ${isActive || isWarehouseRoute ? 'active' : ''}`}>
              <Warehouse size={18} />
              <span>Warehouses & Hubs</span>
            </NavLink>

            <NavLink to="/procurement-demand" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <ClipboardList size={18} />
              <span>Mandi Demand (Net Stock)</span>
            </NavLink>

            <NavLink to="/warehouse-crating" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <PackageCheck size={18} />
              <span>Packing & Lot Dispatch</span>
            </NavLink>

            <NavLink to="/orders-fulfillment" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Truck size={18} />
              <span>Orders Fulfillment</span>
            </NavLink>

            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Field & Community Networks
            </div>
            <NavLink to="/societies" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Building2 size={18} />
              <span style={{ flex: 1 }}>Societies & Hostels</span>
              <span style={{ background: '#EBF2EE', color: '#234B3C', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                {store.societies?.length || 0}
              </span>
            </NavLink>

            <NavLink to="/approvals" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <CheckCircle size={18} />
              <span style={{ flex: 1 }}>Society Approvals</span>
              {pendingSocietiesCount > 0 && (
                <span style={{ background: '#F28E14', color: '#FFF', fontSize: '11px', fontWeight: 800, padding: '1px 7px', borderRadius: '9999px' }}>
                  {pendingSocietiesCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/payouts" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Coins size={18} />
              <span style={{ flex: 1 }}>Society Payouts</span>
              {pendingWithdrawalsCount > 0 && (
                <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: 800, padding: '1px 7px', borderRadius: '9999px' }}>
                  {pendingWithdrawalsCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/inbound-leads" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span style={{ flex: 1 }}>Resident Inbound Requests</span>
              {inboundLeadsCount > 0 && (
                <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: 800, padding: '1px 7px', borderRadius: '9999px', boxShadow: '0 1px 3px rgba(245,158,11,0.4)' }}>
                  {inboundLeadsCount}
                </span>
              )}
            </NavLink>

            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Pricing & Mandi Audits
            </div>
            <NavLink to="/daily-pricing" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Tags size={18} />
              <span>Daily Rates & GST</span>
            </NavLink>

            <NavLink to="/procurement-logs" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <ClipboardList size={18} />
              <span>Mandi Purchases Audit</span>
            </NavLink>

            <NavLink to="/transactions" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Receipt size={18} />
              <span>Payment & Spent Ledger</span>
            </NavLink>
          </>
        )}

        {/* ================= FIELD SALES OFFICER ONLY ================= */}
        {currentRoleId === 'SALES_OFFICER' && (
          <>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '8px 14px', letterSpacing: '0.6px' }}>
              Field Sales Workdesk
            </div>
            <NavLink to="/societies" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Building2 size={18} />
              <span>Societies & Resident Directory</span>
            </NavLink>

            <NavLink to="/sales-onboarding" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <FilePlus size={18} />
              <span>Onboard Society / Hostel</span>
            </NavLink>

            <NavLink to="/sales-my-societies" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Building2 size={18} />
              <span>My Submitted Societies</span>
            </NavLink>

            <NavLink to="/inbound-leads" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span style={{ flex: 1 }}>Resident Inbound Requests</span>
              {inboundLeadsCount > 0 && (
                <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: 800, padding: '1px 7px', borderRadius: '9999px', boxShadow: '0 1px 3px rgba(245,158,11,0.4)' }}>
                  {inboundLeadsCount}
                </span>
              )}
            </NavLink>
          </>
        )}

        {/* ================= WAREHOUSE STAFF / PACKER ONLY ================= */}
        {currentRoleId === 'WAREHOUSE_STAFF' && (
          <>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '8px 14px', letterSpacing: '0.6px' }}>
              Produce Sorting & Packing Desk
            </div>
            <NavLink to="/warehouse-crating" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <PackageCheck size={18} />
              <span>Crating & Society Packing</span>
            </NavLink>

            <NavLink to="/orders-fulfillment" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Truck size={18} />
              <span>Live Orders Packing Queue</span>
            </NavLink>
          </>
        )}

        {/* ================= WAREHOUSE & PROCUREMENT MANAGER ================= */}
        {(currentRoleId === 'WAREHOUSE_MANAGER' || currentRoleId === 'PROCUREMENT_OFFICER') && (
          <>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '8px 14px', letterSpacing: '0.6px' }}>
              Warehouse & Procurement Operations
            </div>
            <NavLink to="/procurement-demand" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <ClipboardList size={18} />
              <span>Mandi Demand (Stock Net)</span>
            </NavLink>

            <NavLink to="/procurement-entry" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <FilePlus size={18} />
              <span>Log Mandi Bill & Transport</span>
            </NavLink>

            <NavLink to="/procurement-logs" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Mandi Purchases Ledger</span>
            </NavLink>

            <NavLink to="/vendors" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Store size={18} />
              <span>Vendors & Farmers Directory</span>
            </NavLink>

            <NavLink to="/daily-pricing" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Coins size={18} />
              <span>Daily Pricing & GST Master</span>
            </NavLink>

            <NavLink to="/warehouse-crating" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <PackageCheck size={18} />
              <span>Packing & Lot Dispatch</span>
            </NavLink>

            <NavLink to="/orders-fulfillment" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Truck size={18} />
              <span>Live Order Tracking</span>
            </NavLink>

            <NavLink to="/transactions" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Receipt size={18} />
              <span>Payment & Spent Ledger</span>
            </NavLink>

            <NavLink to="/warehouse-settings" className={({ isActive }) => `sidebar-nav-item ${isActive || isWarehouseRoute ? 'active' : ''}`}>
              <Warehouse size={18} />
              <span>Cut-Off Time & Hub Slots</span>
            </NavLink>
          </>
        )}

        {/* ================= DELIVERY EXECUTIVE (RIDER) ONLY ================= */}
        {currentRoleId === 'DELIVERY_EXECUTIVE' && (
          <>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '8px 14px', letterSpacing: '0.6px' }}>
              Rider Delivery Desk
            </div>
            <NavLink to="/orders-fulfillment" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Truck size={18} />
              <span>Assigned Dispatch Runs</span>
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}
