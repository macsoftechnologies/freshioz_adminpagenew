import { apiClient } from '../api/client';

export const categoryService = {
  async getAll(params = {}) {
    const safeParams = params || {};
    const query = new URLSearchParams();
    if (safeParams.status) query.set('status', safeParams.status);
    const qs = query.toString();
    return apiClient(`/categories${qs ? `?${qs}` : ''}`);
  },
  async getById(idOrSlug) {
    return apiClient(`/categories/${idOrSlug}`);
  },
  async create(data) {
    return apiClient('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id, data) {
    return apiClient(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiClient(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};
