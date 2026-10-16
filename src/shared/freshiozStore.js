// Freshioz Unified Shared Reactive Data Store for Admin Portal & User Web
// Synchronizes seamlessly with localStorage and dispatches window events for multi-tab sync

import {
  INITIAL_WAREHOUSES,
  INITIAL_EMPLOYEES,
  INITIAL_SOCIETIES,
  INITIAL_CATEGORIES,
  INITIAL_UNITS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_WITHDRAWALS,
  INITIAL_PROCUREMENT_LOGS,
  INITIAL_SOCIETY_REQUESTS,
  INITIAL_VENDORS,
  INITIAL_WAREHOUSE_INVENTORY,
  DEFAULT_STORE
} from './data';

// Re-export all static schemas and initial seed data for 100% backward compatibility
export {
  INITIAL_WAREHOUSES,
  INITIAL_EMPLOYEES,
  INITIAL_SOCIETIES,
  INITIAL_CATEGORIES,
  INITIAL_UNITS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_WITHDRAWALS,
  INITIAL_PROCUREMENT_LOGS,
  INITIAL_SOCIETY_REQUESTS,
  INITIAL_VENDORS,
  INITIAL_WAREHOUSE_INVENTORY,
  DEFAULT_STORE
};

// Storage key with clean slate versioning
const STORAGE_KEY = 'freshioz_master_store_clean_v6';
const LEGACY_STORAGE_KEYS = [
  'freshioz_master_store_clean_v5',
  'freshioz_master_store_clean_v4',
  'freshioz_master_store_clean_v3',
  'freshioz_master_store_clean_v2',
  'freshioz_master_store_clean_v1',
  'freshioz_master_store'
];

