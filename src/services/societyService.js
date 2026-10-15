import { apiClient } from '../api/client';

export const societyService = {
  async getAll() {
    return apiClient('/societies');
  },
  async getById(id) {
    return apiClient(`/societies/${id}`);
  },
  async create(data) {
    return apiClient('/societies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id, data) {
    return apiClient(`/societies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async requestPayout(id, amount) {
    return apiClient(`/societies/${id}/payout-request`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
  async listPayouts(params = {}) {
    const query = new URLSearchParams();
    if (params.societyId) query.set('societyId', params.societyId);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    return apiClient(`/societies/payouts${qs ? `?${qs}` : ''}`);
  },
  async approvePayout(id, transactionRef) {
    return apiClient(`/societies/payouts/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ transactionRef }),
    });
  },
  async rejectPayout(id, reason) {
    return apiClient(`/societies/payouts/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
