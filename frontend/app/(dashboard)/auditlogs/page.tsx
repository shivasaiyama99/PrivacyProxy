'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface AuditEvent {
    id?: string;
    timestamp: string;
    user_id?: string;
    event_type: string;
    ip_address?: string;
    user_agent?: string;
    metadata: Record<string, any>;
    action?: string;   // For legacy support from the first half
    severity?: string; // High/Medium/Low
    message?: string;
}

type FilterType = 'all' | 'pii' | 'vault' | 'security';

const PII_TYPES = ['redaction_event', 'audit_event', 'chat_proxy_event', 'chat_blocked_event'];
const VAULT_TYPES = ['file_upload', 'link_created', 'link_accessed', 'link_expired', 'link_burned'];
const SECURITY_TYPES = ['geo_blocked', 'device_mismatch', 'screenshot_attempt', 'access_denied', 'kill_switch', 'link_revoked'];

// Helper to calculate relative time
const timeAgo = (dateStr: string) => {
    if (!dateStr) return 'Unknown';

    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${Math.max(1, seconds)} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? 's' : ''} ago`;
};

// Helper to determine the event color
const getEventColor = (type: string) => {
    if (['file_upload', 'link_created', 'redaction_event'].includes(type)) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (['link_accessed', 'chat_proxy_event', 'audit_event'].includes(type)) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (['screenshot_attempt', 'access_denied', 'chat_blocked_event'].includes(type)) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (['geo_blocked', 'device_mismatch', 'link_revoked', 'kill_switch'].includes(type)) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

// Helper to determine the event emoji
const getEventEmoji = (type: string) => {
    const map: Record<string, string> = {
        redaction_event: '🔍',
        audit_event: '🤖',
        chat_proxy_event: '💬',
        file_upload: '📁',
        link_created: '🔗',
        link_accessed: '👁️',
        link_expired: '⏰',
        link_burned: '🔥',
        geo_blocked: '🌍',
        device_mismatch: '📱',
        screenshot_attempt: '📸',
        access_denied: '🚫',
        kill_switch: '🚨',
        link_revoked: '❌'
    };
    return map[type] || '📋';
};

export default function AuditLogsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, authLoading, router]);

    const fetchEvents = useCallback(async () => {
        try {
            // 1. Fetch from PrivacyProxy events
            const resOld = await api.get('/events?limit=200').catch(() => ({ data: { events: [] } }));

            // 2. Fetch from Vault Share events
            const resNew = await api.get('/vault/security-events').catch(() => ({ data: [] }));

            // Normalize old events to match new schema shape where necessary
            let legacyEvents = (resOld.data.events || []).map((e: any) => ({
                id: e.timestamp + Math.random().toString(), // fake ID for keying
                timestamp: e.timestamp,
                event_type: e.action || 'unknown',
                message: e.message,
                severity: e.severity,
                metadata: {
                    entities: e.entities,
                    processing_time_ms: e.processing_time_ms,
                    safety_score: e.safety_score,
                    usability_score: e.usability_score
                }
            }));

            const newEvents = Array.isArray(resNew.data) ? resNew.data : [];

            // Normalize _id to id if coming from Mongo directly
            const normalizedNewEvents = newEvents.map((e: any) => ({
                ...e,
                id: e._id || e.id || e.timestamp + Math.random().toString()
            }));

            // Merge and sort descending
            const merged = [...legacyEvents, ...normalizedNewEvents].sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            setEvents(merged);
        } catch (err) {
            console.error('Failed to fetch events:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleClearLogs = async () => {
        if (!window.confirm("Permanently clear ALL audit logs? This action cannot be undone.")) return;
        try {
            setLoading(true);
            await api.delete('/events');
            await api.delete('/vault/security-events'); // Clear both legacy and vault events
            setEvents([]);
            alert("Logs cleared successfully.");
        } catch (err) {
            console.error('Failed to clear logs:', err);
            alert("Failed to clear logs. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchEvents();
            // Auto-refresh every 30 seconds
            const interval = setInterval(fetchEvents, 30000);
            return () => clearInterval(interval);
        }
    }, [user, fetchEvents]);

    if (authLoading || (!user && loading)) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Derived calculations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const stats = {
        total: events.length,
        today: events.filter(e => new Date(e.timestamp) >= todayStart).length,
        securityAlerts: events.filter(e => SECURITY_TYPES.includes(e.event_type)).length
    };

    // Filter application
    const filteredEvents = events.filter(e => {
        if (filter === 'all') return true;
        if (filter === 'pii') return PII_TYPES.includes(e.event_type);
        if (filter === 'vault') return VAULT_TYPES.includes(e.event_type);
        if (filter === 'security') return SECURITY_TYPES.includes(e.event_type);
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">📋 Audit Logs</h1>
                    <p className="text-gray-400">Unified security event timeline</p>
                </div>
                {events.length > 0 && (
                    <button
                        onClick={handleClearLogs}
                        disabled={loading}
                        className="bg-white/5 border border-white/10 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/50 text-gray-400 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                    >
                        {loading ? 'Clearing...' : '🗑️ Clear All Logs'}
                    </button>
                )}
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-900/60 border border-white/10 rounded-xl p-5 shadow-lg">
                    <p className="text-gray-400 text-sm font-medium mb-1">Total Events</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-gray-900/60 border border-white/10 rounded-xl p-5 shadow-lg">
                    <p className="text-gray-400 text-sm font-medium mb-1">Today</p>
                    <p className="text-2xl font-bold text-blue-400">{stats.today}</p>
                </div>
                <div className={`bg-gray-900/60 border ${stats.securityAlerts > 0 ? 'border-red-500/50 bg-red-950/20' : 'border-white/10'} rounded-xl p-5 shadow-lg`}>
                    <p className="text-gray-400 text-sm font-medium mb-1">Security Alerts</p>
                    <p className={`text-2xl font-bold ${stats.securityAlerts > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                        {stats.securityAlerts}
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                {[
                    { id: 'all', label: 'All Events' },
                    { id: 'pii', label: 'PII Events' },
                    { id: 'vault', label: 'Vault Events' },
                    { id: 'security', label: 'Security Alerts' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as FilterType)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.id
                            ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Event Timeline */}
            {loading && events.length === 0 ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500"></div>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-16 bg-gray-900/50 border border-white/5 rounded-2xl">
                    <p className="text-gray-400">No events recorded yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredEvents.map(event => (
                        <div
                            key={event.id}
                            className="bg-gray-900/80 border border-white/10 rounded-lg p-4 transition-colors hover:bg-gray-800/80 cursor-pointer"
                            onClick={() => setExpandedId(expandedId === event.id ? null : (event.id || null))}
                        >
                            <div className="flex items-center justify-between gap-4">

                                {/* Left: Icon & Badge & Time */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="text-2xl flex-shrink-0 w-10 text-center select-none">
                                        {getEventEmoji(event.event_type)}
                                    </div>

                                    <div className="flex flex-col gap-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getEventColor(event.event_type)} capitalize`}>
                                                {event.event_type.replace(/_/g, ' ')}
                                            </span>
                                            {event.ip_address && (
                                                <span className="text-gray-500 text-xs font-mono hidden sm:inline-block">
                                                    IP: {event.ip_address}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-gray-300 text-sm truncate">
                                            {event.message || `Recorded newly audited action: ${event.event_type.replace(/_/g, ' ')}`}
                                        </p>
                                    </div>
                                </div>

                                {/* Right: Timestamp */}
                                <div className="text-right flex-shrink-0">
                                    <div className="text-gray-400 text-xs sm:text-sm font-medium">
                                        {timeAgo(event.timestamp)}
                                    </div>
                                    <div className="text-gray-600 text-xs mt-1 hidden sm:block">
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>

                            {/* Expandable JSON Metadata */}
                            {expandedId === event.id && (
                                <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Raw Event Data</p>
                                    <pre className="bg-gray-950 border border-white/5 rounded-lg p-4 text-xs text-gray-400 font-mono overflow-auto max-h-60 break-all whitespace-pre-wrap selection:bg-blue-500/30">
                                        {JSON.stringify(event.metadata, null, 2)}
                                    </pre>

                                    {event.user_agent && (
                                        <div className="mt-3 text-xs text-gray-500 truncate">
                                            <span className="font-semibold">User Agent:</span> {event.user_agent}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
