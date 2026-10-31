import api from './api';

export const reportService = {
  async getDashboardSummary(params = {}) {
    const response = await api.get('/dashboard/summary/', { params });
    return response.data;
  },

  async getRevenueReport(params = {}) {
    const response = await api.get('/reports/revenue/', { params });
    return response.data;
  },

  async getSubscriptionReport(params = {}) {
    const response = await api.get('/reports/subscriptions/', { params });
    return response.data;
  },

  async getInvoiceReport(params = {}) {
    const response = await api.get('/reports/invoices/', { params });
    return response.data;
  },

  async getPaymentReport(params = {}) {
    const response = await api.get('/reports/payments/', { params });
    return response.data;
  },

  async downloadReportCSV(reportType, params = {}, filename = 'report.csv') {
    const response = await api.get(`/reports/${reportType}/`, {
      params: { ...params, export: 'csv' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default reportService;

