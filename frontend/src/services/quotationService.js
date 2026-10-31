import api from './api';

export const quotationService = {
  // Quotation Templates
  async getTemplates(params = {}) {
    const response = await api.get('/quotation-templates/', { params });
    return response.data;
  },

  async getTemplate(id) {
    const response = await api.get(`/quotation-templates/${id}/`);
    return response.data;
  },

  async createTemplate(data) {
    const response = await api.post('/quotation-templates/', data);
    return response.data;
  },

  async updateTemplate(id, data) {
    const response = await api.patch(`/quotation-templates/${id}/`, data);
    return response.data;
  },

  async deleteTemplate(id) {
    const response = await api.delete(`/quotation-templates/${id}/`);
    return response.data;
  },

  // Quotations
  async getQuotations(params = {}) {
    const response = await api.get('/quotations/', { params });
    return response.data;
  },

  async getQuotation(id) {
    const response = await api.get(`/quotations/${id}/`);
    return response.data;
  },

  async createQuotation(data) {
    const response = await api.post('/quotations/', data);
    return response.data;
  },

  async updateQuotation(id, data) {
    const response = await api.patch(`/quotations/${id}/`, data);
    return response.data;
  },

  async deleteQuotation(id) {
    const response = await api.delete(`/quotations/${id}/`);
    return response.data;
  },

  // Quotation Status Actions
  async finalizeQuotation(id, reason = '') {
    const response = await api.post(`/quotations/${id}/finalize/`, { reason });
    return response.data;
  },

  async confirmQuotation(id, reason = '') {
    const response = await api.post(`/quotations/${id}/confirm/`, { reason });
    return response.data;
  },

  async cancelQuotation(id, reason = '') {
    const response = await api.post(`/quotations/${id}/cancel/`, { reason });
    return response.data;
  },

  // PDF & Email
  getPDFUrl(id, download = false) {
    return `/api/quotations/${id}/pdf/${download ? '?download=true' : ''}`;
  },

  async downloadPDF(id, filename = 'quotation.pdf') {
    const response = await api.get(`/quotations/${id}/pdf/?download=true`, {
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

  async sendQuotationEmail(id, data = {}) {
    const response = await api.post(`/quotations/${id}/send-email/`, data);
    return response.data;
  },

  async getQuotationHistory(id) {
    const response = await api.get(`/quotations/${id}/history/`);
    return response.data;
  },

  // Customer Lookup for Quotation Creation
  async getCustomersLookup() {
    const response = await api.get('/customers/lookup/');
    return response.data;
  },
};

export default quotationService;
