import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../api/client';
import { 
  societies as societyResource,
  warehouses as warehouseResource,
  employees as employeeResource,
  vendors as vendorResource,
  leads as leadResource,
  orders as orderResource,
  procurement as procurementResource,
  products as productResource,
  categories as categoryResource,
  usePayouts,
} from '../hooks/resources';

const AdminRoleContext = createContext(null);

export const ROLES = {
  SUPER_ADMIN: {
    id: 'SUPER_ADMIN',
    label: 'Super Admin',
    desc: 'Master Operations, Graphs, Approvals & Pricing',
    defaultRoute: '/dashboard'
  },
  WAREHOUSE_MANAGER: {
    id: 'WAREHOUSE_MANAGER',
    label: 'Warehouse & Procurement Manager',
    desc: 'Mandi Procurement, Inwarding, Inventory & Crating Lines',
    defaultRoute: '/procurement-demand'
  },
  WAREHOUSE_STAFF: {
    id: 'WAREHOUSE_STAFF',
    label: 'Warehouse Staff / Packer',
    desc: 'Crate Sorting, Produce Bagging, Order Tagging & Packing Queue',
    defaultRoute: '/warehouse-crating'
  },
  DELIVERY_EXECUTIVE: {
    id: 'DELIVERY_EXECUTIVE',
    label: 'Delivery Executive (Rider)',
    desc: 'Morning Society Drop Desk Route Manifest & Dispatch',
    defaultRoute: '/orders-fulfillment'
  },
  SALES_OFFICER: {
    id: 'SALES_OFFICER',
    label: 'Field Sales Officer',
    desc: 'Society Onboarding, GPS Tagging & Hub Assignment',
    defaultRoute: '/sales-onboarding'
  }
};

const DEMO_USERS = {
  SUPER_ADMIN: {
    id: 'FRZ_EMP_101',
    name: 'Super Admin',
    email: 'superadmin@gmail.com',
    phone: '9999999999',
    role: 'SUPER_ADMIN',
    roles: ['SUPER_ADMIN'],
    avatar: 'SA'
  }
};



