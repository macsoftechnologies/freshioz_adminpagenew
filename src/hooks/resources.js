// Server-state hooks for the admin portal. REPLACES getFreshiozStore()/saveFreshiozStore().
// Rules: (1) the server is the only source of truth, (2) every write is a dedicated endpoint call,
// (3) after a write we INVALIDATE and refetch, we never hand-edit a local copy.
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { vendorService } from '../services/vendorService';
import { warehouseService } from '../services/warehouseService';
import { societyService } from '../services/societyService';
import { employeeService } from '../services/employeeService';
import { categoryService } from '../services/categoryService';
import { unitService } from '../services/unitService';
import { procurementService } from '../services/procurementService';
import { inventoryService } from '../services/inventoryService';
import { inboundService } from '../services/inboundService';
import { pricingService } from '../services/pricingService';
import { misService } from '../services/misService';

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

function makeResource(key, service, { refetchMs = 0, extraInvalidate = [] } = {}) {
  return {
    key,
    useList: (params, options = {}) =>
      useQuery({
        queryKey: [key, params ?? {}],
        queryFn: () => service.getAll(params ?? {}),
        placeholderData: keepPreviousData,
        staleTime: 5_000,
        refetchInterval: refetchMs || false,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        ...options,
      }),
    useCreate: () => {
      const inv = useInvalidate();
      return useMutation({ mutationFn: (data) => service.create(data), onSuccess: () => inv(key, ...extraInvalidate) });
    },
    useUpdate: () => {
      const inv = useInvalidate();
      return useMutation({ mutationFn: ({ id, data }) => service.update(id, data), onSuccess: () => inv(key) });
    },
    useRemove: () => {
      const inv = useInvalidate();
      return useMutation({ mutationFn: (id) => service.delete(id), onSuccess: () => inv(key) });
    },
  };
}

export const products = makeResource('products', productService, { refetchMs: 20_000 });
export const vendors = makeResource('vendors', vendorService, { refetchMs: 30_000 });
export const warehouses = makeResource('warehouses', warehouseService, { refetchMs: 30_000 });
export const societies = makeResource('societies', societyService, { refetchMs: 12_000 });
export const employees = makeResource('employees', employeeService, { refetchMs: 30_000 });
export const categories = makeResource('categories', categoryService, { refetchMs: 30_000 });
export const units = makeResource('units', unitService, { refetchMs: 30_000 });
export const procurement = makeResource('procurement', procurementService, { refetchMs: 12_000, extraInvalidate: ['orders', 'inventory'] });
export const leads = makeResource('leads', inboundService, { refetchMs: 12_000 });
export const orders = makeResource('orders', orderService, { refetchMs: 12_000 }); // ops desk wants near-live

// ---- Operations that are NOT plain CRUD (each maps to ONE server transaction) ----

export function useUpdateOrderStatus() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...dto }) => orderService.updateStatus(id, dto), // server credits commission exactly once
    onSuccess: () => inv('orders', 'societies', 'payouts'),
  });
}

export function useInventory(warehouseId, options = {}) {
  return useQuery({
    queryKey: ['inventory', warehouseId ?? 'ALL'],
    queryFn: () => inventoryService.getAll(warehouseId),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    ...options,
  });
}

export function useAdjustStock() {
  const inv = useInvalidate();
  // Sends a DELTA / ledger entry, never an absolute quantity (absolute overwrites caused lost stock updates).
  return useMutation({ mutationFn: (dto) => inventoryService.adjustStock(dto), onSuccess: () => inv('inventory') });
}

export function usePayouts(params, options = {}) {
  return useQuery({
    queryKey: ['payouts', params ?? {}],
    queryFn: () => societyService.listPayouts(params ?? {}),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    ...options,
  });
}

export function useApprovePayout() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ id, transactionRef }) => societyService.approvePayout(id, transactionRef),
    onSuccess: () => inv('payouts', 'societies'),
  });
}

export function useRejectPayout() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }) => societyService.rejectPayout(id, reason),
    onSuccess: () => inv('payouts', 'societies'),
  });
}

export function usePublishPrices() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (batch) => pricingService.publishPrices(batch), onSuccess: () => inv('products') });
}

export function useMisAnalytics(params, options = {}) {
  return useQuery({
    queryKey: ['mis-analytics', params ?? {}],
    queryFn: () => misService.getExecutiveSummary(params ?? {}),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    ...options,
  });
}

export function useReconcileRiderCash() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (dto) => misService.reconcileRiderCash(dto),
    onSuccess: () => inv('mis-analytics', 'orders'),
  });
}