export function getFreshiozStore() {
  try {
    if (typeof localStorage !== 'undefined') {
      LEGACY_STORAGE_KEYS.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = { ...DEFAULT_STORE };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw);
    let hasUpdates = false;

    // Ensure categories master exists
    if (!parsed.categories || parsed.categories.length === 0) {
      parsed.categories = INITIAL_CATEGORIES;
      hasUpdates = true;
    }

    // Ensure packaging units master exists
    if (!parsed.units || parsed.units.length === 0) {
      parsed.units = INITIAL_UNITS;
      hasUpdates = true;
    }

    // Ensure at least Super Admin employee exists
    if (!parsed.employees || parsed.employees.length === 0) {
      parsed.employees = INITIAL_EMPLOYEES;
      hasUpdates = true;
    }

    // Ensure vendors master exists
    if (!parsed.vendors || parsed.vendors.length === 0) {
      parsed.vendors = INITIAL_VENDORS;
      hasUpdates = true;
    }

    // Ensure warehouse inventory exists
    if (!parsed.warehouseInventory) {
      parsed.warehouseInventory = INITIAL_WAREHOUSE_INVENTORY;
      hasUpdates = true;
    }

    // Guarantee all collections are arrays
    const collections = ['warehouses', 'societies', 'products', 'orders', 'withdrawals', 'procurementLogs', 'societyRequests', 'vendors'];
    collections.forEach(key => {
      if (!Array.isArray(parsed[key])) {
        parsed[key] = [];
        hasUpdates = true;
      }
    });

    // Clean up any bloated historical base64 images from localStorage
    if (Array.isArray(parsed.products)) {
      parsed.products.forEach(p => {
        if (typeof p.image === 'string' && p.image.startsWith('data:') && p.image.length > 50000) {
          p.image = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600';
          hasUpdates = true;
        }
      });
    }

    if (hasUpdates) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch (e) {
    console.error('Error parsing store from localStorage', e);
    return { ...DEFAULT_STORE };
  }
}

import { API_BASE_URL } from '../api/client';

export function prepareServerPayload(storeData) {
  if (!storeData || typeof storeData !== 'object') return {};

  let role = localStorage.getItem('freshioz_admin_role') || 'SUPER_ADMIN';
  try {
    const userStr = localStorage.getItem('freshioz_admin_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u.role) role = u.role;
    }
  } catch (e) {}

  const clean = {};

  const ROLE_PERMITTED_KEYS = {
    SUPER_ADMIN: [
      'warehouses', 'societies', 'orders', 'vendors', 'procurementLogs',
      'warehouseInventory', 'societyRequests', 'categories', 'units',
      'withdrawals', 'deletedProductIds', 'products'
    ],
    SALES_OFFICER: [
      'societies', 'societyRequests'
    ],
    PRICING_MANAGER: [
      'products', 'deletedProductIds'
    ],
    PROCUREMENT_OFFICER: [
      'vendors', 'procurementLogs', 'products', 'warehouses', 'orders'
    ],
    WAREHOUSE_MANAGER: [
      'warehouses', 'products', 'procurementLogs', 'orders', 'warehouseInventory', 'deletedProductIds', 'vendors'
    ],
    WAREHOUSE_STAFF: [
      'orders'
    ],
    DELIVERY_EXECUTIVE: [
      'orders'
    ]
  };

  const allowedKeys = ROLE_PERMITTED_KEYS[role] || ROLE_PERMITTED_KEYS.SUPER_ADMIN;

  for (const key of allowedKeys) {
    if (storeData[key] !== undefined) {
      clean[key] = storeData[key];
    }
  }

  if (clean.products && Array.isArray(clean.products)) {
    clean.products = clean.products.map(p => {
      let image = p.image || '';
      if (typeof image === 'string' && image.startsWith('data:') && image.length > 40000) {
        image = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600';
      }
      return {
        ...p,
        image
      };
    });
  }

  return clean;
}

// Cross-process server persistence directly to NestJS backend & PostgreSQL
export async function pushStoreToServer(storeData) {
  try {
    const token = localStorage.getItem('freshioz_auth_token') || localStorage.getItem('freshioz_admin_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const cleanPayload = prepareServerPayload(storeData);

    // If this role does not have any keys to push, skip network request
    if (Object.keys(cleanPayload).length === 0) {
      return { success: true };
    }

    const res = await fetch(`${API_BASE_URL}/freshioz-store`, {
      method: 'POST',
      headers,
      body: JSON.stringify(cleanPayload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson.message || `Server sync failed (${res.status})`;
      console.error('Server sync rejected with error:', errMsg);
      window.dispatchEvent(new CustomEvent('freshioz_sync_error', { detail: errMsg }));
      return { success: false, error: errMsg };
    }

    const resData = await res.json().catch(() => ({}));
    if (resData.persisted && resData.persisted.length > 0) {
      return { success: true, data: resData };
    }
    if (resData.skipped && resData.skipped.length > 0 && (!resData.persisted || resData.persisted.length === 0)) {
      const errMsg = `Your role does not permit modifying collection(s): ${resData.skipped.join(', ')}`;
      console.warn(`[Store Sync] ${errMsg}`);
      window.dispatchEvent(new CustomEvent('freshioz_sync_error', { detail: errMsg }));
      return { success: false, error: errMsg, skipped: resData.skipped };
    }
    return { success: true, data: resData };
  } catch (e) {
    console.error('Failed to sync store to PostgreSQL backend:', e);
    window.dispatchEvent(new CustomEvent('freshioz_sync_error', { detail: e.message }));
    return { success: false, error: e.message };
  }
}

function areInventoriesEqual(invA = {}, invB = {}) {
  if (invA === invB) return true;
  if (!invA || !invB || typeof invA !== 'object' || typeof invB !== 'object') return false;
  const whIdsA = Object.keys(invA);
  const whIdsB = Object.keys(invB);
  const allWhIds = new Set([...whIdsA, ...whIdsB]);
  for (const whId of allWhIds) {
    const mapA = invA[whId] || {};
    const mapB = invB[whId] || {};
    const allKeys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    for (const k of allKeys) {
      if (Number(mapA[k] || 0) !== Number(mapB[k] || 0)) return false;
    }
  }
  return true;
}

export function areEntityCollectionsEqual(localData, serverData) {
  if (!localData || !serverData) return false;
  const collections = [
    'categories', 'units', 'products', 'warehouses', 'societies',
    'orders', 'vendors', 'procurementLogs', 'warehouseInventory',
    'societyRequests', 'withdrawals', 'employees'
  ];
  for (const key of collections) {
    const localVal = localData[key];
    const serverVal = serverData[key];

    if (key === 'warehouseInventory') {
      if (!areInventoriesEqual(localVal, serverVal)) return false;
      continue;
    }

    const localArr = localVal || [];
    const serverArr = serverVal || [];
    if (!Array.isArray(localArr) || !Array.isArray(serverArr)) {
      if (JSON.stringify(localArr) !== JSON.stringify(serverArr)) return false;
      continue;
    }

    if (localArr.length !== serverArr.length) return false;

    // Map-based lookup by ID to ignore array sorting order differences between server & client
    const localMap = new Map();
    for (const item of localArr) {
      if (item && item.id) localMap.set(String(item.id), item);
    }

    for (const s of serverArr) {
      if (!s || !s.id) continue;
      const l = localMap.get(String(s.id));
      if (!l) return false;
      if (l.status !== s.status || l.name !== s.name) return false;
      if (key === 'orders') {
        if ((l.items?.length || 0) !== (s.items?.length || 0)) return false;
        if (l.deliverySlot !== s.deliverySlot || l.deliveryDate !== s.deliveryDate) return false;
      }
      if (key === 'products') {
        if (l.retailPrice !== s.retailPrice || l.wholesalePrice !== s.wholesalePrice) return false;
      }
    }
  }
  return true;
}

export async function syncFreshiozStoreFromServer() {
  try {
    // If the user is currently typing in an input, textarea, or contentEditable element,
    // skip dispatching store re-renders to prevent cursor jumps or closing modals.
    if (typeof document !== 'undefined') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return null;
      }
    }

    const token = localStorage.getItem('freshioz_auth_token') || localStorage.getItem('freshioz_admin_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/freshioz-store`, { 
      headers,
      signal: AbortSignal.timeout(5000) 
    }).catch(() => null);

    if (res && res.ok) {
      const serverData = await res.json();
      if (serverData && typeof serverData === 'object' && Array.isArray(serverData.categories)) {
        const currentLocal = getFreshiozStore();
        // Only update storage and dispatch re-render if data collections ACTUALLY changed.
        // This prevents aggressive re-renders from interrupting user operations.
        if (!areEntityCollectionsEqual(currentLocal, serverData)) {
          const mergedOrders = Array.isArray(serverData.orders) ? serverData.orders : [];
          const mergedProcurement = Array.isArray(serverData.procurementLogs) ? serverData.procurementLogs : [];
          const mergedVendors = Array.isArray(serverData.vendors) ? serverData.vendors : [];
          const mergedWarehouses = Array.isArray(serverData.warehouses) ? serverData.warehouses : [];
          const mergedSocieties = Array.isArray(serverData.societies) ? serverData.societies : [];
          const mergedWithdrawals = Array.isArray(serverData.withdrawals) ? serverData.withdrawals : [];
          const mergedSocietyRequests = Array.isArray(serverData.societyRequests) ? serverData.societyRequests : [];
          const mergedInventory = serverData.warehouseInventory || {};

          const mergedData = {
            ...currentLocal,
            ...serverData,
            orders: mergedOrders,
            procurementLogs: mergedProcurement,
            warehouseInventory: mergedInventory,
            warehouses: mergedWarehouses,
            societies: mergedSocieties,
            vendors: mergedVendors,
            withdrawals: mergedWithdrawals,
            societyRequests: mergedSocietyRequests,
            dailyPricingHistory: serverData.dailyPricingHistory || currentLocal.dailyPricingHistory || {}
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));
          window.dispatchEvent(new CustomEvent('freshioz_store_updated', { detail: mergedData }));
          return mergedData;
        }
      }
    }
  } catch (err) {}
  return null;
}

