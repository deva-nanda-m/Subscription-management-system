import api, { setAccessToken } from './api';

export const authService = {
  // Public Customer Registration
  async register(data) {
    const response = await api.post('/auth/register/', data);
    return response.data;
  },

  // Login
  async login(credentials) {
    const response = await api.post('/auth/login/', credentials);
    if (response.data?.tokens?.access) {
      setAccessToken(response.data.tokens.access);
    }
    return response.data;
  },

  // Refresh Token
  async refreshToken() {
    const response = await api.post('/auth/token/refresh/', {});
    if (response.data?.access) {
      setAccessToken(response.data.access);
    }
    return response.data;
  },

  // Logout
  async logout() {
    try {
      await api.post('/auth/logout/', {});
    } finally {
      setAccessToken(null);
    }
  },

  // Current authenticated user profile
  async getCurrentUser() {
    const response = await api.get('/auth/me/');
    return response.data;
  },

  // Forgot password
  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password/', { email });
    return response.data;
  },

  // Reset password
  async resetPassword(data) {
    const response = await api.post('/auth/reset-password/', data);
    return response.data;
  },

  // Admin Staff Management APIs
  async getStaffList(params = {}) {
    const response = await api.get('/admin/staff/', { params });
    return response.data;
  },

  async getStaffDetail(id) {
    const response = await api.get(`/admin/staff/${id}/`);
    return response.data;
  },

  async createStaff(data) {
    const response = await api.post('/admin/staff/', data);
    return response.data;
  },

  async updateStaffStatus(id, isActive) {
    const response = await api.patch(`/admin/staff/${id}/status/`, { is_active: isActive });
    return response.data;
  },
};

export default authService;

