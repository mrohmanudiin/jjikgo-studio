import axios from 'axios';
import { io } from 'socket.io-client';

let API_URL = import.meta.env.VITE_API_URL || '';
API_URL = API_URL.replace(/\/$/, '') || 'http://localhost:3000';
console.log('📡 [Jjikgo] Connecting to API:', API_URL);

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

// Interceptor to inject Token from store
api.interceptors.request.use((config) => {
    try {
        const storeStr = localStorage.getItem('jjikgo-staff-store');
        if (storeStr) {
            try {
                const data = JSON.parse(storeStr);
                const token = data.token || data.state?.user?.token;
                if (token) {
                    // Use set() for Axios >= 1.2.0 (AxiosHeaders) compatibility
                    if (typeof config.headers?.set === 'function') {
                        config.headers.set('Authorization', `Bearer ${token}`);
                    } else {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                }
            } catch(e) {}
        }
    } catch (e) { }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('jjikgo-staff-store');
            if (window.location.pathname !== '/') {
                 window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export const socket = io(API_URL, {
    transports: ['polling'],
    withCredentials: true,
});

// ─── Auth helpers ──────────────────────────────────────────────────────────────
export const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
};

// ─── Theme helpers ─────────────────────────────────────────────────────────────
export const fetchThemes = async (branchId) => {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await api.get(`/studio/themes${params}`);
    return res.data;
};

// ─── Queue helpers ─────────────────────────────────────────────────────────────
export const fetchQueue = async () => {
    const res = await api.get('/queue');
    return res.data; // returns { [themeName]: [queues...] }
};

export const callNext = async (themeId) => {
    const res = await api.post('/queue/call-next', { theme_id: themeId });
    return res.data;
};

export const callSpecific = async (queueId) => {
    const res = await api.post('/queue/call-specific', { queue_id: queueId });
    return res.data;
};

export const startSession = async (queueId, boothId) => {
    const res = await api.post('/queue/start', { queue_id: queueId, booth_id: boothId });
    return res.data;
};

export const finishSession = async (queueId, boothId) => {
    const res = await api.post('/queue/finish', { queue_id: queueId, booth_id: boothId });
    return res.data;
};

export const sendToPrint = async (queueId) => {
    const res = await api.post('/queue/send-to-print', { queue_id: queueId });
    return res.data;
};

export const skipQueue = async (queueId) => {
    const res = await api.post('/queue/skip', { queue_id: queueId });
    return res.data;
};

export const updateNotes = async (queueId, note) => {
    const res = await api.patch('/queue/note', { queue_id: queueId, note });
    return res.data;
};