export function AdminRoleProvider({ children }) {
  const queryClient = useQueryClient();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = localStorage.getItem('freshioz_admin_auth');
    const token = localStorage.getItem('freshioz_auth_token') || localStorage.getItem('freshioz_admin_token');
    return storedAuth === 'true' && !!token;
  });

  const [currentRoleId, setCurrentRoleId] = useState(() => {
    return localStorage.getItem('freshioz_admin_role') || 'SUPER_ADMIN';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('freshioz_admin_user');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return DEMO_USERS[currentRoleId] || DEMO_USERS.SUPER_ADMIN;
  });

  const isSuperAdmin = currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.role === 'SUPER_ADMIN' || currentUser?.email === 'superadmin@gmail.com';
  const isProcurementRole = isSuperAdmin || 
    currentUser?.roles?.includes('WAREHOUSE_MANAGER') || 
    currentUser?.roles?.includes('PROCUREMENT_OFFICER') || 
    currentUser?.role === 'WAREHOUSE_MANAGER' || 
    currentUser?.role === 'PROCUREMENT_OFFICER';

  // Live server-driven state via React Query (only enabled when authenticated session exists & role has permission)
  const queryOpts = { enabled: !!isAuthenticated };
  const societiesQuery = societyResource.useList(null, queryOpts);
  const warehousesQuery = warehouseResource.useList(null, queryOpts);
  const employeesQuery = employeeResource.useList(null, { enabled: !!isAuthenticated && isSuperAdmin });
  const vendorsQuery = vendorResource.useList(null, queryOpts);
  const leadsQuery = leadResource.useList(null, queryOpts);
  const ordersQuery = orderResource.useList(null, queryOpts);
  const procurementQuery = procurementResource.useList(null, { enabled: !!isAuthenticated && isProcurementRole });
  const productsQuery = productResource.useList(null, queryOpts);
  const categoriesQuery = categoryResource.useList(null, queryOpts);
  const withdrawalsQuery = usePayouts(null, { enabled: !!isAuthenticated && isSuperAdmin });

  const societies = societiesQuery.data ?? [];
  const warehouses = warehousesQuery.data ?? [];
  const employees = employeesQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const leadsData = leadsQuery.data ?? {};
  const orders = ordersQuery.data ?? [];
  const procurementLogs = procurementQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const withdrawals = withdrawalsQuery.data ?? [];

  const allQueries = [
    societiesQuery,
    warehousesQuery,
    employeesQuery,
    vendorsQuery,
    leadsQuery,
    ordersQuery,
    procurementQuery,
    productsQuery,
    categoriesQuery,
    withdrawalsQuery,
  ];

  const isActualOutage = (q) => q.isError && q.error?.status !== 403;

  const hasApiError = allQueries.some(isActualOutage);

  const apiErrorMessage = allQueries.find(isActualOutage)?.error?.message || null;

  const isInitialLoading = Boolean(isAuthenticated && (
    societiesQuery.isLoading ||
    ordersQuery.isLoading ||
    productsQuery.isLoading ||
    warehousesQuery.isLoading
  ));

  // Proactively and immediately refetch all operational queries whenever authenticated session activates
  useEffect(() => {
    if (isAuthenticated) {
      queryClient.refetchQueries();
    }
  }, [isAuthenticated, queryClient]);

  const store = React.useMemo(() => ({
    societies: Array.isArray(societies) ? societies : [],
    warehouses: Array.isArray(warehouses) ? warehouses : [],
    employees: Array.isArray(employees) ? employees : [],
    vendors: Array.isArray(vendors) ? vendors : [],
    societyRequests: leadsData?.leads || (Array.isArray(leadsData) ? leadsData : []),
    orders: Array.isArray(orders) ? orders : [],
    procurementLogs: Array.isArray(procurementLogs) ? procurementLogs : [],
    products: Array.isArray(products) ? products : [],
    categories: Array.isArray(categories) ? categories : [],
    withdrawals: Array.isArray(withdrawals) ? withdrawals : [],
    users: [],
  }), [societies, warehouses, employees, vendors, leadsData, orders, procurementLogs, products, categories, withdrawals]);

  const setRole = (roleId) => {
    // Super Admin can switch to preview any role desk without losing Super Admin status
    if (isSuperAdmin) {
      setCurrentRoleId(roleId);
      localStorage.setItem('freshioz_admin_role', roleId);
      const preservedRoles = Array.isArray(currentUser?.roles) && currentUser.roles.includes('SUPER_ADMIN')
        ? currentUser.roles
        : ['SUPER_ADMIN', ...(currentUser?.roles || [])];
      const updated = { ...currentUser, role: roleId, roles: preservedRoles };
      setCurrentUser(updated);
      localStorage.setItem('freshioz_admin_user', JSON.stringify(updated));
      return;
    }

    // Non-super-admin can only switch between roles explicitly assigned to them
    if (currentUser?.roles && !currentUser.roles.includes(roleId)) {
      return;
    }

    setCurrentRoleId(roleId);
    localStorage.setItem('freshioz_admin_role', roleId);
    const updated = { ...currentUser, role: roleId };
    setCurrentUser(updated);
    localStorage.setItem('freshioz_admin_user', JSON.stringify(updated));
  };

  const login = async (emailOrPhone, password, roleId = 'SUPER_ADMIN') => {
    const cleanInput = (emailOrPhone || '').trim().toLowerCase();
    const cleanDigits = (emailOrPhone || '').replace(/\D/g, '');

    // 1. Live NestJS Backend JWT Authentication
    try {
      const authRes = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanInput, password }),
        signal: AbortSignal.timeout(4000)
      }).catch(() => null);

      if (authRes && authRes.ok) {
        const authData = await authRes.json();
        if (authData.token && authData.user) {
          localStorage.setItem('freshioz_auth_token', authData.token);
          const chosenRole = authData.user.roles?.[0] || 'SUPER_ADMIN';
          const userObj = {
            id: authData.user.id,
            uuid: authData.user.id,
            name: authData.user.name,
            email: authData.user.email,
            phone: authData.user.phone,
            role: chosenRole,
            roles: authData.user.roles || [chosenRole],
            avatar: (authData.user.name?.[0] || 'A').toUpperCase(),
            assignedWarehouseId: authData.user.assignedWarehouseId || 'ALL',
            assignedLocationName: 'Freshioz Command Center'
          };
          setCurrentRoleId(chosenRole);
          setCurrentUser(userObj);
          setIsAuthenticated(true);
          localStorage.setItem('freshioz_admin_role', chosenRole);
          localStorage.setItem('freshioz_admin_user', JSON.stringify(userObj));
          localStorage.setItem('freshioz_admin_auth', 'true');
          queryClient.invalidateQueries();
          return { success: true, user: userObj, token: authData.token };
        }
      } else if (authRes && !authRes.ok) {
        const errJson = await authRes.json().catch(() => ({}));
        return { success: false, error: errJson.message || 'Authentication failed. Please verify credentials.' };
      }
    } catch (e) {
      return { success: false, error: 'Cannot connect to backend API server. Please ensure backend is running.' };
    }

    return { success: false, error: 'Invalid email or password.' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('freshioz_admin_auth', 'false');
    localStorage.removeItem('freshioz_auth_token');
    localStorage.removeItem('freshioz_admin_token');
    localStorage.removeItem('freshioz_admin_user');
    queryClient.clear();
  };

  // Listen for 401 Unauthorized events from apiClient to gracefully log out expired sessions
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('freshioz_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('freshioz_auth_expired', handleAuthExpired);
    };
  }, []);

  const forgotPassword = (emailOrPhone) => {
    // Simulated token generation for backend implementation
    return {
      success: true,
      resetToken: `rst_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      recipient: emailOrPhone
    };
  };

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const currentRole = ROLES[currentRoleId] || ROLES.SUPER_ADMIN;

  // Compute allowed roles for the logged-in employee:
  // - Super Admin can switch across all operational desks.
  // - Multi-role staff can only switch between roles explicitly assigned to them.
  // - Single-role staff cannot switch at all.
  const userRolesList = isSuperAdmin
    ? Object.keys(ROLES)
    : (currentUser?.roles && currentUser.roles.length > 0
        ? currentUser.roles
        : [currentUser?.role || currentRoleId]);

  const allowedRoles = userRolesList.map(rId => ROLES[rId]).filter(Boolean);
  const canSwitchRoles = allowedRoles.length > 1;

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const requestLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
  };

  return (
    <AdminRoleContext.Provider
      value={{
        store,
        currentRole,
        currentRoleId,
        setRole,
        isAuthenticated,
        currentUser,
        allowedRoles,
        canSwitchRoles,
        login,
        logout,
        isLogoutModalOpen,
        setIsLogoutModalOpen,
        requestLogout,
        confirmLogout,
        forgotPassword,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
        isAdmin: currentRoleId === 'SUPER_ADMIN',
        isSales: currentRoleId === 'SALES_OFFICER',
        isProcurement: currentRoleId === 'WAREHOUSE_MANAGER' || currentRoleId === 'PROCUREMENT_OFFICER',
        isWarehouse: currentRoleId === 'WAREHOUSE_MANAGER',
        isWarehouseStaff: currentRoleId === 'WAREHOUSE_STAFF',
        isStoreManager: currentRoleId === 'STORE_MANAGER',
        isRider: currentRoleId === 'DELIVERY_EXECUTIVE',
        hasApiError,
        apiErrorMessage,
        isInitialLoading,
        refetchAll: () => queryClient.refetchQueries()
      }}
    >
      {children}
    </AdminRoleContext.Provider>
  );
}

export function useAdminRole() {
  const ctx = useContext(AdminRoleContext);
  if (!ctx) throw new Error('useAdminRole must be used within AdminRoleProvider');
  return ctx;
}
