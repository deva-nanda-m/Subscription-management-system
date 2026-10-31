import api from './api';

export const planService = {
  // Subscription Plan CRUD
  async getPlans(params = {}) {
    const response = await api.get('/plans/', { params });
    return response.data;
  },

  async getPlan(id) {
    const response = await api.get(`/plans/${id}/`);
    return response.data;
  },

  async createPlan(data) {
    const response = await api.post('/plans/', data);
    return response.data;
  },

  async updatePlan(id, data) {
    const response = await api.patch(`/plans/${id}/`, data);
    return response.data;
  },

  async deletePlan(id) {
    const response = await api.delete(`/plans/${id}/`);
    return response.data;
  },

  // Lifecycle Status Transitions
  async pausePlan(id, changeReason = '') {
    const response = await api.post(`/plans/${id}/pause/`, { change_reason: changeReason });
    return response.data;
  },

  async resumePlan(id, changeReason = '') {
    const response = await api.post(`/plans/${id}/resume/`, { change_reason: changeReason });
    return response.data;
  },

  async closePlan(id, changeReason = '') {
    const response = await api.post(`/plans/${id}/close/`, { change_reason: changeReason });
    return response.data;
  },

  async activatePlan(id, changeReason = '') {
    const response = await api.post(`/plans/${id}/activate/`, { change_reason: changeReason });
    return response.data;
  },

  // Audit History
  async getPlanHistory(id) {
    const response = await api.get(`/plans/${id}/history/`);
    return response.data;
  },

  // Dashboard Aggregated Metrics
  async getPlanMetrics() {
    const response = await api.get('/plans/metrics/');
    return response.data;
  },
};

export default planService;

