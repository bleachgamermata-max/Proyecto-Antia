import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Solo redirigir y limpiar token si NO estamos en páginas públicas
      const publicPaths = ['/login', '/register', '/'];
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      if (!publicPaths.includes(currentPath)) {
        // Token inválido o expirado en páginas protegidas
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  registerTipster: (data: any) => api.post('/auth/tipster/register', data),
  registerClient: (data: any) => api.post('/auth/client/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  sendOtp: (email: string) => api.post('/auth/otp/send', { email }),
  verifyOtp: (code: string) => api.post('/auth/otp/verify', { code }),
};

// Users
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: any) => api.patch('/users/me', data),
};

// Products
export const productsApi = {
  create: (data: any) => api.post('/products', data),
  getMy: () => api.get('/products/my'),
  getOne: (id: string) => api.get(`/products/${id}`),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  publish: (id: string) => api.post(`/products/${id}/publish`),
  pause: (id: string) => api.post(`/products/${id}/pause`),
  getCheckoutLink: (id: string) => api.get(`/products/${id}/checkout-link`),
};

// Orders
export const ordersApi = {
  getMy: () => api.get('/orders/my'),
};

// Referrals
export const referralsApi = {
  getLinks: () => api.get('/referrals/links'),
  getMetrics: (range?: string) => api.get('/referrals/metrics', { params: { range } }),
  getCommissions: () => api.get('/referrals/commissions'),
};

// Payouts
export const payoutsApi = {
  getMy: () => api.get('/payouts/my'),
};

// Houses
export const housesApi = {
  getAll: () => api.get('/houses'),
};
