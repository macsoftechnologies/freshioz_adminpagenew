import { apiClient } from '../api/client';

export const reviewAdminService = {
  async getAll(params = {}) {
    const safeParams = params || {};
    const query = new URLSearchParams();
    if (safeParams.status) query.set('status', safeParams.status);
    if (safeParams.type) query.set('type', safeParams.type);
    if (safeParams.flagged !== undefined) query.set('flagged', String(safeParams.flagged));
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
