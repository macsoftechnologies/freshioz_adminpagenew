import { apiClient } from '../api/client';

export const paymentSettingsService = {
  async getSettings() {
    return apiClient('/payments/settings');
  },

  async updateSettings(payload) {
    return apiClient('/payments/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

