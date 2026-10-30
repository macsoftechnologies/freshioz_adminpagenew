import React, { useState, useEffect } from 'react';
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
  Receipt,
  FileText,
  MessageSquareQuote,
  ChevronDown,
  Apple,
  Scale,
  CreditCard,
  Settings
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
  const totalProductsCount = (store.products || []).length;
  const totalCategoriesCount = (store.categories || []).length;
  const totalUnitsCount = (store.units || []).length;

  const [openGroups, setOpenGroups] = useState({
    masterData: location.pathname.startsWith('/master-data'),
    procurement: location.pathname.startsWith('/procurement'),
    logistics: location.pathname.startsWith('/warehouse') || location.pathname.startsWith('/orders') || location.pathname.startsWith('/vendors'),
    societies: location.pathname.startsWith('/societies') || location.pathname.startsWith('/approvals') || location.pathname.startsWith('/payouts') || location.pathname.startsWith('/inbound-leads') || location.pathname.startsWith('/sales'),
    pricing: location.pathname.startsWith('/daily-pricing') || location.pathname.startsWith('/transactions'),
    packer: location.pathname.startsWith('/warehouse-crating'),
    rider: location.pathname.startsWith('/orders-fulfillment')
  });

  useEffect(() => {
    if (location.pathname.startsWith('/master-data')) {
      setOpenGroups(prev => ({ ...prev, masterData: true }));
    }
    if (location.pathname.startsWith('/procurement')) {
      setOpenGroups(prev => ({ ...prev, procurement: true }));
    }
    if (location.pathname.startsWith('/warehouse') || location.pathname.startsWith('/orders') || location.pathname.startsWith('/vendors')) {
      setOpenGroups(prev => ({ ...prev, logistics: true }));
    }
    if (location.pathname.startsWith('/societies') || location.pathname.startsWith('/approvals') || location.pathname.startsWith('/payouts') || location.pathname.startsWith('/inbound-leads') || location.pathname.startsWith('/sales')) {
      setOpenGroups(prev => ({ ...prev, societies: true }));
    }
    if (location.pathname.startsWith('/daily-pricing') || location.pathname.startsWith('/transactions')) {
      setOpenGroups(prev => ({ ...prev, pricing: true }));
    }
    if (location.pathname.startsWith('/warehouse-crating')) {
      setOpenGroups(prev => ({ ...prev, packer: true }));
    }
    if (location.pathname.startsWith('/orders-fulfillment')) {
      setOpenGroups(prev => ({ ...prev, rider: true }));
    }
  }, [location.pathname]);

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isMasterDataActive = location.pathname.startsWith('/master-data');
  const isProcurementActive = location.pathname.startsWith('/procurement');
  const isLogisticsActive = isWarehouseRoute || location.pathname.startsWith('/orders') || location.pathname.startsWith('/vendors');
  const isSocietiesActive = location.pathname.startsWith('/societies') || location.pathname.startsWith('/approvals') || location.pathname.startsWith('/payouts') || location.pathname.startsWith('/inbound-leads') || location.pathname.startsWith('/sales');

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

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open_payment_gateway_settings'))}
              className="sidebar-nav-item"
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Settings size={18} />
              <span style={{ flex: 1 }}>Settings & Gateway</span>
              <span style={{ background: '#E6F4EA', color: '#137333', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                RZP
              </span>
            </button>

            {/* Collapsible: Master Data Catalog */}
            <button 
              type="button" 
              onClick={() => toggleGroup('masterData')} 
              className={`sidebar-nav-group-btn ${isMasterDataActive ? 'active-group' : ''}`}
            >
              <Database size={18} />
              <span style={{ flex: 1 }}>Master Data Catalog</span>
              <ChevronDown 
                size={14} 
                style={{ 
                  transform: openGroups.masterData ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease' 
                }} 
              />
            </button>

            {openGroups.masterData && (
              <div className="sidebar-sub-menu">
                <NavLink 
                  to="/master-data#produce" 
                  className={() => `sidebar-sub-item ${location.pathname === '/master-data' && (location.hash === '#produce' || !location.hash) ? 'active' : ''}`}
                >
                  <Apple size={14} />
                  <span style={{ flex: 1 }}>Produce Catalog</span>
                  <span style={{ fontSize: '10px', background: '#E2E8F0', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>
                    {totalProductsCount}
                  </span>
                </NavLink>

                <NavLink 
                  to="/master-data#categories" 
                  className={() => `sidebar-sub-item ${location.pathname === '/master-data' && location.hash === '#categories' ? 'active' : ''}`}
                >
                  <Layers size={14} />
                  <span style={{ flex: 1 }}>Categories</span>
                  <span style={{ fontSize: '10px', background: '#E2E8F0', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>
                    {totalCategoriesCount}
                  </span>
                </NavLink>

                <NavLink 
                  to="/master-data#units" 
                  className={() => `sidebar-sub-item ${location.pathname === '/master-data' && location.hash === '#units' ? 'active' : ''}`}
                >
                  <Scale size={14} />
                  <span style={{ flex: 1 }}>Packing Units</span>
                  <span style={{ fontSize: '10px', background: '#E2E8F0', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>
                    {totalUnitsCount}
                  </span>
                </NavLink>
              </div>
            )}

            {/* Collapsible: Mandi Procurement */}
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Mandi Procurement & Sourcing
            </div>
            <button 
              type="button" 
              onClick={() => toggleGroup('procurement')} 
              className={`sidebar-nav-group-btn ${isProcurementActive ? 'active-group' : ''}`}
            >
              <ClipboardList size={18} />
              <span style={{ flex: 1 }}>Mandi Procurement</span>
              <ChevronDown 
                size={14} 
                style={{ 
                  transform: openGroups.procurement ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease' 
                }} 
              />
            </button>

            {openGroups.procurement && (
              <div className="sidebar-sub-menu">
                <NavLink 
                  to="/procurement-demand" 
                  className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                >
                  <ClipboardList size={14} />
                  <span>Mandi Demand & Indent</span>
                </NavLink>

                <NavLink 
                  to="/procurement-entry" 
                  className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                >
                  <FilePlus size={14} />
                  <span>Log Mandi Bill & Slip</span>
                </NavLink>

                <NavLink 
                  to="/procurement-logs" 
                  className={`sidebar-sub-item ${location.pathname === '/procurement-logs' ? 'active' : ''}`}
                >
                  <Receipt size={14} />
                  <span>Purchases Audit Ledger</span>
                </NavLink>
              </div>
            )}

            {/* Collapsible: Logistics & Hub Operations */}
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Logistics & Hub Operations
            </div>
            <button 
              type="button" 
              onClick={() => toggleGroup('logistics')} 
              className={`sidebar-nav-group-btn ${isLogisticsActive ? 'active-group' : ''}`}
            >
              <Truck size={18} />
              <span style={{ flex: 1 }}>Hub Logistics & Orders</span>
              <ChevronDown 
                size={14} 
                style={{ 
                  transform: openGroups.logistics ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease' 
                }} 
              />
            </button>

            {openGroups.logistics && (
              <div className="sidebar-sub-menu">
                <NavLink 
                  to="/warehouse-crating" 
                  className={`sidebar-sub-item ${location.pathname === '/warehouse-crating' ? 'active' : ''}`}
                >
                  <PackageCheck size={14} />
                  <span>Packing & Lot Dispatch</span>
                </NavLink>

                <NavLink 
                  to="/orders-fulfillment" 
                  className={`sidebar-sub-item ${location.pathname === '/orders-fulfillment' ? 'active' : ''}`}
                >
                  <Truck size={14} />
                  <span>Orders Fulfillment Queue</span>
                </NavLink>

                <NavLink 
                  to="/warehouse-settings" 
                  className={`sidebar-sub-item ${location.pathname === '/warehouse-settings' ? 'active' : ''}`}
                >
                  <Warehouse size={14} />
                  <span>Warehouses & Hubs</span>
                </NavLink>

                <NavLink 
                  to="/vendors" 
                  className={`sidebar-sub-item ${location.pathname === '/vendors' ? 'active' : ''}`}
                >
                  <Store size={14} />
                  <span style={{ flex: 1 }}>Vendors & APMC Agents</span>
                  <span style={{ background: '#E2E8F0', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700 }}>
                    {totalVendorsCount}
                  </span>
                </NavLink>
              </div>
            )}

            {/* Collapsible: Field & Community Networks */}
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Field & Community Networks
            </div>
            <button 
              type="button" 
              onClick={() => toggleGroup('societies')} 
              className={`sidebar-nav-group-btn ${isSocietiesActive ? 'active-group' : ''}`}
            >
              <Building2 size={18} />
              <span style={{ flex: 1 }}>Societies & Drop Desks</span>
              {pendingSocietiesCount + pendingWithdrawalsCount + inboundLeadsCount > 0 && (
                <span style={{ background: '#F28E14', color: '#FFF', fontSize: '9.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '9999px', marginRight: '4px' }}>
                  {pendingSocietiesCount + pendingWithdrawalsCount + inboundLeadsCount}
                </span>
              )}
              <ChevronDown 
                size={14} 
                style={{ 
                  transform: openGroups.societies ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease' 
                }} 
              />
            </button>

            {openGroups.societies && (
              <div className="sidebar-sub-menu">
                <NavLink 
                  to="/societies" 
                  className={`sidebar-sub-item ${location.pathname === '/societies' ? 'active' : ''}`}
                >
                  <Building2 size={14} />
                  <span style={{ flex: 1 }}>Societies & Hostels</span>
                  <span style={{ background: '#E2E8F0', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700 }}>
                    {store.societies?.length || 0}
                  </span>
                </NavLink>

                <NavLink 
                  to="/approvals" 
                  className={`sidebar-sub-item ${location.pathname === '/approvals' ? 'active' : ''}`}
                >
                  <CheckCircle size={14} />
                  <span style={{ flex: 1 }}>Society Approvals</span>
                  {pendingSocietiesCount > 0 && (
                    <span style={{ background: '#F28E14', color: '#FFF', fontSize: '9.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '9999px' }}>
                      {pendingSocietiesCount}
                    </span>
                  )}
                </NavLink>

                <NavLink 
                  to="/payouts" 
                  className={`sidebar-sub-item ${location.pathname === '/payouts' ? 'active' : ''}`}
                >
                  <Coins size={14} />
                  <span style={{ flex: 1 }}>Society Payouts</span>
                  {pendingWithdrawalsCount > 0 && (
                    <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '9.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '9999px' }}>
                      {pendingWithdrawalsCount}
                    </span>
                  )}
                </NavLink>

                <NavLink 
                  to="/inbound-leads" 
                  className={`sidebar-sub-item ${location.pathname === '/inbound-leads' ? 'active' : ''}`}
                >
                  <Users size={14} />
                  <span style={{ flex: 1 }}>Resident Inbound Requests</span>
                  {inboundLeadsCount > 0 && (
                    <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '9.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '9999px' }}>
                      {inboundLeadsCount}
                    </span>
                  )}
                </NavLink>
              </div>
            )}

            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Pricing & Audits
            </div>
            <NavLink to="/daily-pricing" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Tags size={18} />
              <span>Daily Rates & GST</span>
            </NavLink>

            <NavLink to="/transactions" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Receipt size={18} />
              <span>Payment & Spent Ledger</span>
            </NavLink>

            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Feedback & Customer Care
            </div>
            <NavLink to="/reviews-moderation" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <MessageSquareQuote size={18} />
              <span style={{ flex: 1 }}>Reviews & Rewards</span>
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

            {/* Collapsible: Mandi Procurement */}
            <button 
              type="button" 
              onClick={() => toggleGroup('procurement')} 
              className={`sidebar-nav-group-btn ${isProcurementActive ? 'active-group' : ''}`}
            >
              <ClipboardList size={18} />
              <span style={{ flex: 1 }}>Mandi Procurement</span>
              <ChevronDown 
                size={14} 
                style={{ 
                  transform: openGroups.procurement ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease' 
                }} 
              />
            </button>

            {openGroups.procurement && (
              <div className="sidebar-sub-menu">
                <NavLink 
                  to="/procurement-demand" 
                  className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                >
                  <ClipboardList size={14} />
                  <span>Mandi Demand & Sourcing</span>
                </NavLink>

                <NavLink 
                  to="/procurement-entry" 
                  className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                >
                  <FilePlus size={14} />
                  <span>Log Mandi Bill & Slip</span>
                </NavLink>

                <NavLink 
                  to="/procurement-logs" 
                  className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                >
                  <Receipt size={14} />
                  <span>Purchases Audit Ledger</span>
                </NavLink>

                <NavLink 
                  to="/vendors" 
                  className={({ isActive }) => `sidebar-sub-item ${location.pathname === '/vendors' ? 'active' : ''}`}
                >
                  <Store size={14} />
                  <span>Vendors & Farmers</span>
                </NavLink>
              </div>
            )}

            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800, padding: '12px 14px 4px', letterSpacing: '0.6px' }}>
              Hub Operations
            </div>
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
              <span style={{ flex: 1 }}>My Delivery Manifest</span>
            </NavLink>

            <NavLink to="/warehouse-crating" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <PackageCheck size={18} />
              <span>Society Drop Crates Handover</span>
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}
