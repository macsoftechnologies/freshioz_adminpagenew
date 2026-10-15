import { apiClient } from '../api/client';

export const orderService = {
  async getAll(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.societyId) query.set('societyId', params.societyId);
    if (params.phone) query.set('phone', params.phone);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
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
