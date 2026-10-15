import { apiClient } from '../api/client';

export const inventoryService = {
  async getAll(warehouseId) {
    const qs = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
    return apiClient(`/inventory${qs}`);
  },
  async adjustStock(data) {
    return apiClient('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