export function saveFreshiozStore(updater) {
  const current = getFreshiozStore();
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  // Dispatch multi-tab and local window sync event
  window.dispatchEvent(new CustomEvent('freshioz_store_updated', { detail: next }));
  
  // Persist to PostgreSQL backend with automatic rollback on failure
  pushStoreToServer(next).then(res => {
    if (res && !res.success) {
      console.warn('Server write failed. Rolling back local store to prevent phantom data.');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('freshioz_store_updated', { detail: current }));
    }
  });
  return next;
}

export function updateLocalFreshiozStore(updater) {
  const current = getFreshiozStore();
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('freshioz_store_updated', { detail: next }));
  return next;
}

export async function saveFreshiozStoreAsync(updater) {
  const current = getFreshiozStore();
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  
  // Await server persistence
  const result = await pushStoreToServer(next);
  if (result.success) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('freshioz_store_updated', { detail: next }));
  }
  
  return { ...result, store: result.success ? next : current };
}

// Reset everything to pure clean state (only Super Admin retained)
export function resetFreshiozStoreToClean() {
  const clean = JSON.parse(JSON.stringify(DEFAULT_STORE));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  window.dispatchEvent(new CustomEvent('freshioz_store_updated', { detail: clean }));
  pushStoreToServer(clean);
  return clean;
}

import { generateUUID } from '../utils/idGenerator';

/**
 * Human-readable, client-demo friendly business reference codes
 * e.g., Orders: FRZ_ORD_TX211, FRZ_ORD_TX212...
 * Employees: FRZ_EMP_101, FRZ_EMP_102...
 * Users: FRZ_USR_201, FRZ_USR_202...
 * Warehouses: FRZ_WH_01, FRZ_WH_02...
 * Societies: FRZ_SOC_101, FRZ_SOC_102...
 * Products: FRZ_PRD_101, FRZ_PRD_102...
 * Vendors: FRZ_VEN_101, FRZ_VEN_102...
 * Lots: FRZ_LOT_101, FRZ_LOT_102...
 * Procurement: FRZ_PROC_101, FRZ_PROC_102...
 */
