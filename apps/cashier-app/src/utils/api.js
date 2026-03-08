import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const socket = io(API_URL);

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
export const createTransaction = async (data) => {
    const response = await api.post('/transactions', data);
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
