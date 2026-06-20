/**
 * Frontend API Service Layer
 * 
 * Isolated API client for backend integration.
 * All backend calls go through this service layer.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? "/api"
    : "http://127.0.0.1:8000");

// Type definitions matching backend schemas
export type SanitizeMode = "strict" | "synthetic" | "mask";

export interface SanitizeRequest {
  text: string;
  mode: SanitizeMode;
  entities?: string[];
}

export interface SanitizeResponse {
  clean_text: string;
  items: string[];
  processing_time_ms: number;
  synthetic_map?: Record<string, string>;
}

export interface AuditRequest {
  redacted_text: string;
}

export interface AuditResult {
  safety_score: number;
  usability_score: number;
  critique: string;
}

export interface ChatRequest {
  text: string;
  mode: SanitizeMode;
  entities?: string[];
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface ChatResponse {
  reply?: string;
  sanitized_prompt: string;
  synthetic_map?: Record<string, string>;
  audit_report?: AuditResult;
  tools_called?: ToolCall[];
  pii_entities?: string[];
  mode?: string;
}

export interface StatsResponse {
  total_redactions: number;
  total_audits: number;
  avg_safety_score: number;
  avg_usability_score: number;
  avg_processing_time_ms: number;
  entity_breakdown: Record<string, number>;
  unique_sessions?: number;

  // Enhanced (additive) fields (may be absent if backend is older)
  total_chat_proxy?: number;
  high_risk_count?: number;
  medium_risk_count?: number;
  low_risk_count?: number;
  info_count?: number;
}

export type AuditActionType = "redaction_event" | "audit_event" | "chat_proxy_event";
export type AuditSeverity = "high" | "medium" | "low" | "info";

export interface AuditEvent {
  timestamp: string;
  action: AuditActionType;
  severity: AuditSeverity;
  entities: string[];
  processing_time_ms?: number | null;
  safety_score?: number | null;
  usability_score?: number | null;
  message: string;
}

export interface EventsResponse {
  events: AuditEvent[];
}

export interface PiiDistributionResponse {
  totals: Record<string, number>;
}

export interface TimelineBucket {
  hour: string; // ISO hour - matches backend response
  count: number; // Total event count - matches backend response
}

export interface TimelineResponse {
  hours: number;
  buckets: TimelineBucket[];
}

// Session ID management
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      // Generate UUID v4
      sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      sessionStorage.setItem("session_id", sessionId);
    }
    return sessionId;
  } catch (error) {
    // Fallback if sessionStorage is unavailable
    return "";
  }
}

/** Turn fetch/network failures into a clear user-facing message */
function normalizeFetchError(error: unknown): Error {
  const msg = error instanceof Error ? error.message : "";
  const isNetworkError =
    error instanceof TypeError ||
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed");
  if (isNetworkError) {
    return new Error(
      `Cannot reach the API at ${API_BASE}. Ensure the backend is running (e.g. \`uvicorn app.main:app\`) and reachable.`
    );
  }
  if (error instanceof Error) return error;
  return new Error("API request failed");
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retry: { retries: number; baseDelayMs: number } = { retries: 0, baseDelayMs: 250 }
): Promise<T> {
  const sessionId = getSessionId();
  const url = `${API_BASE}${endpoint}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retry.retries; attempt++) {
    try {
      const token = getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Session-ID": sessionId,
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        // ✅ Handle 503 Service Unavailable gracefully
        if (response.status === 503) {
          try {
            const errorData = await response.json();
            const retryAfter = errorData.detail?.retry_after || errorData.retry_after || 60;
            throw new Error(`Service temporarily unavailable. Please try again in ${retryAfter} seconds.`);
          } catch (jsonError) {
            throw new Error("Service temporarily unavailable. Please try again in 60 seconds.");
          }
        }
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt >= retry.retries) break;
      const delay = retry.baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw normalizeFetchError(lastError);
}

/**
 * Sanitize text using backend redaction engine
 */
export async function sanitizeText(
  text: string,
  mode: SanitizeMode = "synthetic",
  entities?: string[]
): Promise<SanitizeResponse> {
  try {
    return await apiFetch<SanitizeResponse>("/sanitize", {
      method: "POST",
      body: JSON.stringify({ text, mode, entities } as SanitizeRequest),
    });
  } catch (error) {
    console.error("Sanitize API error:", error);
    throw error;
  }
}

/**
 * Audit redacted text for security and usability
 */
export async function auditText(
  redactedText: string
): Promise<AuditResult> {
  try {
    return await apiFetch<AuditResult>("/audit", {
      method: "POST",
      body: JSON.stringify({ redacted_text: redactedText } as AuditRequest),
    });
  } catch (error) {
    console.error("Audit API error:", error);
    throw error;
  }
}

/**
 * Chat proxy - sanitizes input and forwards to AI
 */
export async function chatProxy(
  text: string,
  mode: SanitizeMode = "synthetic",
  entities?: string[]
): Promise<ChatResponse> {
  try {
    return await apiFetch<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ text, mode, entities } as ChatRequest),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    throw error;
  }
}

/**
 * Get dashboard statistics
 */
export async function getStats(): Promise<StatsResponse> {
  try {
    return await apiFetch<StatsResponse>("/stats", {
      method: "GET",
    }, { retries: 1, baseDelayMs: 250 });
  } catch (error) {
    console.error("Stats API error:", error);
    throw error;
  }
}

/**
 * Recent events feed for analytics live log.
 */
export async function getEvents(limit: number = 200): Promise<EventsResponse> {
  const qs = new URLSearchParams({ limit: String(limit) });
  return apiFetch<EventsResponse>(`/events?${qs.toString()}`, { method: "GET" }, { retries: 1, baseDelayMs: 250 });
}

/**
 * PII distribution aggregation for radar chart.
 */
export async function getPiiDistribution(): Promise<PiiDistributionResponse> {
  return apiFetch<PiiDistributionResponse>("/pii-distribution", { method: "GET" }, { retries: 1, baseDelayMs: 250 });
}

/**
 * Timeline aggregation (hourly buckets) for area chart.
 */
export async function getTimeline(hours: number = 24): Promise<TimelineResponse> {
  const qs = new URLSearchParams({ hours: String(hours) });
  return apiFetch<TimelineResponse>(`/timeline?${qs.toString()}`, { method: "GET" }, { retries: 1, baseDelayMs: 250 });
}

/**
 * Health check endpoint
 */
export async function healthCheck(): Promise<{ status: string; model: string }> {
  try {
    return await apiFetch<{ status: string; model: string }>("/health", {
      method: "GET",
    });
  } catch (error) {
    console.error("Health check error:", error);
    throw error;
  }
}

// ──────────────────────────────────────────────
// VaultShare Axios Client & Token Management
// ──────────────────────────────────────────────
import axios from 'axios';

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
