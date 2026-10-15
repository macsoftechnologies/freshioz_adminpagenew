import { apiClient } from '../api/client';

export const employeeService = {
  async getAll() {
    return apiClient('/employees');
  },
  async getById(id) {
    return apiClient(`/employees/${id}`);
  },
  async create(data) {
    return apiClient('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id, data) {
    return apiClient(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
