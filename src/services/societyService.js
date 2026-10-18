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
      body: JSON.stringify({ id, ...data }),
    });
  },
  async requestPayout(id, amount) {
    return apiClient(`/societies/${id}/payout-request`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
  async listPayouts(params = {}) {
    const safeParams = params || {};
    const query = new URLSearchParams();
    if (safeParams.societyId) query.set('societyId', safeParams.societyId);
    if (safeParams.status) query.set('status', safeParams.status);
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
