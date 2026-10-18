import { apiClient } from '../api/client';

export const inboundService = {
  async getAll() {
    const res = await apiClient('/inbound-requests');
    if (res && Array.isArray(res.leads)) {
      return res.leads;
    }
    return Array.isArray(res) ? res : [];
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
  async update(id, data) {
    const status = typeof data === 'string' ? data : (data.status || 'VERIFIED');
    return apiClient('/inbound-requests', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    });
  },
};
