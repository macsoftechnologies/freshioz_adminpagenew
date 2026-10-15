/**
 * ============================================================================
 * Freshioz Enterprise Master Data Store (Static Schema & Clean Seed State)
 * ============================================================================
 * Clean database state for testing the complete end-to-end operational flow.
 * Only the Master Super Administrator account is retained.
 */

// ============================================================================
// 1. WAREHOUSES (Primary Regional Sorting & Crating Agri-Logistics Hubs)
// ============================================================================
export const INITIAL_WAREHOUSES = [];


// ============================================================================
// 3. EMPLOYEES & ROLE ASSIGNMENTS
// Retains ONLY Super Admin for clean authentication
// ============================================================================
export const INITIAL_EMPLOYEES = [
  {
    id: 'FRZ_EMP_101',
    uuid: 'e1010000-0000-4000-8000-000000000101',
    name: 'Super Admin',
    phone: '9999999999',
    email: 'superadmin@gmail.com',
    roles: ['SUPER_ADMIN'],
    assignedWarehouseId: 'ALL',
    assignedLocationType: 'HEADQUARTERS',
    assignedLocationName: 'Freshioz HQ Command Center',
    status: 'ACTIVE',
    dateJoined: '2026-01-01',
    authMethod: 'PASSWORD',
    password: '123456',
    notes: 'Platform Director & Master Operations Head'
  }
];

// ============================================================================
// 4. SOCIETIES & APARTMENT COMMUNITIES
// ============================================================================
export const INITIAL_SOCIETIES = [];

// ============================================================================
// 5. PRODUCE CATEGORIES (Master Taxonomies)
// ============================================================================
export const INITIAL_CATEGORIES = [
  { id: 'VEGETABLES', name: 'Fresh Vegetables', slug: 'vegetables', icon: '🥦', description: 'Daily farm-fresh kitchen essentials and root vegetables', status: 'ACTIVE' },
  { id: 'FRUITS', name: 'Fresh Fruits', slug: 'fresh-fruits', icon: '🍎', description: 'Sweet, tree-ripened orchard and citrus fruits', status: 'ACTIVE' }
];

// ============================================================================
// 6. PACKAGING UNITS (Simplified Master Units)
// ============================================================================
export const INITIAL_UNITS = [
  { id: 'u-kg', name: 'kg', label: 'Kilogram (kg)', description: 'Standard consumer produce weight', status: 'ACTIVE' },
  { id: 'u-tones', name: 'tones', label: 'Metric Ton (tones)', description: 'Mandi truckloads and warehouse handling', status: 'ACTIVE' },
  { id: 'u-crate', name: 'crate', label: 'Standard Crate (crate)', description: 'Standard 20kg APMC harvesting / shipping crate', status: 'ACTIVE' },
  { id: 'u-g', name: 'g', label: 'Grams (g)', description: 'Punnet packs & small quantities (e.g., 250g, 500g)', status: 'ACTIVE' },
  { id: 'u-pack', name: 'pack', label: 'Prepack Polybag (pack)', description: 'Pre-sorted combo vegetables & tray packs', status: 'ACTIVE' },
  { id: 'u-bunch', name: 'bunch', label: 'Harvest Bunch (bunch)', description: 'Fresh leafy greens and herbs tied bunch', status: 'ACTIVE' }
];

// ============================================================================
// 7. PRODUCE CATALOG & PRODUCTS
// ============================================================================
export const INITIAL_PRODUCTS = [];

// ============================================================================
// 8. ORDERS & BATCHED FULFILLMENT RUNS
// ============================================================================
export const INITIAL_ORDERS = [];

// ============================================================================
// 9. SOCIETY WALLET WITHDRAWAL REQUESTS
// ============================================================================
export const INITIAL_WITHDRAWALS = [];

// ============================================================================
// 10. PROCUREMENT MANDI LOGS
// ============================================================================
export const INITIAL_PROCUREMENT_LOGS = [];

// ============================================================================
// 11. INBOUND SOCIETY LEADS / REQUESTS
// ============================================================================
export const INITIAL_SOCIETY_REQUESTS = [];

// ============================================================================
// 12. VENDORS & FARMERS MASTER (APMC Commission Agents, FPOs & Direct Growers)
// ============================================================================
export const INITIAL_VENDORS = [];

// ============================================================================
// 13. WAREHOUSE IN-STOCK INVENTORY
// ============================================================================
export const INITIAL_WAREHOUSE_INVENTORY = {};

// ============================================================================
// 14. DELIVERY FEE & SURCHARGE CONFIGURATION
// ============================================================================
export const INITIAL_DELIVERY_CONFIG = {
  baseFee: 25,
  freeDeliveryThreshold: 199,
  enableFreeDelivery: true
};

// ============================================================================
// 15. CONSOLIDATED DEFAULT INITIAL STORE OBJECT
// ============================================================================
export const DEFAULT_STORE = {
  warehouses: INITIAL_WAREHOUSES,
  employees: INITIAL_EMPLOYEES,
  societies: INITIAL_SOCIETIES,
  categories: INITIAL_CATEGORIES,
  units: INITIAL_UNITS,
  products: INITIAL_PRODUCTS,
  orders: INITIAL_ORDERS,
  withdrawals: INITIAL_WITHDRAWALS,
  procurementLogs: INITIAL_PROCUREMENT_LOGS,
  societyRequests: INITIAL_SOCIETY_REQUESTS,
  vendors: INITIAL_VENDORS,
  warehouseInventory: INITIAL_WAREHOUSE_INVENTORY,
  deliveryConfig: INITIAL_DELIVERY_CONFIG
};

export default DEFAULT_STORE;
