'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface FileObject {
    id: string;
    filename: string;
    size_bytes: number;
}

interface ShareLinkResponse {
    id: string;
    token: string;
    share_url: string;
    recipient_email: string;
    status: string;
}

function SharePageInner() {
    const { user, isLoading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [initialFileId, setInitialFileId] = useState<string | null>(searchParams.get('file_id'));
    const [availableFiles, setAvailableFiles] = useState<FileObject[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileObject | null>(null);

    // Form State
    const [selectedFileId, setSelectedFileId] = useState<string>(initialFileId || '');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [expiryHours, setExpiryHours] = useState<number>(24);
    const [maxViews, setMaxViews] = useState<number>(0);
    const [burnAfterReading, setBurnAfterReading] = useState(false);
    const [allowedCountries, setAllowedCountries] = useState('');
    const [allowedCities, setAllowedCities] = useState<string[]>([]);
    const [requireDeviceLock, setRequireDeviceLock] = useState(false);
    // SCREENSHOT-TOGGLE
    const [allowScreenshots, setAllowScreenshots] = useState(true);
    const [watermarkText, setWatermarkText] = useState('');

    const [loading, setLoading] = useState(false);
    const [createdLink, setCreatedLink] = useState<ShareLinkResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    const cities = ["Hyderabad", "Mumbai", "Vizag", "Delhi", "Chennai", "Bangalore"];

    // Fetch initial data
    useEffect(() => {
        if (authLoading || !user) return;

        if (initialFileId) {
            // Fetch specific file details
            api.get(`/vault/files/${initialFileId}`)
                .then(res => {
                    setSelectedFile(res.data);
                    setSelectedFileId(res.data.id);
                })
                .catch(err => {
                    console.error("Failed to fetch file details:", err);
                    setError("File not found or access denied.");
                });
        } else {
            // Fetch all files if no specific ID provided
            api.get('/vault/files')
                .then(res => setAvailableFiles(res.data))
                .catch(err => {
                    console.error("Failed to list files:", err);
                    setError("Failed to load your files.");
                });
        }
    }, [user, authLoading, initialFileId]);

    const generateAccessCode = () => {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let retVal = "";
        for (let i = 0; i < 8; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setAccessCode(retVal);
    };

    const toggleCity = (city: string) => {
        setAllowedCities(prev =>
            prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFileId) {
            setError("Please select a file to share.");
            return;
        }
        setError(null);
        setLoading(true);

        const parsedCountries = allowedCountries
            ? allowedCountries.split(',').map(c => c.trim().toUpperCase()).filter(c => c.length > 0)
            : [];

        try {
            const res = await api.post('/vault/share', {
                file_id: selectedFileId,
                recipient_email: recipientEmail,
                access_code: accessCode,
                security: {
                    expiry_hours: expiryHours,
                    max_views: maxViews,
                    burn_after_reading: burnAfterReading,
                    allowed_countries: parsedCountries,
                    allowed_cities: allowedCities,
                    require_device_lock: requireDeviceLock,
                    // SCREENSHOT-TOGGLE
                    allow_screenshots: allowScreenshots,
                    watermark_text: watermarkText || undefined
                }
            });
            setCreatedLink(res.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create share link.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (createdLink) {
            navigator.clipboard.writeText(createdLink.share_url);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        }
    };

    const handleCopyCode = () => {
        if (accessCode) {
            navigator.clipboard.writeText(accessCode);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    const currentFile = selectedFile || availableFiles.find(f => f.id === selectedFileId);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">🔗 Create Secure Share Link</h1>
                <p className="text-gray-400">Generate a zero-trust, securely authenticated link for your file.</p>
            </header>

            {createdLink ? (
                <div className="bg-gray-900/80 backdrop-blur-xl border border-green-500/50 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="text-5xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-green-400 mb-2">Secure Link Created!</h2>
                    <p className="text-gray-300 mb-6 font-medium bg-black/30 p-4 rounded-lg border border-white/5 break-all">
                        {createdLink.share_url}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                        <button
                            onClick={handleCopyLink}
                            className={`px-8 py-3 rounded-xl font-semibold transition-all w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg ${copiedLink ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25'
                                }`}
                        >
                            {copiedLink ? 'Link Copied!' : 'Copy Secure Link'}
                        </button>
                    </div>

                    {/* Access Code Section */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 max-w-lg mx-auto text-left relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3">
                            <button
                                onClick={handleCopyCode}
                                className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded transition-colors ${copiedCode ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                    }`}
                            >
                                {copiedCode ? 'Copied' : 'Copy Code'}
                            </button>
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-4">Decryption Access Code</p>
                        <div className="text-3xl font-mono font-bold tracking-[0.3em] text-white text-center py-2">
                            {accessCode}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-4 text-center">Share this code separately. It is required for the recipient to decrypt and view the file.</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 text-left text-sm text-gray-400 max-w-lg mx-auto mb-6">
                        <p><strong className="text-white">Recipient:</strong> {createdLink.recipient_email}</p>
                        <p><strong className="text-white">Expiry:</strong> {expiryHours} hours</p>
                        <p><strong className="text-white">Max Views:</strong> {maxViews === 0 ? 'Unlimited' : maxViews}</p>
                    </div>

                    <button
                        onClick={() => {
                            setCreatedLink(null);
                            setAccessCode('');
                            setRecipientEmail('');
                        }}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                        Create Another Link
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 flex flex-col">

                    {/* File Selection */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-300 mb-2" htmlFor="fileSelect">Target File</label>
                        {!initialFileId ? (
                            <select
                                id="fileSelect"
                                value={selectedFileId}
                                onChange={(e) => setSelectedFileId(e.target.value)}
                                className="bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                required
                            >
                                <option value="" disabled>Select a file to share...</option>
                                {availableFiles.map(f => (
                                    <option key={f.id} value={f.id}>{f.filename} ({(f.size_bytes / 1024).toFixed(1)} KB)</option>
                                ))}
                            </select>
                        ) : (
                            <div className="text-white font-medium bg-gray-800 border border-white/10 rounded-lg px-4 py-3">
                                {currentFile ? currentFile.filename : 'Loading file data...'}
                            </div>
                        )}
                    </div>

                    <hr className="border-white/10" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Recipient & Access */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white mb-2">Recipient & Access</h3>

                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5" htmlFor="email">Recipient Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    required
                                    placeholder="recipient@example.com"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm text-gray-300" htmlFor="accessCode">Access Code</label>
                                    <button
                                        type="button"
                                        onClick={generateAccessCode}
                                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                                    >
                                        Auto-Generate
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        id="accessCode"
                                        type="text"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        required
                                        minLength={4}
                                        placeholder="Min 4 characters"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                                        <div className={`h-2 w-2 rounded-full ${accessCode.length >= 8 ? 'bg-green-500' : accessCode.length >= 4 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Share this code separately with the recipient for decryption.</p>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">Expiry Duration</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className={`cursor-pointer border rounded-lg py-2 text-center text-sm font-medium transition-colors ${expiryHours === 1 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                        <input type="radio" className="hidden" name="expiry" checked={expiryHours === 1} onChange={() => setExpiryHours(1)} />
                                        1 Hour
                                    </label>
                                    <label className={`cursor-pointer border rounded-lg py-2 text-center text-sm font-medium transition-colors ${expiryHours === 24 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                        <input type="radio" className="hidden" name="expiry" checked={expiryHours === 24} onChange={() => setExpiryHours(24)} />
                                        24 Hours
                                    </label>
                                    <label className={`cursor-pointer border rounded-lg py-2 text-center text-sm font-medium transition-colors ${expiryHours === 168 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                        <input type="radio" className="hidden" name="expiry" checked={expiryHours === 168} onChange={() => setExpiryHours(168)} />
                                        7 Days
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Security */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white mb-2">Advanced Security</h3>

                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5" htmlFor="maxViews">Max Views</label>
                                <input
                                    id="maxViews"
                                    type="number"
                                    min="0"
                                    value={maxViews === 0 ? '' : maxViews}
                                    onChange={(e) => setMaxViews(parseInt(e.target.value) || 0)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="0 = unlimited"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    id="burnAfterReading"
                                    type="checkbox"
                                    checked={burnAfterReading}
                                    onChange={(e) => setBurnAfterReading(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-600 text-blue-600 bg-gray-700"
                                />
                                <label htmlFor="burnAfterReading" className="text-sm text-gray-300">
                                    Auto-destroy after all views used
                                </label>
                            </div>

                            {/* SCREENSHOT-TOGGLE */}
                            <div className="flex items-center gap-3">
                                <input
                                    id="allowScreenshots"
                                    type="checkbox"
                                    checked={allowScreenshots}
                                    onChange={(e) => setAllowScreenshots(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-600 text-blue-600 bg-gray-700"
                                />
                                <div className="flex flex-col">
                                    <label htmlFor="allowScreenshots" className="text-sm text-gray-300">
                                        Allow Screenshots
                                    </label>
                                    <span className="text-xs text-gray-500">
                                        When OFF, activates screenshot detection and blocks screen capture attempts
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-white">Location Restrictions</label>
                                    <button
                                        type="button"
                                        onClick={() => setAllowedCities(cities)}
                                        className="text-[10px] uppercase tracking-wider font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/20 transition-all border border-blue-500/20"
                                    >
                                        Select All Major Cities
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-black/20 border border-white/5 rounded-lg p-2 max-h-48 overflow-y-auto scrollbar-cyber grid grid-cols-2 gap-2">
                                        {cities.map(city => (
                                            <div
                                                key={city}
                                                onClick={() => toggleCity(city)}
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${allowedCities.includes(city) ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'bg-white/5 border-transparent text-gray-500 hover:border-white/10'}`}
                                            >
                                                <span className="text-xs font-medium">{city}</span>
                                                <div className={`h-1.5 w-1.5 rounded-full transition-all ${allowedCities.includes(city) ? 'bg-blue-400 shadow-[0_0_5px_#60a5fa]' : 'bg-gray-700'}`} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] uppercase font-bold pointer-events-none">ISO:</div>
                                        <input
                                            id="allowedCountries"
                                            type="text"
                                            value={allowedCountries}
                                            onChange={(e) => setAllowedCountries(e.target.value)}
                                            className="bg-black/20 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-white w-full focus:outline-none focus:ring-1 focus:ring-blue-500/30 uppercase text-[10px] font-mono tracking-widest"
                                            placeholder="IN, US, GB"
                                        />
                                    </div>
                                </div>

                                {(allowedCities.length === 0 && !allowedCountries) ? (
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        <span className="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold">Global Access Enabled</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                        <span className="text-[10px] uppercase tracking-widest text-green-500/80 font-bold">Access Restricted</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    id="requireDeviceLock"
                                    type="checkbox"
                                    checked={requireDeviceLock}
                                    onChange={(e) => setRequireDeviceLock(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-600 text-blue-600 bg-gray-700"
                                />
                                <label htmlFor="requireDeviceLock" className="text-sm text-gray-300">
                                    Lock to first device that accesses this link
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5" htmlFor="watermarkText">Custom Watermark Text</label>
                                <input
                                    id="watermarkText"
                                    type="text"
                                    value={watermarkText}
                                    onChange={(e) => setWatermarkText(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="Custom watermark (default: CONFIDENTIAL)"
                                />
                            </div>
                        </div>
                    </div>

                    {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-sm">{error}</div>}

                    <div className="pt-4 border-t border-white/10">
                        <button
                            type="submit"
                            disabled={loading || !selectedFileId}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                        >
                            {loading ? 'Creating...' : 'Create Secure Link'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default function SharePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        }>
            <SharePageInner />
        </Suspense>
    );
}
