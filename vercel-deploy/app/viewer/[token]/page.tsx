'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function SecureViewerPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const token = params.token as string;

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

    // Phase 1: Verification State
    const [email, setEmail] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);
    const [autoVerifying, setAutoVerifying] = useState(false);
    const autoVerifyTriggered = useRef(false);

    // Auto-fill from email JWT magic link (?vt= parameter)
    useEffect(() => {
        const vt = searchParams.get('vt');
        if (!vt || autoVerifyTriggered.current) return;
        autoVerifyTriggered.current = true;

        const decodeAndAutoFill = async () => {
            setAutoVerifying(true);
            try {
                const res = await fetch(`${API_BASE}/vault/verify-email-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: vt }),
                });
                const data = await res.json();
                if (res.ok && data.valid) {
                    setEmail(data.email || '');
                    setAccessCode(data.access_code || '');
                    // Auto-submit verification after a brief delay for UX
                    setTimeout(async () => {
                        try {
                            const verifyRes = await fetch(`${API_BASE}/vault/verify/${token}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    email: data.email,
                                    access_code: data.access_code,
                                }),
                            });
                            const verifyData = await verifyRes.json();
                            if (verifyRes.ok) {
                                setVerified(true);
                                setViewToken(verifyData.view_token);
                                setFileInfo({
                                    filename: verifyData.filename,
                                    mimeType: verifyData.mime_type,
                                    fileSize: verifyData.file_size,
                                    watermarkText: verifyData.watermark_text,
                                    allowScreenshots: verifyData.allow_screenshots !== false,
                                });
                            } else {
                                setError(verifyData.detail || 'Auto-verification failed. Please enter credentials manually.');
                            }
                        } catch {
                            setError('Auto-verification failed. Please enter credentials manually.');
                        }
                        setAutoVerifying(false);
                    }, 500);
                } else {
                    setError('Email link expired or invalid. Please enter credentials manually.');
                    setAutoVerifying(false);
                }
            } catch {
                setError('Could not validate email link. Please enter credentials manually.');
                setAutoVerifying(false);
            }
        };

        decodeAndAutoFill();
    }, [searchParams, token, API_BASE]);

    // Phase 2: Viewer State
    const [viewToken, setViewToken] = useState<string | null>(null);
    const [fileInfo, setFileInfo] = useState<{ filename: string; mimeType: string; fileSize: number; watermarkText?: string, allowScreenshots?: boolean } | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string | null>(null);
    const [contentLoading, setContentLoading] = useState(false);
    const [contentError, setContentError] = useState<string | null>(null);
    const [isBlackout, setIsBlackout] = useState(false);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/vault/verify/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, access_code: accessCode })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Verification failed');
            }

            setVerified(true);
            setViewToken(data.view_token);
            setFileInfo({
                filename: data.filename,
                mimeType: data.mime_type,
                fileSize: data.file_size,
                watermarkText: data.watermark_text,
                // SCREENSHOT-TOGGLE
                allowScreenshots: data.allow_screenshots !== false // True by default
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (verified && viewToken) {
            const fetchContent = async () => {
                setContentLoading(true);
                setContentError(null);
                try {
                    const res = await fetch(`${API_BASE}/vault/stream/${token}?view_token=${viewToken}`);
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.detail || 'Failed to stream file');
                    }

                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const data = await res.json();
                        setFileContent(data.data);
                        setFileType(data.type);
                    } else {
                        // Backend fallback streaming for Videos/PPTs/Unsupported
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        setFileContent(url);

                        if (contentType && contentType.startsWith('video/')) {
                            setFileType('video');
                        } else if (contentType && (contentType.includes('powerpoint') || contentType.includes('presentationml'))) {
                            setFileType('ppt');
                        } else {
                            setFileType('download');
                        }
                    }
                } catch (err: any) {
                    setContentError(err.message);
                } finally {
                    setContentLoading(false);
                }
            };

            fetchContent();
        }
    }, [verified, viewToken, token, API_BASE]);

    // Security Measures
    useEffect(() => {
        if (!verified) return;

        // a) Right-click prevention
        const handleContextMenu = (e: Event) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);

        // b) Screenshot detection
        const reportScreenshot = () => {
            navigator.sendBeacon(`${API_BASE}/vault/screenshot/${token}`);
        };

        const handleKey = (e: KeyboardEvent) => {
            console.log(`[Screenshot Debug] handleKey fired: ${e.key}. allowScreenshots state:`, fileInfo?.allowScreenshots);
            if (fileInfo?.allowScreenshots) return; // FIX: Respect toggle
            // Check for PrintScreen (key 'PrintScreen') or OS specific shortcuts
            if (e.key === 'PrintScreen' ||
                (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) ||
                (e.ctrlKey && e.key === 'p')) { // Block Print attempt too
                setIsBlackout(true);
                reportScreenshot();
                setTimeout(() => setIsBlackout(false), 5000); // 5 seconds blackout
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            console.log(`[Screenshot Debug] handleKeyUp fired: ${e.key}. allowScreenshots state:`, fileInfo?.allowScreenshots);
            if (fileInfo?.allowScreenshots) return; // FIX: Respect toggle
            if (e.key === 'PrintScreen') {
                setIsBlackout(true);
                setTimeout(() => setIsBlackout(false), 3000);
            }
        };

        const handleVisibility = () => {
            console.log(`[Screenshot Debug] handleVisibility fired. allowScreenshots state:`, fileInfo?.allowScreenshots);
            if (fileInfo?.allowScreenshots) return; // FIX: Respect toggle
            if (document.hidden) {
                // Hide content when tab is backgrounded
                setIsBlackout(true);
                // We DON'T reportScreenshot() here because switching tabs is normal behavior
            } else {
                // Short delay before showing again to prevent quick-peak screenshots
                setTimeout(() => setIsBlackout(false), 1200);
            }
        };

        const handleBlur = () => {
            console.log(`[Screenshot Debug] handleBlur fired (window lost focus). allowScreenshots state:`, fileInfo?.allowScreenshots);
            if (fileInfo?.allowScreenshots) return; // FIX: Respect toggle
            // Trigger blackout when window loses focus (common when starting screenshot overlay)
            setIsBlackout(true);
            setTimeout(() => setIsBlackout(false), 2000);
        };

        // Aggressive Clipboard Clearing (optional but helps)
        const clearClipboard = async () => {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText("Protected Content - Screenshot Blocked");
                }
            } catch (e) { }
        };

        // SCREENSHOT-TOGGLE
        const handlePrintScreenToggle = async (e: KeyboardEvent) => {
            if (fileInfo?.allowScreenshots === false && e.key === 'PrintScreen') {
                await clearClipboard();
                alert("Screenshots are disabled for this shared document."); // warning toast/alert
            }
        };

        // Heartbeat for real-time revocation
        const heartbeat = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/vault/status/${token}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status !== 'active') {
                        setContentError(`Access condition changed: Link is now ${data.status}`);
                        setVerified(false);
                    }
                }
            } catch (e) {
                // Ignore network blips during heartbeat
            }
        }, 3000);

        window.addEventListener('blur', handleBlur);
        document.addEventListener('keydown', handleKey);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('visibilitychange', handleVisibility);
        // SCREENSHOT-TOGGLE
        document.addEventListener('keyup', handlePrintScreenToggle);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKey);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('keyup', handleKeyUp);
            // SCREENSHOT-TOGGLE
            document.removeEventListener('keyup', handlePrintScreenToggle);
            clearInterval(heartbeat);
        };
    }, [verified, token, API_BASE, fileInfo?.allowScreenshots]);

    if (!verified) {
        // Show auto-verifying state when processing email magic link
        if (autoVerifying) {
            return (
                <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                    <div className="w-full max-w-md mx-auto bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-6"></div>
                        <h1 className="text-xl font-bold text-white mb-2">Verifying Email Link...</h1>
                        <p className="text-gray-400 text-sm">Authenticating your one-click access token</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md mx-auto bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-white mb-2">Secure Document Access</h1>
                        <p className="text-gray-400 text-sm">Verify your identity to access this file</p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1.5" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                required
                                placeholder="recipient@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1.5" htmlFor="accessCode">Access Code</label>
                            <input
                                id="accessCode"
                                type="password"
                                value={accessCode}
                                onChange={e => setAccessCode(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                required
                                placeholder="••••••••"
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3 font-medium transition-colors disabled:opacity-50 mt-6"
                        >
                            {loading ? 'Verifying...' : 'Verify & Access'}
                        </button>

                        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-bold">Network Debugging</p>
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        const r = await fetch(`${API_BASE}/health`);
                                        if (r.ok) alert("✅ Connection Successful! The server is reachable.");
                                        else alert("⚠️ Server returned an error: " + r.status);
                                    } catch (e) {
                                        alert("❌ Connection Failed: Cannot reach " + API_BASE + ". Ensure your backend is running.");
                                    }
                                }}
                                className="text-[9px] uppercase tracking-widest text-blue-400/60 hover:text-blue-400 font-bold border border-blue-400/20 hover:border-blue-400/40 px-3 py-1.5 rounded-full transition-all"
                            >
                                Check Server Connectivity
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Watermark pattern generation (Tiled overlay)
    const renderWatermarks = () => {
        const marks = [];
        const text = fileInfo?.watermarkText || "CONFIDENTIAL";
        for (let i = 0; i < 60; i++) {
            for (let j = 0; j < 15; j++) {
                marks.push(
                    <div
                        key={`${i}-${j}`}
                        className="absolute text-white/10 text-xl font-black whitespace-nowrap select-none"
                        style={{
                            top: `${i * 120}px`,
                            left: `${j * 300 - 400}px`,
                            transform: 'rotate(-25deg)',
                            textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
                            letterSpacing: '0.1em',
                            pointerEvents: 'none'
                        }}
                    >
                        {text}
                    </div>
                );
            }
        }
        return marks;
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col relative overflow-hidden">
            {/* Top Banner */}
            <div className="fixed top-0 left-0 w-full bg-amber-600/90 text-white text-center py-2 text-sm z-40 shadow-md">
                🔒 Secure Viewing Mode — This document is protected. Unauthorized sharing is prohibited.
            </div>

            {/* Watermarks - fixed full screen pointer-events-none */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-[80]">
                {renderWatermarks()}
            </div>

            {/* SCREENSHOT BLACKOUT OVERLAY */}
            {isBlackout && (
                <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
                    <div className="text-6xl mb-6">🛡️</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Screen Capture Blocked</h2>
                    <p className="text-gray-400 max-w-md">
                        To protect sensitive information, viewing is disabled while screen capture tools are active.
                    </p>
                </div>
            )}

            {/* Main Content Area */}
            {/* SCREENSHOT-TOGGLE */}
            <div
                className={`flex-1 pt-16 flex items-center justify-center p-4 relative z-10 transition-all duration-500 ${isBlackout ? 'opacity-0 scale-95 blur-2xl' : 'opacity-100 scale-100 blur-0'} ${fileInfo?.allowScreenshots === false ? 'screenshot-protected' : ''}`}
                style={fileInfo?.allowScreenshots === false ? { userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'none' } : { userSelect: 'none', WebkitUserSelect: 'none' }}
            >
                {contentLoading ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-blue-400 font-medium">Decrypting secure content...</p>
                    </div>
                ) : contentError ? (
                    <div className="bg-gray-900 border border-white/10 p-8 rounded-xl max-w-lg w-full text-center">
                        <div className="text-4xl mb-4">🚫</div>
                        <h2 className="text-xl font-bold text-red-400 mb-2">Access Revoked</h2>
                        <p className="text-gray-300 mb-6">{contentError}</p>
                        <p className="text-sm text-gray-500 mb-6">Session expired. Please verify again.</p>
                        <button
                            onClick={() => { setVerified(false); setViewToken(null); }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            Verify Again
                        </button>
                    </div>
                ) : (
                    <div className="w-full max-w-5xl bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="bg-gray-800 border-b border-white/10 px-4 py-3 flex justify-between items-center text-sm shadow-sm z-20">
                            <span className="text-gray-300 font-medium truncate">{fileInfo?.filename}</span>
                            <span className="text-gray-500 whitespace-nowrap ml-4">
                                {((fileInfo?.fileSize || 0) / 1024).toFixed(1)} KB
                            </span>
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-gray-950/50">
                            {fileType === 'text' && (
                                <pre className="bg-gray-900 p-6 rounded-lg text-gray-200 font-mono text-sm overflow-auto max-h-[70vh] whitespace-pre-wrap break-words border border-white/5">
                                    {fileContent}
                                </pre>
                            )}
                            {fileType === 'image' && (
                                <img
                                    src={`data:${fileInfo?.mimeType};base64,${fileContent}`}
                                    className="max-w-full max-h-[70vh] mx-auto rounded-lg shadow-lg"
                                    alt="Secure Content"
                                />
                            )}
                            {fileType === 'pdf' && (
                                <iframe
                                    src={`data:application/pdf;base64,${fileContent}#toolbar=0&navpanes=0`}
                                    className="w-full h-[80vh] rounded-lg bg-white"
                                />
                            )}
                            {fileType === 'video' && (
                                <video
                                    src={fileContent || undefined}
                                    controls
                                    controlsList="nodownload"
                                    autoPlay
                                    className="w-full max-h-[80vh] rounded-lg bg-black"
                                >
                                    Your browser does not support secure video playback.
                                </video>
                            )}
                            {fileType === 'ppt' && (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                                    <div className="text-6xl mb-6">📊</div>
                                    <h2 className="text-2xl font-bold text-white mb-2">PowerPoint Presentation</h2>
                                    <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                                        Browsers cannot securely render .pptx natively inside the sandbox wrapper.
                                        <br /><br />
                                        <span className="text-yellow-500 font-bold text-xs uppercase tracking-wider">
                                            ⚠️ Warning: Downloading bypasses screenshot protections!
                                        </span>
                                    </p>
                                    <a
                                        href={fileContent || undefined}
                                        download={fileInfo?.filename}
                                        className="bg-[#d24726] hover:bg-[#b03b20] focus:ring-4 focus:ring-[#d24726]/50 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg shadow-[#d24726]/20"
                                    >
                                        Download Protected PPT
                                    </a>
                                </div>
                            )}
                            {fileType === 'download' && (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                                    <div className="text-6xl mb-6">📦</div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Unsupported Secure Format</h2>
                                    <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                                        This file type ({fileInfo?.mimeType || 'unknown'}) cannot be rendered securely inside the browser wrapper.
                                        <br /><br />
                                        <span className="text-yellow-500 font-bold text-xs uppercase tracking-wider">
                                            ⚠️ Warning: Downloading bypasses screenshot protections!
                                        </span>
                                    </p>
                                    <a
                                        href={fileContent || undefined}
                                        download={fileInfo?.filename}
                                        className="bg-blue-600 hover:bg-blue-500 focus:ring-4 focus:ring-blue-500/50 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        Download Secure File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
