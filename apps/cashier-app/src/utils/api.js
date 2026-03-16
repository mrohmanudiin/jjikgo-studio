import axios from 'axios';
import { io } from 'socket.io-client';

let API_URL = import.meta.env.VITE_API_URL || '';

if (!API_URL && import.meta.env.PROD) {
  const currentHost = window.location.hostname;
  if (currentHost.includes('railway') || currentHost.includes('vercel')) {
    API_URL = 'https://jjikgo-photobooth-production.up.railway.app';
  }
}

API_URL = API_URL.replace(/\/$/, '') || 'http://localhost:3000';

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Interceptor to inject Token from Zustand store (fallback if cookies fail)
api.interceptors.request.use((config) => {
    try {
        const storeStr = localStorage.getItem('jjikgo-store');
        if (storeStr) {
            const { state } = JSON.parse(storeStr);
            if (state?.user?.token) {
                config.headers.Authorization = `Bearer ${state.user.token}`;
            }
        }
    } catch (e) { }
    return config;
});

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('jjikgo-store');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export const socket = io(API_URL, {
    withCredentials: true,
});

// Theme helpers
export const fetchThemes = async () => {
    const response = await api.get('/studio/themes');
    return response.data;
};

export const fetchPackages = async () => {
    const response = await api.get('/studio/packages');
    return response.data;
};

export const fetchAddons = async () => {
    const response = await api.get('/studio/addons');
    return response.data;
};

export const fetchCafeSnacks = async () => {
    const response = await api.get('/studio/cafe-snacks');
    return response.data;
};

export const fetchPromos = async () => {
    const response = await api.get('/studio/promos');
    return response.data;
};

// Transaction helpers
export const fetchTransactions = async () => {
    const response = await api.get('/transactions');
    return response.data;
};

export const createTransaction = async (data) => {
    const response = await api.post('/transactions', { sessions: data });
    return response.data;
};

export const updateOrderStatusApi = async (id, status) => {
    const response = await api.put(`/transactions/${id}/status`, { status });
    return response.data;
};

// Queue helpers
export const fetchQueue = async () => {
    const response = await api.get('/queue');
    return response.data;
};

export const callNext = async (themeId) => {
    const response = await api.post('/queue/call-next', { theme_id: themeId });
    return response.data;
};

export const startSession = async (queueId, boothId) => {
    const response = await api.post('/queue/start', { queue_id: queueId, booth_id: boothId });
    return response.data;
};

export const finishSession = async (queueId, boothId) => {
    const response = await api.post('/queue/finish', { queue_id: queueId, booth_id: boothId });
    return response.data;
};

export const trackQueueApi = async (queueNumber) => {
    const response = await api.get(`/queue/track/${queueNumber}`);
    return response.data;
};
