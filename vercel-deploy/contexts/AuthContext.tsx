'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { setToken, clearToken, getToken } from '@/lib/api';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, full_name: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setTokenState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount: check for existing token
    useEffect(() => {
        const existing = getToken();
        if (existing) {
            setToken(existing); // ensure it's in memory
            api.get('/auth/me')
                .then(res => {
                    setUser(res.data);
                    setTokenState(existing);
                })
                .catch(() => {
                    clearToken();
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { access_token, user: userData } = res.data;
        setToken(access_token);
        setTokenState(access_token);
        setUser(userData);
    };

    const register = async (email: string, password: string, full_name: string) => {
        const res = await api.post('/auth/register', { email, password, full_name });
        const { access_token, user: userData } = res.data;
        setToken(access_token);
        setTokenState(access_token);
        setUser(userData);
    };

    const logout = () => {
        clearToken();
        setTokenState(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
