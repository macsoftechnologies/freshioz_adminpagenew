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

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

function makeResource(key, service, { refetchMs = 0 } = {}) {
  return {
    key,
    useList: (params, options = {}) =>
      useQuery({
        queryKey: [key, params ?? {}],
        queryFn: () => service.getAll(params ?? {}),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
        refetchInterval: refetchMs || false,
        refetchIntervalInBackground: false,
        ...options,
      }),
    useCreate: () => {
      const inv = useInvalidate();
      return useMutation({ mutationFn: (data) => service.create(data), onSuccess: () => inv(key) });
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

export const products = makeResource('products', productService);
export const vendors = makeResource('vendors', vendorService);
export const warehouses = makeResource('warehouses', warehouseService);
export const societies = makeResource('societies', societyService);
export const employees = makeResource('employees', employeeService);
export const categories = makeResource('categories', categoryService);
export const units = makeResource('units', unitService);
export const procurement = makeResource('procurement', procurementService);
export const leads = makeResource('leads', inboundService);
export const orders = makeResource('orders', orderService, { refetchMs: 15_000 }); // ops desk wants near-live

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
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    ...options,
  });
}

export function useAdjustStock() {
  const inv = useInvalidate();
  // Sends a DELTA / ledger entry, never an absolute quantity (absolute overwrites caused lost stock updates).
  return useMutation({ mutationFn: (dto) => inventoryService.adjustStock(dto), onSuccess: () => inv('inventory') });
}

export function usePayouts(params, options = {}) {
  return useQuery({ queryKey: ['payouts', params ?? {}], queryFn: () => societyService.listPayouts(params ?? {}), ...options });
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
