import api from './api';

export const discountService = {
  async getDiscounts(params = {}) {
    const response = await api.get('/discounts/', { params });
    return response.data;
  },

  async getDiscount(id) {
    const response = await api.get(`/discounts/${id}/`);
    return response.data;
  },

  async createDiscount(data) {
    const response = await api.post('/discounts/', data);
    return response.data;
  },

  async updateDiscount(id, data) {
    const response = await api.patch(`/discounts/${id}/`, data);
    return response.data;
  },

  async deleteDiscount(id) {
    const response = await api.delete(`/discounts/${id}/`);
    return response.data;
  },

  async deactivateDiscount(id) {
    const response = await api.post(`/discounts/${id}/deactivate/`);
    return response.data;
  },
};

export default discountService;

