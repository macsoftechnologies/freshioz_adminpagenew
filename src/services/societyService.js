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
};
