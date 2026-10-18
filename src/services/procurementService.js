import { apiClient } from '../api/client';

export const procurementService = {
  async getAll() {
    return apiClient('/procurement');
  },
  async getById(id) {
    return apiClient(`/procurement/${id}`);
  },
  async create(data) {
    return apiClient('/procurement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiClient(`/procurement/${id}`, {
      method: 'DELETE',
    });
  },
};
