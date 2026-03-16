import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || '';

if (!API_URL && import.meta.env.PROD) {
  const currentHost = window.location.hostname;
  if (currentHost.includes('railway') || currentHost.includes('vercel')) {
    API_URL = 'https://backend-production-d3fc.up.railway.app';
  }
}

API_URL = API_URL.replace(/\/$/, '') || 'http://localhost:3000';
console.log('📡 [Jjikgo] Connecting to API:', API_URL);

const api = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use((config) => {
    try {
        const storeStr = localStorage.getItem('jjikgo-admin-store');
        if (storeStr) {
            const { user } = JSON.parse(storeStr);
            if (user?.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
        }
    } catch (e) {}
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('jjikgo-admin-store');
            // Avoid infinite loops, only reload if not already at login
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
export { API_URL };
