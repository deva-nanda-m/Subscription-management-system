import axios from 'axios';

// Base API URL: falls back to relative /api when using Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let inMemoryToken = null;
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAccessToken = (token) => {
  inMemoryToken = token;
};

export const getAccessToken = () => {
  return inMemoryToken;
};

// Request interceptor: attach Authorization header
api.interceptors.request.use(
  (config) => {
    if (inMemoryToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle automatic token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth login, register or forgot-password endpoints
    if (
      originalRequest.url.includes('/auth/login/') ||
      originalRequest.url.includes('/auth/register/') ||
      originalRequest.url.includes('/auth/token/refresh/') ||
      originalRequest.url.includes('/auth/forgot-password/') ||
      originalRequest.url.includes('/auth/reset-password/')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt refresh using HttpOnly cookie or stored refresh token
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/token/refresh/`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.access;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

