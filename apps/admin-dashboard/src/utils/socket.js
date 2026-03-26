import { io } from 'socket.io-client';
import { API_URL } from './api';

const getAuthToken = () => {
    try {
        const storeStr = localStorage.getItem('jjikgo-admin-store');
        if (storeStr) {
            const { user } = JSON.parse(storeStr);
            return user?.token || null;
        }
    } catch (e) { }
    return null;
};

export const socket = io(API_URL, {
    transports: ['polling'],
    withCredentials: true,
    auth: {
        token: getAuthToken(),
    }
});
