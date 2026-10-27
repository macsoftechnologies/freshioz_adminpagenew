import React, { useState, useEffect } from 'react';
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
  PackageCheck,
  FileText,
  ChevronDown,
  Apple,
  Scale,
  Layers,
  MessageSquareQuote
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

  const isWarehouseRoute = location.pathname.startsWith('/warehouse');
  const pendingSocietiesCount = (store.societies || []).filter(s => s.status === 'PENDING').length;
  const pendingWithdrawalsCount = (store.withdrawals || []).filter(w => w.status === 'PENDING_APPROVAL').length;
  const inboundLeadsCount = (store.societyRequests || []).filter(r => r.status !== 'CONVERTED' && r.status !== 'REJECTED').length;
  const totalProductsCount = (store.products || []).length;
  const totalCategoriesCount = (store.categories || []).length;
  const totalUnitsCount = (store.units || []).length;
  const totalVendorsCount = (store.vendors || []).length;

  const [openGroups, setOpenGroups] = useState({
    masterData: location.pathname.startsWith('/master-data'),
    procurement: location.pathname.startsWith('/procurement'),
    logistics: location.pathname.startsWith('/warehouse') || location.pathname.startsWith('/orders') || location.pathname.startsWith('/vendors'),
    societies: location.pathname.startsWith('/societies') || location.pathname.startsWith('/approvals') || location.pathname.startsWith('/payouts') || location.pathname.startsWith('/inbound-leads') || location.pathname.startsWith('/sales'),
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

  const handleClose = () => {
    setIsMobileDrawerOpen(false);
  };

  const handleLogout = () => {
    handleClose();
    requestLogout();
  };

  if (!isMobileDrawerOpen) return null;

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

              {/* Collapsible: Master Data Catalog */}
              <button 
                type="button" 
                onClick={() => toggleGroup('masterData')} 
                className={`sidebar-nav-group-btn ${isMasterDataActive ? 'active-group' : ''}`}
              >
                <Database size={17} />
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
                    onClick={handleClose}
                    className={() => `sidebar-sub-item ${location.pathname === '/master-data' && (location.hash === '#produce' || !location.hash) ? 'active' : ''}`}
                  >
                    <Apple size={14} />
                    <span style={{ flex: 1 }}>Produce Catalog</span>
                    <span style={{ fontSize: '9.5px', background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '6px', fontWeight: 700 }}>
                      {totalProductsCount}
                    </span>
                  </NavLink>

                  <NavLink 
                    to="/master-data#categories" 
                    onClick={handleClose}
                    className={() => `sidebar-sub-item ${location.pathname === '/master-data' && location.hash === '#categories' ? 'active' : ''}`}
                  >
                    <Layers size={14} />
                    <span style={{ flex: 1 }}>Categories</span>
                    <span style={{ fontSize: '9.5px', background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '6px', fontWeight: 700 }}>
                      {totalCategoriesCount}
                    </span>
                  </NavLink>

                  <NavLink 
                    to="/master-data#units" 
                    onClick={handleClose}
                    className={() => `sidebar-sub-item ${location.pathname === '/master-data' && location.hash === '#units' ? 'active' : ''}`}
                  >
                    <Scale size={14} />
                    <span style={{ flex: 1 }}>Packing Units</span>
                    <span style={{ fontSize: '9.5px', background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '6px', fontWeight: 700 }}>
                      {totalUnitsCount}
                    </span>
                  </NavLink>
                </div>
              )}

              {/* Collapsible: Mandi Procurement */}
              <div className="drawer-nav-section-title">Mandi Procurement & Sourcing</div>
              <button 
                type="button" 
                onClick={() => toggleGroup('procurement')} 
                className={`sidebar-nav-group-btn ${isProcurementActive ? 'active-group' : ''}`}
              >
                <ClipboardList size={17} />
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
                    onClick={handleClose}
                    className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                  >
                    <ClipboardList size={14} />
                    <span>Mandi Demand & Indent</span>
                  </NavLink>

                  <NavLink 
                    to="/procurement-entry" 
                    onClick={handleClose}
                    className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                  >
                    <FilePlus size={14} />
                    <span>Log Mandi Bill & Slip</span>
                  </NavLink>

                  <NavLink 
                    to="/procurement-logs" 
                    onClick={handleClose}
                    className={`sidebar-sub-item ${location.pathname === '/procurement-logs' ? 'active' : ''}`}
                  >
                    <Receipt size={14} />
                    <span>Purchases Audit Ledger</span>
                  </NavLink>
                </div>
              )}

              {/* Collapsible: Logistics & Hub Operations */}
              <div className="drawer-nav-section-title">Logistics & Hub Operations</div>
              <button 
                type="button" 
                onClick={() => toggleGroup('logistics')} 
                className={`sidebar-nav-group-btn ${isLogisticsActive ? 'active-group' : ''}`}
              >
                <Truck size={17} />
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
                    onClick={handleClose}
                    className={`sidebar-sub-item ${location.pathname === '/warehouse-crating' ? 'active' : ''}`}
                  >
                    <PackageCheck size={14} />
                    <span>Packing & Lot Dispatch</span>
                  </NavLink>

                  <NavLink 
                    to="/orders-fulfillment" 
                    onClick={handleClose}
                    className={`sidebar-sub-item ${location.pathname === '/orders-fulfillment' ? 'active' : ''}`}
                  >
                    <Truck size={14} />
                    <span>Orders Fulfillment Queue</span>
                  </NavLink>

                  <NavLink 
                    to="/warehouse-settings" 
                    onClick={handleClose}
                    className={`sidebar-sub-item ${location.pathname === '/warehouse-settings' ? 'active' : ''}`}
                  >
                    <Warehouse size={14} />
                    <span>Warehouses & Hubs</span>
                  </NavLink>

                  <NavLink 
                    to="/vendors" 
                    onClick={handleClose}
                    className={`sidebar-sub-item ${location.pathname === '/vendors' ? 'active' : ''}`}
                  >
                    <Store size={14} />
                    <span style={{ flex: 1 }}>Vendors & APMC Agents</span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700 }}>
                      {totalVendorsCount}
                    </span>
                  </NavLink>
                </div>
              )}

              {/* Collapsible: Field & Community Networks */}
              <div className="drawer-nav-section-title">Field & Community Networks</div>
              <button 
                type="button" 
                onClick={() => toggleGroup('societies')} 
                className={`sidebar-nav-group-btn ${isSocietiesActive ? 'active-group' : ''}`}
              >
                <Building2 size={17} />
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
                    onClick={handleClose}
                    className={`sidebar-sub-item ${location.pathname === '/societies' ? 'active' : ''}`}
                  >
                    <Building2 size={14} />
                    <span style={{ flex: 1 }}>Societies & Hostels</span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700 }}>
                      {store.societies?.length || 0}
                    </span>
                  </NavLink>

                  <NavLink 
                    to="/approvals" 
                    onClick={handleClose}
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
                    onClick={handleClose}
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
                    onClick={handleClose}
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

              <div className="drawer-nav-section-title">Pricing & Audits</div>
              <NavLink to="/daily-pricing" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Tags size={17} />
                <span>Daily Rates & GST</span>
              </NavLink>

              <NavLink to="/transactions" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Receipt size={17} />
                <span>Payment & Spent Ledger</span>
              </NavLink>

              <div className="drawer-nav-section-title">Feedback & Customer Care</div>
              <NavLink to="/reviews-moderation" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <MessageSquareQuote size={17} />
                <span style={{ flex: 1 }}>Reviews & Rewards</span>
              </NavLink>
            </>
          )}

          {/* ================= FIELD SALES OFFICER ================= */}
          {currentRoleId === 'SALES_OFFICER' && (
            <>
              <div className="drawer-nav-section-title">Field Sales Workdesk</div>
              <NavLink to="/societies" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Building2 size={17} />
                <span>Societies & Resident Directory</span>
              </NavLink>
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
              <div className="drawer-nav-section-title">Produce Sorting & Packing Desk</div>
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

          {/* ================= WAREHOUSE & PROCUREMENT MANAGER ================= */}
          {(currentRoleId === 'WAREHOUSE_MANAGER' || currentRoleId === 'PROCUREMENT_OFFICER') && (
            <>
              <div className="drawer-nav-section-title">Warehouse & Procurement Operations</div>

              {/* Collapsible: Mandi Procurement */}
              <button 
                type="button" 
                onClick={() => toggleGroup('procurement')} 
                className={`sidebar-nav-group-btn ${isProcurementActive ? 'active-group' : ''}`}
              >
                <ClipboardList size={17} />
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
                    onClick={handleClose}
                    className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                  >
                    <ClipboardList size={14} />
                    <span>Mandi Demand & Sourcing</span>
                  </NavLink>

                  <NavLink 
                    to="/procurement-entry" 
                    onClick={handleClose}
                    className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                  >
                    <FilePlus size={14} />
                    <span>Log Mandi Bill & Slip</span>
                  </NavLink>

                  <NavLink 
                    to="/procurement-logs" 
                    onClick={handleClose}
                    className={({ isActive }) => `sidebar-sub-item ${isActive ? 'active' : ''}`}
                  >
                    <Receipt size={14} />
                    <span>Purchases Audit Ledger</span>
                  </NavLink>

                  <NavLink 
                    to="/vendors" 
                    onClick={handleClose}
                    className={({ isActive }) => `sidebar-sub-item ${location.pathname === '/vendors' ? 'active' : ''}`}
                  >
                    <Store size={14} />
                    <span>Vendors & Farmers</span>
                  </NavLink>
                </div>
              )}

              <div className="drawer-nav-section-title">Hub Operations</div>
              <NavLink to="/warehouse-crating" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <PackageCheck size={17} />
                <span>Packing & Lot Dispatch</span>
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
                <span style={{ flex: 1 }}>My Delivery Manifest</span>
              </NavLink>

              <NavLink to="/warehouse-crating" onClick={handleClose} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <PackageCheck size={17} />
                <span>Society Drop Crates Handover</span>
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
