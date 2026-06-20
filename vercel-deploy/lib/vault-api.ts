/**
 * VaultShare API Client
 *
 * Axios-based client with JWT token management for VaultShare endpoints.
 * Uses localStorage for token persistence and auto-attaches Authorization headers.
 */
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

let _token: string | null = null;

export function setToken(token: string) {
    _token = token;
    if (typeof window !== 'undefined') {
        localStorage.setItem('pv_token', token);
    }
}

export function clearToken() {
    _token = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('pv_token');
    }
}

export function getToken(): string | null {
    if (_token) return _token;
    if (typeof window !== 'undefined') {
        return localStorage.getItem('pv_token');
    }
    return null;
}

const api = axios.create({
    baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearToken();
        }
        return Promise.reject(error);
    }
);

export default api;
