import { apiClient } from '../api/client';

export const pricingService = {
  async getDailyPrices(date) {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiClient(`/pricing${qs}`);
  },
  async publishPrices(batchDto) {
    return apiClient('/pricing/batch', {
      method: 'POST',
      body: JSON.stringify(batchDto),
    });
  },
};
