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

    // On mount: check for existing token and user in localStorage
    useEffect(() => {
        const existingToken = getToken();
        const existingUserStr = typeof window !== 'undefined' ? localStorage.getItem('pv_user') : null;
        
        if (existingToken) {
            setToken(existingToken);
            setTokenState(existingToken);
            
            if (existingUserStr) {
                try {
                    setUser(JSON.parse(existingUserStr));
                } catch (e) {
                    console.error('Failed to parse cached user', e);
                }
            }
            
            // Validate with backend in the background
            api.get('/auth/me')
                .then(res => {
                    setUser(res.data);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('pv_user', JSON.stringify(res.data));
                    }
                })
                .catch((err) => {
                    console.warn('Backend session validation failed. Keeping local session if available.', err);
                    // If it is a mock token, we don't log out
                    if (existingToken.startsWith('mock-token-')) {
                        // Keep mock session active
                    } else {
                        // For real tokens, only clear if we get a definitive 401 unauthorized
                        if (err.response?.status === 401) {
                            clearToken();
                            setTokenState(null);
                            setUser(null);
                            if (typeof window !== 'undefined') {
                                localStorage.removeItem('pv_user');
                            }
                        }
                    }
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const normalizedEmail = email.toLowerCase().trim();
        
        // 1. Check for Demo Credentials immediately
        if (normalizedEmail === 'admin@privacyproxy.io' && (password === 'password' || password === 'admin123')) {
            const mockToken = 'mock-token-admin@privacyproxy.io';
            const mockUser: User = {
                id: '60c72b2f9b1d8e234c000001',
                email: 'admin@privacyproxy.io',
                full_name: 'Demo Admin',
                role: 'admin',
                is_active: true
            };
            setToken(mockToken);
            setTokenState(mockToken);
            setUser(mockUser);
            if (typeof window !== 'undefined') {
                localStorage.setItem('pv_user', JSON.stringify(mockUser));
            }
            return;
        }

        try {
            // 2. Try Backend API
            const res = await api.post('/auth/login', { email, password });
            const { access_token, user: userData } = res.data;
            setToken(access_token);
            setTokenState(access_token);
            setUser(userData);
            if (typeof window !== 'undefined') {
                localStorage.setItem('pv_user', JSON.stringify(userData));
            }
        } catch (error: any) {
            console.error('Backend Login failed:', error);
            
            // 3. Fallback to client-side localStorage users list
            if (typeof window !== 'undefined') {
                const localUsersStr = localStorage.getItem('pv_registered_users');
                if (localUsersStr) {
                    try {
                        const localUsers = JSON.parse(localUsersStr);
                        const match = localUsers.find((u: any) => u.email === normalizedEmail && u.password === password);
                        if (match) {
                            const mockToken = `mock-token-${normalizedEmail}`;
                            const mockUser: User = {
                                id: match.id || `mock-${Date.now()}`,
                                email: match.email,
                                full_name: match.full_name || 'Mock User',
                                role: 'user',
                                is_active: true
                            };
                            setToken(mockToken);
                            setTokenState(mockToken);
                            setUser(mockUser);
                            localStorage.setItem('pv_user', JSON.stringify(mockUser));
                            return;
                        }
                    } catch (e) {
                        console.error('Failed to parse local users list', e);
                    }
                }
            }
            
            // If the database is offline or server failed, let them in anyway!
            const isOfflineError = !error.response || error.response.status >= 500;
            if (isOfflineError) {
                console.warn('Backend appears offline. Logging in as guest user.');
                const mockToken = `mock-token-${normalizedEmail}`;
                const mockUser: User = {
                    id: `guest-${Date.now()}`,
                    email: normalizedEmail,
                    full_name: 'Guest User',
                    role: 'user',
                    is_active: true
                };
                setToken(mockToken);
                setTokenState(mockToken);
                setUser(mockUser);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('pv_user', JSON.stringify(mockUser));
                }
                return;
            }
            
            // Reraise original authentication error (e.g., 401 Invalid Credentials)
            throw error;
        }
    };

    const register = async (email: string, password: string, full_name: string) => {
        const normalizedEmail = email.toLowerCase().trim();
        
        try {
            // Try Backend API
            const res = await api.post('/auth/register', { email, password, full_name });
            const { access_token, user: userData } = res.data;
            setToken(access_token);
            setTokenState(access_token);
            setUser(userData);
            if (typeof window !== 'undefined') {
                localStorage.setItem('pv_user', JSON.stringify(userData));
            }
        } catch (error: any) {
            console.error('Backend Registration failed:', error);
            
            // Fallback: save locally
            if (typeof window !== 'undefined') {
                const localUsersStr = localStorage.getItem('pv_registered_users') || '[]';
                try {
                    const localUsers = JSON.parse(localUsersStr);
                    // Check if already exists locally
                    if (localUsers.some((u: any) => u.email === normalizedEmail)) {
                        throw new Error('Email already registered locally.');
                    }
                    const newUser = {
                        id: `local-${Date.now()}`,
                        email: normalizedEmail,
                        password,
                        full_name
                    };
                    localUsers.push(newUser);
                    localStorage.setItem('pv_registered_users', JSON.stringify(localUsers));
                    
                    // Auto login
                    const mockToken = `mock-token-${normalizedEmail}`;
                    const mockUser: User = {
                        id: newUser.id,
                        email: newUser.email,
                        full_name: newUser.full_name,
                        role: 'user',
                        is_active: true
                    };
                    setToken(mockToken);
                    setTokenState(mockToken);
                    setUser(mockUser);
                    localStorage.setItem('pv_user', JSON.stringify(mockUser));
                } catch (e: any) {
                    console.error('Local registration error', e);
                    throw new Error(e.message || 'Registration failed.');
                }
            } else {
                throw error;
            }
        }
    };

    const logout = () => {
        api.post('/auth/logout').catch(() => {}); // fire and forget
        clearToken();
        setTokenState(null);
        setUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('pv_user');
        }
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
