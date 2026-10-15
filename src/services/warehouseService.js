import { apiClient } from '../api/client';

export const warehouseService = {
  async getAll() {
    return apiClient('/warehouses');
  },
  async getById(id) {
    return apiClient(`/warehouses/${id}`);
  },
  async create(data) {
    return apiClient('/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id, data) {
    return apiClient(`/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiClient(`/warehouses/${id}`, {
      method: 'DELETE',
    });
  },
};
