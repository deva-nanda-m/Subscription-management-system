import api from './api';

export const paymentService = {
  async getPayments(params = {}) {
    const response = await api.get('/payments/', { params });
    return response.data;
  },

  async getPayment(id) {
    const response = await api.get(`/payments/${id}/`);
    return response.data;
  },

  async recordManualPayment(data) {
    const response = await api.post('/payments/record-manual/', data);
    return response.data;
  },

  async createRazorpayOrder(invoiceId) {
    const response = await api.post('/payments/create-razorpay-order/', { invoice_id: invoiceId });
    return response.data;
  },

  async verifyRazorpayPayment(data) {
    const response = await api.post('/payments/verify-razorpay/', data);
    return response.data;
  },
};

export default paymentService;

