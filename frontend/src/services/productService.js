import api from './api';

export const productService = {
  // Product APIs
  async getProducts(params = {}) {
    const response = await api.get('/products/', { params });
    return response.data;
  },

  async getProduct(id) {
    const response = await api.get(`/products/${id}/`);
    return response.data;
  },

  async createProduct(data) {
    const response = await api.post('/products/', data);
    return response.data;
  },

  async updateProduct(id, data) {
    const response = await api.patch(`/products/${id}/`, data);
    return response.data;
  },

  async deleteProduct(id) {
    const response = await api.delete(`/products/${id}/`);
    return response.data;
  },

  async updateProductStatus(id, status) {
    const response = await api.patch(`/products/${id}/status/`, { status });
    return response.data;
  },

  // Product Variant APIs
  async getVariants(productId) {
    const response = await api.get(`/products/${productId}/variants/`);
    return response.data;
  },

  async createVariant(productId, data) {
    const response = await api.post(`/products/${productId}/variants/`, data);
    return response.data;
  },

  async getVariant(id) {
    const response = await api.get(`/variants/${id}/`);
    return response.data;
  },

  async updateVariant(id, data) {
    const response = await api.patch(`/variants/${id}/`, data);
    return response.data;
  },

  async deleteVariant(id) {
    const response = await api.delete(`/variants/${id}/`);
    return response.data;
  },

  async updateVariantStatus(id, isActive) {
    const response = await api.patch(`/variants/${id}/status/`, { is_active: isActive });
    return response.data;
  },
};

export default productService;

