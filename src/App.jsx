import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminSidebar from './components/layout/AdminSidebar';
import AdminTopBar from './components/layout/AdminTopBar';
import AdminMobileHeader from './components/layout/AdminMobileHeader';
import AdminMobileDock from './components/layout/AdminMobileDock';
import AdminMobileDrawer from './components/layout/AdminMobileDrawer';
import AdminLogoutConfirmModal from './components/common/AdminLogoutConfirmModal';
import AdminFloatingPwaWidget from './components/common/AdminFloatingPwaWidget';
import AdminAppSplashScreen from './components/common/AdminAppSplashScreen';

import AdminLoginPage from './pages/AdminLoginPage';
import AdminForgotPasswordPage from './pages/AdminForgotPasswordPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import MasterDataPage from './pages/MasterDataPage';
import WarehousesPage from './pages/WarehousesPage';
import OrdersFulfillmentPage from './pages/OrdersFulfillmentPage';
import SocietyApprovalsPage from './pages/SocietyApprovalsPage';
import DailyPricingPage from './pages/DailyPricingPage';
import SocietyPayoutsPage from './pages/SocietyPayoutsPage';
import SalesOnboardingPage from './pages/SalesOnboardingPage';
import SalesMySocietiesPage from './pages/SalesMySocietiesPage';
import ProcurementDemandPage from './pages/ProcurementDemandPage';
import ProcurementEntryPage from './pages/ProcurementEntryPage';
import ProcurementLogsPage from './pages/ProcurementLogsPage';
import InboundLeadsPage from './pages/InboundLeadsPage';
import WarehouseCratingPage from './pages/WarehouseCratingPage';
import SocietiesDirectoryPage from './pages/SocietiesDirectoryPage';
import VendorsDirectoryPage from './pages/VendorsDirectoryPage';
import FinancialTransactionsPage from './pages/FinancialTransactionsPage';
import ScrollToTop from './components/common/ScrollToTop';
import { useAdminRole, ROLES } from './context/AdminRoleContext';

