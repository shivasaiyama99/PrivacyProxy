'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface ShareSecurity {
    expiry: string;
    max_views: number;
    views_used: number;
    burn_after_reading: boolean;
    allowed_countries: string[];
    block_vpn: boolean;
    require_device_lock: boolean;
    screenshot_attempts: number;
}

interface ShareLink {
    id: string;
    token: string;
    file_id: string;
    recipient_email: string;
    status: string;
    created_at: string;
    share_url: string;
    access_code?: string;
    security: ShareSecurity;
}

export default function ShareLinksPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [links, setLinks] = useState<ShareLink[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'revoked' | 'burned'>('all');
    const [loading, setLoading] = useState(true);

    const [showKillSwitch, setShowKillSwitch] = useState(false);
    const [killSwitchConfirm, setKillSwitchConfirm] = useState('');
    const [killSwitchLoading, setKillSwitchLoading] = useState(false);

    // Helper for robust date parsing (UTC fallback)
    const safeDate = (d: any) => {
        if (!d) return new Date();
        let s = String(d);
        if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T');
        if (!s.endsWith('Z') && !s.includes('+')) s += 'Z';
        const date = new Date(s);
        return isNaN(date.getTime()) ? new Date() : date;
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, authLoading, router]);

    const fetchLinks = useCallback(async (showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            const res = await api.get('/vault/links');
            setLinks(res.data.links);
        } catch (err) {
            console.error('Failed to fetch links:', err);
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchLinks(true);
            // Real-time monitoring: refresh counts/status every 5 seconds
            const interval = setInterval(() => fetchLinks(false), 5000);
            return () => clearInterval(interval);
        }
    }, [user, fetchLinks]);

    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url);
    };

    const handleRevoke = async (token: string) => {
        if (!window.confirm("Revoke this link immediately? This cannot be undone.")) return;
        try {
            await api.patch(`/vault/links/${token}/revoke`);
            fetchLinks();
        } catch (err) {
            console.error('Revoke failed:', err);
            alert('Failed to revoke link.');
        }
    };

    const handleDelete = async (token: string) => {
        if (!window.confirm("Permanently delete this link from your records? This will also revoke access if it's still active.")) return;
        try {
            await api.delete(`/vault/links/${token}`);
            fetchLinks();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete link.');
        }
    };

    const handleShareFull = (link: ShareLink) => {
        const message = `🔒 Secure File Shared With You\n\nLink: ${link.share_url}\nAccess Code: ${link.access_code || 'Stored separately'}\n\n(This code is required to decrypt the file. Do not share it.)`;
        navigator.clipboard.writeText(message);
        alert('Copied! Share both the Link and Access Code with your recipient.');
    };

    const handleKillSwitch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (killSwitchConfirm !== 'CONFIRM') return;

        setKillSwitchLoading(true);
        try {
            const res = await api.post('/vault/killswitch');
            alert(`Emergency: ${res.data.revoked_count} active links have been revoked.`);
            setShowKillSwitch(false);
            setKillSwitchConfirm('');
            fetchLinks();
        } catch (err) {
            console.error('Killswitch failed:', err);
            alert('Failed to activate kill switch.');
        } finally {
            setKillSwitchLoading(false);
        }
    };

    if (authLoading || (!user && loading)) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const filteredLinks = links.filter(link => {
        const isExpiredTime = safeDate(link.security.expiry) < new Date();
        const isMaxViews = link.security.max_views > 0 && link.security.views_used >= link.security.max_views;
        const isBurned = link.status === 'burned' || (link.security.burn_after_reading && link.security.views_used >= 1);

        if (filter === 'all') return true;
        if (filter === 'active') return link.status === 'active' && !isExpiredTime && !isMaxViews && !isBurned;
        if (filter === 'expired') return link.status === 'expired' || (link.status === 'active' && (isExpiredTime || (isMaxViews && !link.security.burn_after_reading)));
        if (filter === 'revoked') return link.status === 'revoked';
        if (filter === 'burned') return link.status === 'burned' || (link.status === 'active' && isBurned);
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-[80vh]">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">🔗 Share Links</h1>
                <p className="text-gray-400">Manage and monitor your secure share links</p>
            </header>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {['all', 'active', 'expired', 'revoked', 'burned'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filter === f
                            ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Links Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500"></div>
                </div>
            ) : filteredLinks.length === 0 ? (
                <div className="text-center py-16 bg-gray-900/50 border border-white/5 rounded-2xl">
                    <p className="text-gray-400">No share links found. Create one from the File Vault page.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLinks.map(link => {
                        const isExpiredTime = safeDate(link.security.expiry) < new Date();
                        const isMaxViews = link.security.max_views > 0 && link.security.views_used >= link.security.max_views;
                        const isBurned = link.status === 'burned' || (link.security.burn_after_reading && link.security.views_used >= 1);

                        const showExpired = link.status === 'expired' || (link.status === 'active' && isExpiredTime);
                        const showBurned = link.status === 'burned' || (link.status === 'active' && isBurned);
                        const showActive = link.status === 'active' && !isExpiredTime && !isMaxViews && !showBurned;
                        const showMaxed = link.status === 'active' && isMaxViews && !isBurned && !isExpiredTime;

                        return (
                            <div key={link.id} className="bg-gray-900/80 border border-white/10 rounded-xl p-5 hover:border-blue-500/50 transition flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded text-xs font-mono text-gray-300 flex items-center gap-2">
                                            <span className="truncate max-w-[100px]">{link.token.substring(0, 8)}...</span>
                                            <button
                                                onClick={() => handleCopy(link.share_url)}
                                                className="text-gray-500 hover:text-white"
                                                title="Copy Share URL"
                                            >
                                                📋
                                            </button>
                                        </div>

                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize
                      ${showActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}
                      ${showExpired ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : ''}
                      ${link.status === 'revoked' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}
                      ${showBurned ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : ''}
                      ${showMaxed ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : ''}
                    `}>
                                            {showExpired ? 'Expired' : showBurned ? 'Burned' : showMaxed ? 'Max Views' : link.status}
                                        </span>
                                    </div>

                                    <h3 className="text-white font-medium truncate mb-2" title={link.recipient_email}>
                                        {link.recipient_email}
                                    </h3>

                                    <div className="space-y-1.5 mb-4 text-sm">
                                        <div className="flex justify-between items-center text-gray-400">
                                            <span>Views (👁️)</span>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-sm font-bold ${isMaxViews ? 'text-red-400' : 'text-blue-400'}`}>
                                                    {link.security.views_used} / {link.security.max_views === 0 ? '∞' : link.security.max_views}
                                                </span>
                                                {isMaxViews && <span className="text-[10px] text-red-500/70 font-bold uppercase tracking-tighter">View Limit Hit</span>}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Expiry</span>
                                            <span className={showExpired ? "text-red-400" : "text-gray-300"}>
                                                {showExpired ? "Expired" : safeDate(link.security.expiry).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {link.security.allowed_countries.length > 0 && (
                                            <span className="text-xs bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded">🌍 Geo</span>
                                        )}
                                        {link.security.require_device_lock && (
                                            <span className="text-xs bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded">📱 Device Lock</span>
                                        )}
                                        {link.security.burn_after_reading && (
                                            <span className="text-xs bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded">🔥 Burn</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto pt-3 border-t border-white/10">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
                                            Created: {new Date(link.created_at).toLocaleDateString()}
                                        </span>
                                        {link.access_code && (
                                            <button
                                                onClick={() => handleShareFull(link)}
                                                className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-blue-500/30 flex items-center gap-1.5 transition-all"
                                            >
                                                <span>📲 Share Link & Code</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        {(link.status !== 'active' || isExpiredTime) && (
                                            <button
                                                onClick={() => handleDelete(link.token)}
                                                className="bg-white/5 text-gray-400 hover:bg-red-600/20 hover:text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border border-white/10"
                                            >
                                                Delete
                                            </button>
                                        )}
                                        {link.status === 'active' && !isExpiredTime && (
                                            <>
                                                <button
                                                    onClick={() => handleRevoke(link.token)}
                                                    className="bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                                                >
                                                    Revoke
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(link.token)}
                                                    className="bg-white/5 text-gray-400 hover:bg-white/10 rounded-lg p-1.5 text-xs transition-colors border border-white/10"
                                                    title="Delete Link"
                                                >
                                                    🗑️
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Kill Switch Section */}
            <div className="mt-12 pt-8 border-t border-white/10">
                <div className={`rounded-xl p-6 transition-colors border ${showKillSwitch ? 'border-red-500 bg-red-950/40' : 'border-red-500/30 bg-red-950/20'}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-red-400 mb-1 flex items-center gap-2">
                                <span>🚨</span> Emergency Kill Switch
                            </h2>
                            <p className="text-red-300/80 text-sm">
                                Immediately revoke ALL active share links. Use this only in case of a verified security breach.
                            </p>
                        </div>

                        {!showKillSwitch ? (
                            <button
                                onClick={() => setShowKillSwitch(true)}
                                className="bg-red-600 hover:bg-red-500 text-white font-medium py-3 px-6 rounded-lg transition-colors whitespace-nowrap shadow-lg shadow-red-900/50"
                            >
                                Activate Kill Switch
                            </button>
                        ) : (
                            <form onSubmit={handleKillSwitch} className="flex gap-2 w-full md:w-auto">
                                <input
                                    type="text"
                                    value={killSwitchConfirm}
                                    onChange={e => setKillSwitchConfirm(e.target.value)}
                                    placeholder="Type CONFIRM to proceed"
                                    className="bg-black/50 border border-red-500/50 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-red-400 w-full md:w-64"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={killSwitchConfirm !== 'CONFIRM' || killSwitchLoading}
                                    className="bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {killSwitchLoading ? 'Revoking...' : 'Confirm'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowKillSwitch(false); setKillSwitchConfirm(''); }}
                                    className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
