import { apiClient } from '../api/client';

export const pricingService = {
  async getDailyPrices(date) {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    params.set('_t', Date.now().toString());
    return apiClient(`/pricing?${params.toString()}`);
  },
  async publishPrices(batchDto) {
    return apiClient('/pricing/batch', {
      method: 'POST',
      body: JSON.stringify(batchDto),
    });
  },
};
