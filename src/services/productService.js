import { apiClient } from '../api/client';

export const productService = {
  async getAll() {
    return apiClient('/products');
  },
  async getById(id) {
    return apiClient(`/products/${id}`);
  },
  async create(productData) {
    return apiClient('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },
  async update(id, productData) {
    return apiClient(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },
  async delete(id) {
    return apiClient(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};
