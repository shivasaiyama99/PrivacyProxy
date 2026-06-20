import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

// Interceptor to add auth header if token exists in localStorage (as fallback)
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    email_verified: boolean;
    created_at: string;
}

export const authApi = {
    me: async () => {
        const { data } = await api.get<User>("/auth/me");
        return data;
    },
    login: async (credentials: any) => {
        const { data } = await api.post("/auth/login", credentials);
        if (data.access_token) {
            localStorage.setItem("access_token", data.access_token);
        }
        return data;
    },
    register: async (userData: any) => {
        const { data } = await api.post("/auth/register", userData);
        if (data.access_token) {
            localStorage.setItem("access_token", data.access_token);
        }
        return data;
    },
    logout: async () => {
        await api.post("/auth/logout");
        localStorage.removeItem("access_token");
    },
    forgotPassword: async (email: string) => {
        return await api.post("/auth/forgot-password", { email });
    },
    resetPassword: async (token: string, newPassword: string) => {
        return await api.post("/auth/reset-password", { token, new_password: newPassword });
    },
};

export default api;
