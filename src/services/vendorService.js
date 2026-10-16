import { apiClient } from '../api/client';

export const vendorService = {
  async getAll() {
    return apiClient('/vendors');
  },
  async getById(id) {
    return apiClient(`/vendors/${id}`);
  },
  async create(data) {
    return apiClient('/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id, data) {
    return apiClient(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    });
  },
};
