import { apiClient } from '../api/client';

export const discountAdminService = {
  async getAll(params = {}) {
    const safeParams = params || {};
    const query = new URLSearchParams();
    if (safeParams.status) query.set('status', safeParams.status);
    if (safeParams.userId) query.set('userId', safeParams.userId);
    const qs = query.toString();
    return apiClient(`/customer-discounts/admin${qs ? `?${qs}` : ''}`);
  },

  async create(dto) {
    return apiClient('/customer-discounts/admin', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async revoke(id) {
    return apiClient(`/customer-discounts/admin/${id}/revoke`, {
      method: 'PATCH',
    });
  },
};