export function generateId(prefix = 'FRZ') {
  let store = {};
  try {
    store = getFreshiozStore() || {};
  } catch (e) {
    store = {};
  }

  if (prefix === 'FRZ_ORD') {
    const existing = store.orders || [];
    let num = 211 + existing.length;
    let code = `FRZ_ORD_TX${num}`;
    while (existing.some(o => o.id === code)) {
      num++;
      code = `FRZ_ORD_TX${num}`;
    }
    return code;
  }

  if (prefix === 'FRZ_EMP') {
    const existing = store.employees || [];
    let num = 101 + existing.length;
    let code = `FRZ_EMP_${num}`;
    while (existing.some(e => e.id === code)) {
      num++;
      code = `FRZ_EMP_${num}`;
    }
    return code;
  }

  if (prefix === 'FRZ_USR') {
    const existing = store.users || [];
    let num = 201 + existing.length;
    let code = `FRZ_USR_${num}`;
    while (existing.some(u => u.id === code)) {
      num++;
      code = `FRZ_USR_${num}`;
    }
    return code;
  }

  if (prefix === 'FRZ_WH') {
    const existing = store.warehouses || [];
    let num = 1 + existing.length;
    let code = `FRZ_WH_${String(num).padStart(2, '0')}`;
    while (existing.some(w => w.id === code)) {
      num++;
      code = `FRZ_WH_${String(num).padStart(2, '0')}`;
    }
    return code;
  }

  if (prefix === 'FRZ_SOC') {
    const existing = store.societies || [];
    let num = 101 + existing.length;
    let code = `FRZ_SOC_${num}`;
    while (existing.some(s => s.id === code)) {
      num++;
      code = `FRZ_SOC_${num}`;
    }
    return code;
  }

  if (prefix === 'FRZ_VEN') {
    const existing = store.vendors || [];
    let num = 101 + existing.length;
    let code = `FRZ_VEN_${num}`;
    while (existing.some(v => v.id === code)) {
      num++;
      code = `FRZ_VEN_${num}`;
    }
    return code;
  }

  if (prefix === 'FRZ_PRD') {
    const existing = store.products || [];
    let num = 101 + existing.length;
    let code = `FRZ_PRD_${num}`;
    while (existing.some(p => p.id === code)) {
      num++;
      code = `FRZ_PRD_${num}`;
    }
    return code;
  }

  if (prefix === 'FRZ_LOT') {
    const orders = store.orders || [];
    const existingLots = new Set(orders.map(o => o.deliveryLotId).filter(Boolean));
    let num = 101 + existingLots.size;
    let code = `FRZ_LOT_${num}`;
    while (existingLots.has(code)) {
      num++;
      code = `FRZ_LOT_${num}`;
    }
    return code;
  }

  if (prefix === 'FRZ_PROC') {
    const existing = store.procurementLogs || [];
    let num = 101 + existing.length;
    let code = `FRZ_PROC_${num}`;
    while (existing.some(l => l.id === code)) {
      num++;
      code = `FRZ_PROC_${num}`;
    }
    return code;
  }

  if (prefix === 'FRZ_WDR') {
    const existing = store.withdrawals || [];
    let num = 101 + existing.length;
    let code = `FRZ_WDR_${num}`;
    while (existing.some(w => w.id === code)) {
      num++;
      code = `FRZ_WDR_${num}`;
    }
    return code;
  }

  if (prefix === 'FRZ_REQ') {
    const existing = store.societyRequests || [];
    let num = 101 + existing.length;
    let code = `FRZ_REQ_${num}`;
    while (existing.some(r => r.id === code)) {
      num++;
      code = `FRZ_REQ_${num}`;
    }
    return code;
  }

  const randNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}_TX${randNum}`;
}

export { API_BASE_URL, apiClient } from '../api/client';
export { generateUUID, generateId as standardGenerateId } from '../utils/idGenerator';
export { uploadService, uploadFile, uploadFiles } from '../services/uploadService';
export { productService } from '../services/productService';
export { orderService } from '../services/orderService';
export { warehouseService } from '../services/warehouseService';
export { societyService } from '../services/societyService';
export { vendorService } from '../services/vendorService';
export { procurementService } from '../services/procurementService';
export { inventoryService } from '../services/inventoryService';
export { employeeService } from '../services/employeeService';
export { inboundService } from '../services/inboundService';
export { pricingService } from '../services/pricingService';
