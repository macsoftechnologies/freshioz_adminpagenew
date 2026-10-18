import { apiClient } from '../api/client';

export const reviewAdminService = {
  async getAll(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.type) query.set('type', params.type);
    if (params.flagged !== undefined) query.set('flagged', String(params.flagged));
    const qs = query.toString();
    return apiClient(`/reviews/admin${qs ? `?${qs}` : ''}`);
  },

  async moderate(id, updateDto) {
    return apiClient(`/reviews/admin/${id}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify(updateDto),
    });
  },
};
