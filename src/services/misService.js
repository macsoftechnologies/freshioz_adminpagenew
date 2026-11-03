import { apiClient } from '../api/client';

export const misService = {
  async getExecutiveSummary(params = {}) {
    const query = new URLSearchParams();
    if (params.range) query.set('range', params.range);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);

    const qs = query.toString();
    return apiClient(`/mis/executive-summary${qs ? `?${qs}` : ''}`);
  },

  async reconcileRiderCash(dto) {
    return apiClient('/mis/reconcile-rider-cash', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },
};

