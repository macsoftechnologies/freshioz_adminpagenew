import { apiClient } from '../api/client';

export const unitService = {
  async getAll(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    return apiClient(`/units${qs ? `?${qs}` : ''}`);
  },
  async getById(id) {
    return apiClient(`/units/${id}`);
  },
  async create(data) {
    return apiClient('/units', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id, data) {
    return apiClient(`/units/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiClient(`/units/${id}`, {
      method: 'DELETE',
    });
  },
};
