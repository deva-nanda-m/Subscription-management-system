import api from './api';

export const taxService = {
  async getTaxes(params = {}) {
    const response = await api.get('/taxes/', { params });
    return response.data;
  },

  async getTax(id) {
    const response = await api.get(`/taxes/${id}/`);
    return response.data;
  },

  async createTax(data) {
    const response = await api.post('/taxes/', data);
    return response.data;
  },

  async updateTax(id, data) {
    const response = await api.patch(`/taxes/${id}/`, data);
    return response.data;
  },

  async deleteTax(id) {
    const response = await api.delete(`/taxes/${id}/`);
    return response.data;
  },
};

export default taxService;

