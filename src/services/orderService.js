import { apiClient } from '../api/client';

export const orderService = {
  async getAll(params = {}) {
    const safeParams = params || {};
    const query = new URLSearchParams();
    if (safeParams.status) query.set('status', safeParams.status);
    if (safeParams.societyId) query.set('societyId', safeParams.societyId);
    if (safeParams.phone) query.set('phone', safeParams.phone);
    if (safeParams.warehouseId) query.set('warehouseId', safeParams.warehouseId);
    const qs = query.toString();
    return apiClient(`/orders${qs ? `?${qs}` : ''}`);
  },
  async getById(id) {
    return apiClient(`/orders/${id}`);
  },
  async track(id) {
    return apiClient(`/orders/${id}/track`);
  },
  async create(orderData) {
    return apiClient('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },
  async updateStatus(id, updateDto) {
    return apiClient(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(updateDto),
    });
  },
};
