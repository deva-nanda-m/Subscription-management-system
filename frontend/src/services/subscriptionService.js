import api from './api';

export const subscriptionService = {
  // Convert Confirmed Quotation to Subscription
  async convertQuotation(quotationId, data = {}) {
    const response = await api.post(`/subscriptions/convert/${quotationId}/`, data);
    return response.data;
  },

  // Subscription CRUD
  async getSubscriptions(params = {}) {
    const response = await api.get('/subscriptions/', { params });
    return response.data;
  },

  async getSubscription(id) {
    const response = await api.get(`/subscriptions/${id}/`);
    return response.data;
  },

  // Lifecycle Operations
  async activateSubscription(id, reason = '') {
    const response = await api.post(`/subscriptions/${id}/activate/`, { reason });
    return response.data;
  },

  async pauseSubscription(id, reason = '') {
    const response = await api.post(`/subscriptions/${id}/pause/`, { reason });
    return response.data;
  },

  async resumeSubscription(id) {
    const response = await api.post(`/subscriptions/${id}/resume/`);
    return response.data;
  },

  async renewSubscription(id, data = {}) {
    const response = await api.post(`/subscriptions/${id}/renew/`, data);
    return response.data;
  },

  async closeSubscription(id, reason = '') {
    const response = await api.post(`/subscriptions/${id}/close/`, { reason });
    return response.data;
  },

  // History & Renewals
  async getSubscriptionHistory(id) {
    const response = await api.get(`/subscriptions/${id}/history/`);
    return response.data;
  },

  async getSubscriptionRenewals(id) {
    const response = await api.get(`/subscriptions/${id}/renewals/`);
    return response.data;
  },
};

export default subscriptionService;

