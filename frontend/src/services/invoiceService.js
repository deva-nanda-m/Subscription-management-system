import api from './api';

export const invoiceService = {
  async getInvoices(params = {}) {
    const response = await api.get('/invoices/', { params });
    return response.data;
  },

  async getOverdueInvoices(params = {}) {
    const response = await api.get('/invoices/overdue/', { params });
    return response.data;
  },

  async getInvoice(id) {
    const response = await api.get(`/invoices/${id}/`);
    return response.data;
  },

  async createInvoice(data) {
    const response = await api.post('/invoices/', data);
    return response.data;
  },

  async confirmInvoice(id) {
    const response = await api.post(`/invoices/${id}/confirm/`);
    return response.data;
  },

  async cancelInvoice(id) {
    const response = await api.post(`/invoices/${id}/cancel/`);
    return response.data;
  },

  async downloadPDF(id, filename = 'invoice.pdf') {
    const response = await api.get(`/invoices/${id}/pdf/?download=true`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async sendInvoiceEmail(id, data = {}) {
    const response = await api.post(`/invoices/${id}/send-email/`, data);
    return response.data;
  },

  // Recurring Billing Engine
  async runManualBilling() {
    const response = await api.post('/billing/run/');
    return response.data;
  },

  async getBillingLogs(params = {}) {
    const response = await api.get('/billing/logs/', { params });
    return response.data;
  },
};

export default invoiceService;