export default function App() {
  const { currentRoleId, isAuthenticated } = useAdminRole();
  const location = useLocation();
  const [syncError, setSyncError] = useState(null);

  React.useEffect(() => {
    const handleSyncError = (e) => {
      setSyncError(e.detail || 'Database synchronization rejected.');
      const t = setTimeout(() => setSyncError(null), 7000);
      return () => clearTimeout(t);
    };
    window.addEventListener('freshioz_sync_error', handleSyncError);
    return () => window.removeEventListener('freshioz_sync_error', handleSyncError);
  }, []);

  // Determine home fallback route per role
  const getHomeRoute = () => {
    if (currentRoleId === 'SUPER_ADMIN') return '/dashboard';
    return ROLES[currentRoleId]?.defaultRoute || '/orders-fulfillment';
  };

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/forgot-password';

  // Render standalone login & password recovery screens when unauthenticated
  if (isAuthRoute) {
    if (isAuthenticated) {
      return <Navigate to={getHomeRoute()} replace />;
    }
    return (
      <>
        <Routes>
          <Route path="/login" element={<AdminLoginPage />} />
          <Route path="/forgot-password" element={<AdminForgotPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <AdminFloatingPwaWidget />
        <AdminAppSplashScreen />
      </>
    );
  }

  // Guard all operational desks if session is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role Permission Guard Helper with loop prevention
  const ProtectedByRole = ({ allowedRoles, children }) => {
    const isAllowed = currentRoleId === 'SUPER_ADMIN' || allowedRoles.includes(currentRoleId);
    if (isAllowed) {
      return children;
    }
    const targetHome = getHomeRoute();
    if (location.pathname === targetHome) {
      return (
        <div style={{ padding: '60px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', margin: '24px', border: '1.5px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            Restricted Operational Desk
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '480px', margin: '0 auto 16px' }}>
            Your account role (<strong>{ROLES[currentRoleId]?.label || currentRoleId}</strong>) does not have permission to access this page.
          </p>
          <a
            href={ROLES[currentRoleId]?.defaultRoute || '/orders-fulfillment'}
            style={{ display: 'inline-block', padding: '8px 18px', background: '#234B3C', color: '#FFF', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}
          >
            Go to Your Assigned Workspace
          </a>
        </div>
      );
    }
    return <Navigate to={targetHome} replace />;
  };

  return (
    <div className="admin-layout-wrapper">
      {syncError && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 999999,
          background: '#FEF2F2',
          border: '1.5px solid #F87171',
          color: '#991B1B',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>⚠️ {syncError}</span>
          <button
            onClick={() => setSyncError(null)}
            style={{ background: 'none', border: 'none', color: '#991B1B', fontWeight: 800, cursor: 'pointer' }}
          >✕</button>
        </div>
      )}

      {/* Smooth Scroll to Top on Page Navigation & Floating Top Button */}
      <ScrollToTop />

      {/* Desktop Left Sidebar */}
      <AdminSidebar />

      {/* Main Operations Workdesk */}
      <div className="admin-main-panel">
        {/* Mobile Top Header */}
        <AdminMobileHeader />

        {/* Desktop Topbar with User Chip, Role Switcher & Logout */}
        <AdminTopBar />

        {/* Page Routes */}
        <Routes>
          <Route path="/dashboard" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN']}><AdminDashboardPage /></ProtectedByRole>} />
          <Route path="/employees" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN']}><EmployeeManagementPage /></ProtectedByRole>} />
          <Route path="/master-data" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN']}><MasterDataPage /></ProtectedByRole>} />
          <Route path="/warehouse-settings" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER']}><WarehousesPage /></ProtectedByRole>} />
          <Route path="/orders-fulfillment" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'DELIVERY_EXECUTIVE']}><OrdersFulfillmentPage /></ProtectedByRole>} />
          <Route path="/approvals" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN']}><SocietyApprovalsPage /></ProtectedByRole>} />
          <Route path="/daily-pricing" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN']}><DailyPricingPage /></ProtectedByRole>} />
          <Route path="/payouts" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN']}><SocietyPayoutsPage /></ProtectedByRole>} />
          <Route path="/sales-onboarding" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'SALES_OFFICER']}><SalesOnboardingPage /></ProtectedByRole>} />
          <Route path="/sales-my-societies" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'SALES_OFFICER']}><SalesMySocietiesPage /></ProtectedByRole>} />
          <Route path="/procurement-demand" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_OFFICER']}><ProcurementDemandPage /></ProtectedByRole>} />
          <Route path="/procurement-entry" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_OFFICER']}><ProcurementEntryPage /></ProtectedByRole>} />
          <Route path="/procurement-logs" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_OFFICER']}><ProcurementLogsPage /></ProtectedByRole>} />
          <Route path="/inbound-leads" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'SALES_OFFICER']}><InboundLeadsPage /></ProtectedByRole>} />
          <Route path="/warehouse-crating" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}><WarehouseCratingPage /></ProtectedByRole>} />
          <Route path="/transactions" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER']}><FinancialTransactionsPage /></ProtectedByRole>} />
          <Route path="/societies" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'SALES_OFFICER']}><SocietiesDirectoryPage /></ProtectedByRole>} />
          <Route path="/vendors" element={<ProtectedByRole allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_OFFICER']}><VendorsDirectoryPage /></ProtectedByRole>} />
          
          <Route path="/login" element={<Navigate to={getHomeRoute()} replace />} />
          <Route path="/forgot-password" element={<Navigate to={getHomeRoute()} replace />} />
          <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />
          <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
        </Routes>

        {/* Mobile Bottom Navigation Dock */}
        <AdminMobileDock />

        {/* Mobile & Tablet Full Navigation Drawer */}
        <AdminMobileDrawer />

        {/* Global Admin Session Logout Confirmation Dialog */}
        <AdminLogoutConfirmModal />

        {/* Floating PWA Install Widget */}
        <AdminFloatingPwaWidget />

        {/* Animated App Splash Screen */}
        <AdminAppSplashScreen />
      </div>
    </div>
  );
}
