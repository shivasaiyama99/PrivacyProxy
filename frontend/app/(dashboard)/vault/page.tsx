'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface PiiScan {
    scanned: boolean;
    entity_count: number;
}

interface FileObject {
    id: string;
    filename: string;
    size_bytes: number;
    uploaded_at: string;
    pii_scan?: PiiScan;
}

export default function VaultPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const [files, setFiles] = useState<FileObject[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Auth guard
    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, isLoading, router]);

    const fetchFiles = useCallback(async () => {
        try {
            const res = await api.get('/vault/files');
            setFiles(res.data);
        } catch (err) {
            console.error('Failed to fetch files:', err);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchFiles();
        }
    }, [user, fetchFiles]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            await uploadFile(e.target.files[0]);
            e.target.value = ''; // reset input
        }
    };

    const uploadFile = async (file: File) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Do NOT set Content-Type, let axios set it with the correct boundary
            await api.post('/vault/upload', formData);
            fetchFiles();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;
        try {
            await api.delete(`/vault/files/${id}`);
            fetchFiles();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete file');
        }
    };

    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const filesWithPii = files.filter(f => f.pii_scan?.scanned && (f.pii_scan?.entity_count ?? 0) > 0).length;
    const totalSizeBytes = files.reduce((acc, f) => acc + f.size_bytes, 0);
    const totalSizeFormatted = (totalSizeBytes / 1024 / 1024).toFixed(2) + ' MB';

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh]">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">🔒 File Vault</h1>
                <p className="text-gray-400">Upload and manage your files securely</p>
            </header>

            {/* Upload Zone */}
            <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer relative ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleChange}
                    disabled={uploading}
                />
                {uploading ? (
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white mb-4"></div>
                        <p className="text-white text-lg font-medium">Uploading...</p>
                    </div>
                ) : (
                    <div className="pointer-events-none">
                        <div className="text-5xl mb-4">📁</div>
                        <p className="text-white text-lg font-medium">
                            Drop files here or click to browse
                        </p>
                    </div>
                )}
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-6 bg-white/5 rounded-lg p-4 text-sm">
                <div className="text-gray-300">
                    <span className="font-semibold text-white">Total files:</span> {files.length}
                </div>
                <div className="text-gray-300">
                    <span className="font-semibold text-amber-400">With PII:</span> {filesWithPii}
                </div>
                <div className="text-gray-300">
                    <span className="font-semibold text-white">Total size:</span> {totalSizeFormatted}
                </div>
            </div>

            {/* File Grid */}
            {files.length === 0 && !uploading ? (
                <div className="text-center py-12">
                    <p className="text-gray-400">No files uploaded yet. Drag and drop files above to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map(file => (
                        <div key={file.id} className="bg-gray-900/80 border border-white/10 rounded-xl p-5 hover:border-blue-500/50 transition flex flex-col justify-between">
                            <div className="mb-4">
                                <h3 className="text-white font-medium truncate mb-1" title={file.filename}>
                                    {file.filename}
                                </h3>
                                <p className="text-gray-400 text-sm">{(file.size_bytes / 1024).toFixed(1)} KB</p>
                                <p className="text-gray-500 text-sm">
                                    {new Date(file.uploaded_at).toLocaleString()}
                                </p>
                                <div className="mt-3">
                                    {file.pii_scan?.scanned ? (
                                        file.pii_scan.entity_count > 0 ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                                ⚠️ {file.pii_scan.entity_count} PII entities
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                                ✅ Clean
                                            </span>
                                        )
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-500">
                                            — Not scanned
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <button
                                    onClick={() => router.push(`/vault/share?file_id=${file.id}`)}
                                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-sm font-medium py-2 rounded-lg transition-colors"
                                >
                                    Share
                                </button>
                                <button
                                    onClick={() => handleDelete(file.id)}
                                    className="bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm font-medium py-2 rounded-lg transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
