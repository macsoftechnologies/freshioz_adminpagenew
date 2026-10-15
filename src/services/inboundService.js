import { apiClient } from '../api/client';

export const inboundService = {
  async getAll() {
    return apiClient('/inbound-requests');
  },
  async create(data) {
    return apiClient('/inbound-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateStatus(id, status) {
    return apiClient('/inbound-requests', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    });
  },
};
