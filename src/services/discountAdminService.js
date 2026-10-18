import { apiClient } from '../api/client';

export const discountAdminService = {
  async getAll(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.userId) query.set('userId', params.userId);
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
