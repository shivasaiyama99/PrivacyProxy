# PrivacyProxy — AI-Powered Privacy Protection Platform

> **Real-time PII detection, autonomous security auditing, quantum-safe file sharing, and an MCP-powered AI assistant — all in one platform.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Backend Deep Dive](#backend-deep-dive)
   - [FastAPI Application](#fastapi-application)
   - [PII Redaction Engine](#pii-redaction-engine)
   - [CrewAI 3-Agent Security Audit](#crewai-3-agent-security-audit)
   - [MCP Server (Model Context Protocol)](#mcp-server-model-context-protocol)
   - [Gemini MCP Chat (OpenRouter)](#gemini-mcp-chat-openrouter)
   - [Vault & File Sharing](#vault--file-sharing)
   - [Quantum Key Distribution (BB84 Simulation)](#quantum-key-distribution-bb84-simulation)
   - [Geo-Fencing & Device Fingerprinting](#geo-fencing--device-fingerprinting)
   - [Email Service](#email-service)
   - [Authentication System](#authentication-system)
   - [Analytics & Audit Logging](#analytics--audit-logging)
7. [Frontend Deep Dive](#frontend-deep-dive)
   - [Pages & Routes](#pages--routes)
   - [Privacy Shield (Shield Chat)](#privacy-shield-shield-chat)
   - [Vault Dashboard](#vault-dashboard)
   - [War Room](#war-room)
   - [Governance Panel](#governance-panel)
   - [Authentication Pages](#authentication-pages)
   - [Contexts & State Management](#contexts--state-management)
   - [API Client Layer](#api-client-layer)
8. [Database Schema](#database-schema)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [MCP Tools Reference](#mcp-tools-reference)
11. [Environment Variables](#environment-variables)
12. [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Backend Setup](#backend-setup)
    - [Frontend Setup](#frontend-setup)
13. [Docker Deployment](#docker-deployment)
14. [Security Architecture](#security-architecture)
15. [LLM Architecture](#llm-architecture)
16. [Rate Limiting](#rate-limiting)
17. [Testing](#testing)

---

## Project Overview

**PrivacyProxy** is a full-stack AI-powered privacy protection platform designed to safeguard sensitive data at every stage — from user input to AI processing to file sharing. It acts as an intelligent proxy layer between users and AI systems, ensuring that no Personally Identifiable Information (PII) is ever exposed to external language models.

The platform combines:
- **Real-time PII detection and redaction** using Microsoft Presidio + spaCy NLP
- **Autonomous multi-agent security auditing** using CrewAI with 3 specialized AI agents
- **MCP (Model Context Protocol) server** exposing 6 tools over SSE transport
- **AI assistant powered by Gemini Flash 2.0** with automatic MCP tool calling
- **Quantum-safe file sharing** with BB84-inspired key distribution simulation
- **Zero-trust security** with geo-fencing, device fingerprinting, and auto-revocation

---

## Key Features

### PII Detection & Redaction
- 8 entity types: `PHONE_NUMBER`, `CREDIT_CARD`, `EMAIL_ADDRESS`, `PERSON`, `US_SSN`, `API_KEY`, `IP_ADDRESS`, `LOCATION`
- 3 redaction modes: **Strict** (placeholders), **Synthetic** (fake data via Faker), **Mask** (numbered labels)
- Custom Presidio recognizers for API keys (OpenAI `sk-*`, GitHub `ghp_*`, AWS `AKIA*`), SSNs, credit cards (Luhn-validated), and strict IPv4
- Post-processing to resolve phone vs IP conflicts and deduplicate overlapping spans

### Multi-Agent Security Auditing (CrewAI)
- **Hacker Agent** — White-hat security auditor that attempts to reverse-engineer redacted values
- **Judge Agent** — Usability analyst that evaluates if redacted text remains functional
- **Reporter Agent (CISO)** — Synthesizes findings into a final JSON score `{safety_score, usability_score, critique}`
- Sequential pipeline: Hacker → Judge → Reporter
- Powered by **Groq `llama-3.1-8b-instant`** (exclusively for audit, not used for chat)

### MCP Server (6 Tools over SSE)
- `scan_pii` — Scan text for PII using Presidio
- `get_vault_files` — Retrieve user's vault files
- `get_audit_logs` — Query audit log collection with filters
- `trigger_killswitch` — Emergency revocation of all active share links
- `get_dashboard_stats` — Aggregated platform statistics (redactions, active links, safety score)
- `get_pii_distribution` — Breakdown of PII entity types across all logs

### AI Chat Assistant (Gemini via OpenRouter)
- Model: `google/gemini-2.0-flash-lite-001` via OpenRouter API
- Automatic MCP tool calling loop (up to 5 rounds)
- System prompt forces proactive tool calling — never asks users for IDs
- Auto-injection of authenticated user's `user_id` / `owner_id` into every tool call
- Hard security gate: requests with `safety_score < 70` are blocked (HTTP 403)

### Vault & Secure File Sharing
- File upload with automatic PII scanning (text files)
- GridFS storage in MongoDB for files of any size
- Share links with configurable security: expiry (1–168 hours), max views, burn-after-reading
- Access codes protected with bcrypt hashing
- QKD-enhanced access tokens (BB84 simulation)
- Geo-fencing (country + city level) using MaxMind GeoLite2
- Device fingerprinting and device-lock enforcement
- Screenshot detection with auto-revoke after threshold
- Emergency kill-switch to revoke all active links instantly

### Authentication
- JWT-based authentication (HS256, configurable expiry)
- Email/password registration with bcrypt hashing
- Email verification via 6-digit codes + JWT magic links
- Password reset flow with time-limited tokens
- HTTP-only secure cookies for session management

### Analytics & Audit Trail
- Every operation logged to MongoDB `audit_logs` collection
- Rotating JSONL file audit trail (10MB per file, 5 backups)
- Real-time event feed with severity classification (high/medium/low/info)
- PII distribution radar chart data
- Hourly timeline aggregation for area charts
- Per-user scoped statistics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐│
│  │  Shield   │ │  Vault   │ │ War Room │ │Governance│ │ Auth  ││
│  │  Chat     │ │Dashboard │ │Analytics │ │  Panel   │ │ Pages ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘│
│       │             │            │             │           │     │
│  ┌────┴─────────────┴────────────┴─────────────┴───────────┴───┐│
│  │                    API Client Layer (lib/api.ts)             ││
│  │          apiFetch() with retry, token mgmt, session IDs     ││
│  └─────────────────────────┬───────────────────────────────────┘│
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTP (REST + SSE)
┌────────────────────────────┼────────────────────────────────────┐
│                    BACKEND (FastAPI)                             │
│  ┌─────────────────────────┴───────────────────────────────────┐│
│  │                     FastAPI Router                           ││
│  │  /sanitize  /audit  /chat  /stats  /events  /health         ││
│  │  /auth/*    /vault/*       /mcp/sse  /mcp/messages/         ││
│  └──┬──────────┬──────────┬──────────┬──────────┬──────────────┘│
│     │          │          │          │          │                │
│  ┌──┴──┐  ┌───┴───┐  ┌───┴───┐  ┌───┴───┐  ┌──┴───────┐       │
│  │Presi│  │CrewAI │  │Gemini │  │Vault  │  │MCP Server│       │
│  │dio  │  │3-Agent│  │MCP    │  │Share  │  │6 Tools   │       │
│  │NLP  │  │Audit  │  │Chat   │  │QKD    │  │SSE Trans │       │
│  └──┬──┘  └───┬───┘  └───┬───┘  └───┬───┘  └──┬───────┘       │
│     │         │          │          │          │                │
│     │     Groq API   OpenRouter    GridFS    MongoDB            │
│     │     (llama)    (Gemini)      (files)  (audit_logs,       │
│     │                                        share_links,      │
│     │                                        users,            │
│     │                                        shared_files)     │
│  spaCy en_core_web_lg                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web Framework | FastAPI 0.104+ | Async REST API server |
| ASGI Server | Uvicorn | Production ASGI server |
| NLP Engine | spaCy `en_core_web_lg` | Named entity recognition |
| PII Detection | Presidio Analyzer + Anonymizer 2.2+ | PII identification and redaction |
| Fake Data | Faker 20+ | Synthetic data generation for "synthetic" mode |
| Multi-Agent AI | CrewAI 0.1+ | 3-agent security audit pipeline |
| LLM (Audit) | Groq `llama-3.1-8b-instant` via LiteLLM | CrewAI agent reasoning |
| LLM (Chat) | Google Gemini 2.0 Flash Lite via OpenRouter | MCP tool-calling AI assistant |
| MCP Protocol | MCP SDK 1.2+ | Model Context Protocol server (SSE transport) |
| HTTP Client | httpx | Async OpenRouter API calls |
| Database | MongoDB (Motor async driver) | Document storage for all collections |
| File Storage | GridFS (Motor) | Large file storage within MongoDB |
| Auth | python-jose (JWT) + passlib (bcrypt) | Token-based authentication |
| Geo-IP | GeoLite2 City DB + geoip2 | IP geolocation for geo-fencing |
| Email | smtplib + MIME | SMTP email sending (Gmail) |
| Rate Limiting | SlowAPI | Per-endpoint rate limiting |
| QKD | Custom BB84 simulation | Quantum-safe access token generation |

### Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 16 | React server-side rendering |
| Language | TypeScript 5.7 | Type-safe frontend code |
| UI Library | Radix UI + Shadcn | Accessible component primitives |
| Styling | Tailwind CSS 3.4 | Utility-first CSS |
| Animations | Framer Motion 12 | UI animations and transitions |
| Charts | Recharts 2.15 | Data visualization |
| Icons | Lucide React | Icon library |
| Markdown | markdown-to-jsx | AI response rendering |
| Forms | React Hook Form + Zod | Form handling and validation |
| HTTP | Axios + native fetch | API communication |
| Toasts | Sonner | Notification system |

### Infrastructure
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | MongoDB 7+ | Primary data store |
| Containerization | Docker (multi-stage) | Deployment packaging |
| Python Runtime | Python 3.11 | Backend runtime |
| Node Runtime | Node.js 20 | Frontend runtime |

---

## Project Structure

```
├── backend-main/                  # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app, routes, startup, CORS, MCP mount
│   │   ├── database.py           # Motor async MongoDB client, collection refs, indexes
│   │   ├── dependencies.py       # get_current_user, get_admin_user (JWT auth deps)
│   │   ├── mcp_server.py         # MCP server: 6 tools, SSE transport, tool definitions
│   │   ├── crew/
│   │   │   ├── audit_crew.py     # CrewAI 3-agent audit: Hacker, Judge, Reporter
│   │   │   └── config/
│   │   │       ├── agents.yaml   # Agent role configurations
│   │   │       └── tasks.yaml    # Task descriptions and expected outputs
│   │   ├── models/
│   │   │   ├── schemas.py        # Pydantic models: SanitizeRequest, ChatResponse, etc.
│   │   │   ├── auth_schemas.py   # UserCreate, UserLogin, TokenResponse, etc.
│   │   │   └── vault_schemas.py  # FileMetadata, ShareLink, SecurityConfig, etc.
│   │   ├── routes/
│   │   │   ├── auth.py           # /auth/register, /auth/login, /auth/verify, password reset
│   │   │   ├── vault_files.py    # /vault/upload, /vault/files, /vault/files/:id (with PII scan)
│   │   │   ├── vault_share.py    # /vault/share, /vault/verify, /vault/view (QKD, geo, device)
│   │   │   ├── vault_security.py # /vault/screenshot, /vault/killswitch, /vault/risk, /vault/status
│   │   │   └── analytics.py      # /vault/analytics (file/link/security aggregations)
│   │   └── services/
│   │       ├── redaction_engine.py  # Presidio + spaCy PII engine (8 entity types, 3 modes)
│   │       ├── gemini_mcp.py        # OpenRouter → Gemini tool-calling loop with auto-injection
│   │       ├── auth_service.py      # JWT creation/decode, bcrypt password hashing
│   │       ├── email_service.py     # SMTP email: verification codes, share notifications
│   │       ├── audit_log_service.py # Sync MongoDB queries for stats/events/timeline
│   │       ├── geo_service.py       # GeoLite2 IP lookup, geo-fence validation, city aliases
│   │       ├── device_service.py    # SHA-256 device fingerprinting
│   │       ├── gridfs_service.py    # GridFS upload/download/delete helpers
│   │       └── qkd_service.py       # BB84 quantum key distribution simulation
│   ├── Dockerfile               # Python 3.10-slim, spaCy model download, non-root user
│   ├── requirements.txt         # All Python dependencies
│   ├── GeoLite2-City.mmdb       # MaxMind GeoIP database
│   ├── audit_log.jsonl          # Rotating audit log file
│   └── .env                     # Environment variables (API keys, MongoDB URL, etc.)
│
├── frontend/                     # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx           # Root layout: AuthProvider, DemoMode, Governance, Toaster
│   │   ├── page.tsx             # Landing page (HomePage component)
│   │   ├── globals.css          # Global Tailwind styles
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       # Dashboard shell layout with sidebar navigation
│   │   │   ├── shield/          # Privacy Shield page (ShieldChat component)
│   │   │   ├── vault/           # Vault dashboard (file management + sharing)
│   │   │   ├── warroom/         # War Room (real-time analytics + live event log)
│   │   │   ├── auditlogs/      # Audit logs viewer
│   │   │   └── governance/      # Governance configuration panel
│   │   ├── auth/                # Auth pages (login, register)
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   ├── forgot-password/     # Forgot password page
│   │   ├── reset-password/      # Password reset page
│   │   ├── viewer/[token]/      # Dynamic share link viewer
│   │   └── agents/              # AI agents page
│   ├── components/
│   │   ├── shield-chat.tsx      # Main PII shield UI: sanitize → audit → forward
│   │   ├── dashboard-shell.tsx  # Sidebar navigation shell
│   │   ├── aegis-shell.tsx      # Alternative dashboard layout
│   │   ├── home-page.tsx        # Landing page component
│   │   ├── war-room.tsx         # Real-time analytics dashboard
│   │   ├── governance.tsx       # Governance configuration UI
│   │   ├── demo-mode-toggle.tsx # Demo mode toggle switch
│   │   ├── step-indicator.tsx   # 3-step progress indicator
│   │   ├── theme-provider.tsx   # Dark/light theme provider
│   │   ├── enhanced-redaction-tooltip.tsx # PII tooltip component
│   │   ├── auth/                # Auth-specific components (login form, logout button)
│   │   └── ui/                  # Shadcn UI primitives (Button, Badge, Alert, Dialog, etc.)
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Authentication state (user, token, login/logout)
│   │   ├── DemoModeContext.tsx  # Demo mode toggle state
│   │   └── GovernanceContext.tsx # Governance settings (enabled entities, policies)
│   ├── hooks/
│   │   ├── use-mobile.tsx       # Mobile detection hook
│   │   ├── use-toast.ts         # Toast notification hook
│   │   └── useMockEventGenerator.ts # Mock event generator for demo mode
│   ├── lib/
│   │   ├── api.ts               # API client: apiFetch, sanitizeText, chatProxy, types
│   │   ├── auth.ts              # Auth utility helpers
│   │   ├── utils.ts             # cn() class merging utility
│   │   ├── validation.ts        # Form validation schemas
│   │   └── vault-api.ts         # Vault-specific API functions
│   ├── Dockerfile               # Multi-stage Node.js build (deps → build → runner)
│   ├── package.json             # Dependencies and scripts
│   ├── tailwind.config.ts       # Tailwind configuration
│   ├── tsconfig.json            # TypeScript configuration
│   └── next.config.mjs          # Next.js configuration
│
└── README.md                    # This file
```

---

## Backend Deep Dive

### FastAPI Application

**File:** `backend-main/app/main.py` (616 lines)

The main application entry point. Configures:

- **CORS** — Regex-based origin matching for `localhost` and `127.0.0.1` on any port
- **Rate Limiting** — SlowAPI with per-IP rate limits on each endpoint
- **Startup** — Loads the Presidio RedactionEngine, initializes MongoDB indexes, mounts MCP SSE transport
- **Routers** — Includes 5 sub-routers: `auth`, `vault_files`, `vault_share`, `vault_security`, `analytics`
- **MCP Mount** — Starlette routes at `/mcp/sse` and `/mcp/messages/` for SSE transport

**Core Endpoints defined in main.py:**

| Endpoint | Method | Rate Limit | Description |
|----------|--------|-----------|-------------|
| `/health` | GET | — | Health check (engine status, model, log size) |
| `/sanitize` | POST | 100/min | PII redaction (strict/synthetic/mask) |
| `/audit` | POST | 5/min | CrewAI 3-agent security audit |
| `/chat` | POST | 10/min | Full pipeline: sanitize → audit → AI chat (Gemini + MCP tools) |
| `/stats` | GET | 20/min | Dashboard statistics |
| `/events` | GET | 60/min | Recent audit events feed |
| `/events` | DELETE | — | Clear all audit logs for user |
| `/pii-distribution` | GET | 60/min | PII entity type breakdown |
| `/timeline` | GET | 60/min | Hourly event timeline |
| `/mcp/health` | GET | — | MCP server status and tool list |

**`/chat` Pipeline (5 Steps):**

1. **Sanitize** — Redact PII from user input using Presidio
2. **Audit** — Run CrewAI 3-agent audit on sanitized text (Groq LLM)
3. **Security Gate** — Block if `safety_score < 70` (with false-positive override logic)
4. **AI Chat** — Send cleaned text to Gemini Flash via OpenRouter with MCP tool-calling
5. **Response** — Return `{reply, sanitized_prompt, audit_report, tools_called}`

### PII Redaction Engine

**File:** `backend-main/app/services/redaction_engine.py` (384 lines)

Built on Microsoft Presidio with custom enhancements:

- **Custom Recognizers:**
  - `API_KEY` — Patterns for OpenAI `sk-*`, GitHub `ghp_*`/`gho_*`, AWS `AKIA*`
  - `IP_ADDRESS` — Strict IPv4 with per-octet 0-255 validation (prevents phone-number conflicts)
  - `US_SSN` — XXX-XX-XXXX and XXXXXXXXX (9 digits)
  - `CREDIT_CARD` — Multiple formats with Luhn checksum validation

- **Post-Processing:**
  - Phone vs IP conflict resolution (e.g., `555.123.4567` → PHONE_NUMBER, not IP_ADDRESS)
  - Overlapping span deduplication
  - Debug logging for entity analysis

- **Three Redaction Modes:**
  - **Strict** — Replaces PII with angle-bracket placeholders like `<EMAIL_ADDRESS>`
  - **Synthetic** — Replaces PII with realistic fake data generated by Faker
  - **Mask** — Replaces PII with numbered labels like `EMAIL_ADDRESS_1`

### CrewAI 3-Agent Security Audit

**File:** `backend-main/app/crew/audit_crew.py` (120 lines)

A sequential pipeline of 3 specialized AI agents powered by **Groq `llama-3.1-8b-instant`**:

| Agent | Role | Task |
|-------|------|------|
| **Hacker** | White-hat security auditor | Attempts to reverse-engineer redacted values from context clues |
| **Judge** | Usability analyst | Evaluates whether redacted text remains functional and readable |
| **Reporter** (CISO) | Final scorer | Synthesizes hacker + judge findings into `{safety_score, usability_score, critique}` |

**Key Design Decisions:**
- Hacker has hardcoded system instructions forbidding high-confidence guesses based solely on placeholder patterns
- Judge sees hacker's output as context
- Reporter sees both hacker and judge outputs
- Cache enabled, memory disabled, max RPM = 20
- Output validated against Pydantic `AuditResult` model
- Retry logic with exponential backoff (4s base) for Groq rate limits (up to 3 attempts)

### MCP Server (Model Context Protocol)

**File:** `backend-main/app/mcp_server.py` (470 lines)

Implements the MCP standard with 6 tools exposed over **SSE (Server-Sent Events) transport**:

| Tool | Parameters | Returns |
|------|-----------|---------|
| `scan_pii` | `text` (required), `mode` (optional) | `{clean_text, entities_found, entity_count, mode}` |
| `get_vault_files` | `owner_id` (required), `limit` (optional) | `{owner_id, file_count, files: [...]}` |
| `get_audit_logs` | `event_type`, `user_id`, `limit` (all optional) | `{count, entries: [...]}` |
| `trigger_killswitch` | `owner_id` (required) | `{owner_id, revoked_count, status}` |
| `get_dashboard_stats` | `user_id` (optional) | `{total_redactions, active_links, avg_safety_score}` |
| `get_pii_distribution` | `user_id` (optional) | `{total_entity_types, distribution: {...}}` |

**Implementation Details:**
- Each tool is an async function that queries MongoDB directly via Motor
- Tool results are returned as `TextContent` (JSON-serialized)
- The `execute_tool()` helper dispatches by name and returns plain dicts (used by the chat route)
- `get_openai_tool_definitions()` converts MCP tool definitions to OpenAI function-calling format
- Lazy reference to RedactionEngine (set by `main.py` at startup)

### Gemini MCP Chat (OpenRouter)

**File:** `backend-main/app/services/gemini_mcp.py` (234 lines)

Handles the AI chat with automatic MCP tool calling:

- **LLM:** `google/gemini-2.0-flash-lite-001` via OpenRouter API
- **Protocol:** OpenAI-compatible chat completions with `tools` and `tool_choice: auto`
- **Tool-Calling Loop:** Up to 5 rounds of tool calls before final text response
- **System Prompt:** Instructs Gemini to never ask for user IDs and always call tools proactively
- **Auto-Injection:** For every tool call, the authenticated user's ID is automatically injected:
  - `get_vault_files`, `trigger_killswitch` → `owner_id = current_user._id`
  - `get_audit_logs`, `get_pii_distribution`, `get_dashboard_stats` → `user_id = current_user._id`
- **Returns:** `{reply: str, tools_called: [{tool, args}, ...]}`

### Vault & File Sharing

**Files:**
- `backend-main/app/routes/vault_files.py` — File upload/listing/deletion with PII scanning
- `backend-main/app/routes/vault_share.py` — Share link creation, verification, file viewing
- `backend-main/app/routes/vault_security.py` — Screenshot reporting, kill-switch, risk scoring
- `backend-main/app/services/gridfs_service.py` — GridFS upload/download/delete

**Share Link Security Features:**

| Feature | Description |
|---------|-------------|
| **Expiry** | 1–168 hours configurable TTL |
| **Max Views** | Limit total number of views (0 = unlimited) |
| **Burn After Reading** | Auto-destroy after first view |
| **Access Code** | 4+ character code, bcrypt-hashed in DB |
| **Geo-Fencing** | Restrict access by country and/or city |
| **Device Lock** | Lock to first accessing device's fingerprint |
| **VPN Blocking** | Option to block VPN/proxy access |
| **Screenshot Detection** | Client reports screenshot attempts; auto-revoke after threshold |
| **Watermarking** | Custom watermark text on viewed files |
| **Kill-Switch** | Emergency revocation of all active links |
| **QKD Token** | BB84-inspired quantum-safe access token layer |

**Risk Scoring Factors:**
- Geo-policy violations (30 pts each, max 60)
- Device mismatches
- Screenshot attempts
- Access anomalies

### Quantum Key Distribution (BB84 Simulation)

**File:** `backend-main/app/services/qkd_service.py` (247 lines)

Software simulation of the BB84 quantum key distribution protocol:

1. **Alice's Side** — Generates random bits and bases (rectilinear `+` or diagonal `x`)
2. **Bob's Side** — Independently selects measurement bases
3. **Sifting** — Keep only bits where Alice and Bob chose the same basis (~50% match rate)
4. **Key Derivation** — HKDF-SHA256 on sifted key material
5. **Session Token** — One-time session key (replay-attack resistant)

**Security Properties:**
- Eavesdrop detection: match rate below 40% triggers alert
- One-time pad behavior: session invalidated after first use
- Minimum 64 sifted bits required

### Geo-Fencing & Device Fingerprinting

**File:** `backend-main/app/services/geo_service.py` (191 lines)

- **MaxMind GeoLite2 City** database for IP-to-location mapping
- Country + city level geo-fencing on share links
- Indian city alias support (Vizag→Visakhapatnam, Bangalore→Bengaluru, etc.)
- Development mode with mock Hyderabad IP for local testing
- Private/localhost IP detection

**File:** `backend-main/app/services/device_service.py` (22 lines)

- SHA-256 fingerprint from `user_agent + IP + salt`
- Used for device-lock enforcement on share links

### Email Service

**File:** `backend-main/app/services/email_service.py` (345 lines)

- SMTP integration (Gmail with App Passwords)
- Dark-themed branded HTML email templates
- 6-digit verification codes (cryptographically secure)
- JWT magic link tokens for one-click verification
- Share notification emails with embedded access codes
- MIMEMultipart with plain text + HTML fallback

### Authentication System

**Files:**
- `backend-main/app/routes/auth.py` (327 lines) — Auth endpoints
- `backend-main/app/services/auth_service.py` (57 lines) — JWT + bcrypt utilities
- `backend-main/app/dependencies.py` (34 lines) — FastAPI dependency injection

**Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Create account (email, password, full_name) |
| `/auth/login` | POST | Login with email/password, returns JWT |
| `/auth/me` | GET | Get current user profile |
| `/auth/verify-code` | POST | Verify 6-digit email code |
| `/auth/send-verification` | POST | Resend verification email |
| `/auth/forgot-password` | POST | Request password reset |
| `/auth/reset-password` | POST | Reset password with token |

**Security:**
- JWT tokens (HS256) with configurable expiry (default 24 hours)
- bcrypt password hashing
- HTTP-only secure cookies + Bearer token support
- Token type validation (`access` vs `view`)
- Auto-logout on 401 responses (frontend interceptor)

### Analytics & Audit Logging

**File:** `backend-main/app/services/audit_log_service.py` (233 lines)

Dual logging system:

1. **MongoDB** (`audit_logs` collection) — Primary audit store with structured events
2. **JSONL File** (`audit_log.jsonl`) — Rotating file log (10MB, 5 backups)

**Event Types:**
- `redaction_event` — PII redaction performed
- `audit_event` — CrewAI security audit completed
- `chat_proxy_event` — Full chat pipeline completed
- `chat_blocked_event` — Request blocked by security gate
- `file_upload` — File uploaded to vault
- `link_created` — Share link created
- `link_accessed` — Share link viewed
- `link_revoked` — Share link revoked
- `kill_switch` — Emergency revocation triggered
- `screenshot_attempt` — Screenshot detected
- `geo_blocked` — Access denied by geo-fence
- `device_mismatch` — Device fingerprint mismatch
- `user_register` — New user registered
- `user_login` — User logged in

**Severity Classification:**
- **High** — Blocked events, geo-blocks, device mismatches, screenshots, kill-switch
- **Medium** — Audit events (especially low safety scores)
- **Low** — Redaction events, file uploads, link creation
- **Info** — General events

---

## Frontend Deep Dive

### Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page with feature overview |
| `/login` | Login | Email/password authentication |
| `/register` | Register | New account creation |
| `/forgot-password` | Forgot Password | Password reset request |
| `/reset-password` | Reset Password | Password reset with token |
| `/shield` | Privacy Shield | Main PII detection and AI chat interface |
| `/vault` | Vault | File management dashboard |
| `/vault/links` | Share Links | Manage active share links |
| `/vault/share` | Share | Create new share links |
| `/warroom` | War Room | Real-time analytics and event monitoring |
| `/auditlogs` | Audit Logs | Full audit trail viewer |
| `/governance` | Governance | Entity and policy configuration |
| `/agents` | AI Agents | CrewAI agent status page |
| `/viewer/[token]` | Viewer | Public share link viewer (access code required) |

### Privacy Shield (Shield Chat)

**File:** `frontend/components/shield-chat.tsx` (950+ lines)

The flagship feature — a 3-step privacy pipeline UI:

1. **Sanitize** — Paste untrusted text, select redaction mode, click "SANITIZE & FORWARD"
2. **Verify** — View detected PII entities highlighted in the sanitized output, audit scores
3. **Forward** — See AI response with MCP tool badges, PII entity tags, and mode indicator

**UI Features:**
- Split-pane layout: untrusted input (left, red border) vs sanitized output (right, green border)
- `RedactedText` component with Framer Motion staggered animations per detected entity
- Test vector buttons for quick sample prompts
- Mode selector (strict/synthetic/mask)
- Multi-stage loading indicator: "Scanning for PII..." → "Running security audit..." → "AI querying MCP tools..."
- Color-coded MCP tool badges (rose for `scan_pii`, cyan for `get_dashboard_stats`, etc.)
- PII entity chips (orange badges)
- Redaction mode badge
- Audit result panel with safety/usability scores and critique
- Security gate block alert (red alert for blocked requests)
- Scan history panel with threat counts
- Agent status orbs (Sanitize, Verify, Forward)
- Demo mode with auto-fill and auto-trigger

### Vault Dashboard

**Route:** `/vault`, `/vault/links`, `/vault/share`

- File upload with drag-and-drop
- File listing with metadata (size, type, upload date, PII scan results)
- Share link creation with full security configuration
- Active links management with status indicators
- Risk score visualization per link

### War Room

**File:** `frontend/components/war-room.tsx`

Real-time analytics dashboard:
- Live event feed with severity indicators
- Statistical cards (total redactions, audits, safety score averages)
- PII distribution radar chart (Recharts)
- Hourly event timeline area chart
- Auto-refresh on configurable interval

### Governance Panel

**File:** `frontend/components/governance.tsx`

Configuration interface for:
- Enabling/disabling specific PII entity types for detection
- Setting default redaction mode
- Policy configuration

### Authentication Pages

- Login and register forms with React Hook Form + Zod validation
- Email verification flow
- Password reset flow
- Auto-redirect on auth state changes

### Contexts & State Management

| Context | File | Purpose |
|---------|------|---------|
| `AuthContext` | `contexts/AuthContext.tsx` | User session, login/logout, token management |
| `DemoModeContext` | `contexts/DemoModeContext.tsx` | Toggle demo mode (uses local PII patterns instead of backend) |
| `GovernanceContext` | `contexts/GovernanceContext.tsx` | Configurable entity types and detection policies |

### API Client Layer

**File:** `frontend/lib/api.ts` (361 lines)

Centralized API communication layer:

- `apiFetch<T>()` — Generic fetch wrapper with:
  - Automatic JWT Bearer token injection
  - Session ID management (UUID v4 per browser session)
  - Retry logic with exponential backoff
  - 429 (Rate Limit) and 503 (Service Unavailable) error handling
  - Network error normalization
- **Exported Functions:** `sanitizeText()`, `auditText()`, `chatProxy()`, `getStats()`, `getEvents()`, `getPiiDistribution()`, `getTimeline()`, `healthCheck()`
- **TypeScript Interfaces:** All backend schemas mirrored as TypeScript types
- Axios client for vault operations with interceptors (auto token injection, 401 handling)

---

## Database Schema

**Database:** `privacyvault_db` (MongoDB)

### Collections

#### `users`
```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "password_hash": "$2b$12$...",
  "full_name": "John Doe",
  "role": "user",
  "is_active": true,
  "email_verified": false,
  "created_at": ISODate,
  "last_login": ISODate,
  "verification_code": "123456",
  "verification_code_expires": ISODate,
  "settings": {
    "default_redaction_mode": "strict",
    "default_expiry_hours": 24,
    "notify_on_access": true
  }
}
```

#### `shared_files`
```json
{
  "_id": ObjectId,
  "owner_id": ObjectId,
  "filename": "report.pdf",
  "display_name": "report.pdf",
  "gridfs_id": ObjectId,
  "size_bytes": 1048576,
  "mime_type": "application/pdf",
  "file_hash": "sha256:...",
  "uploaded_at": ISODate,
  "is_deleted": false,
  "deleted_at": null,
  "pii_scan": {
    "scanned": true,
    "scan_at": "2024-01-01T00:00:00Z",
    "entities_found": ["EMAIL_ADDRESS", "PERSON"],
    "entity_count": 2,
    "was_redacted": false,
    "redaction_mode": null
  }
}
```

#### `share_links`
```json
{
  "_id": ObjectId,
  "token": "uuid-v4",
  "file_id": ObjectId,
  "created_by": ObjectId,
  "recipient_email": "recipient@example.com",
  "access_code_hash": "$2b$12$...",
  "access_code": "secret123",
  "status": "active",
  "created_at": ISODate,
  "last_accessed": ISODate,
  "revoked_at": null,
  "revoke_reason": null,
  "security": {
    "expiry": ISODate,
    "max_views": 5,
    "views_used": 0,
    "burn_after_reading": false,
    "allowed_countries": ["IN"],
    "allowed_cities": ["hyderabad"],
    "block_vpn": false,
    "require_device_lock": false,
    "locked_device_hash": null,
    "screenshot_attempts": 0,
    "qkd_data": { "session_id": "...", "metadata": {...} },
    "allow_screenshots": true,
    "watermark_text": "CONFIDENTIAL - recipient@example.com"
  }
}
```

#### `audit_logs`
```json
{
  "_id": ObjectId,
  "event_type": "redaction_event",
  "timestamp": ISODate,
  "user_id": "string",
  "share_link_id": "string",
  "file_id": "string",
  "request": {
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "country": "IN",
    "city": "Hyderabad",
    "device_hash": "sha256:..."
  },
  "metadata": {
    "entities_found": ["EMAIL_ADDRESS", "PHONE_NUMBER"],
    "redaction_mode": "synthetic",
    "safety_score": 95,
    "usability_score": 100,
    "processing_time_ms": 45.2,
    "token": "share-link-token",
    "views_used": 3,
    "block_reason": null,
    "screenshot_count": 0,
    "file_size_bytes": 1024
  }
}
```

#### `device_records`
```json
{
  "_id": ObjectId,
  "share_link_id": "string",
  "device_hash": "sha256:...",
  "user_agent": "Mozilla/5.0...",
  "ip": "192.168.1.1",
  "first_seen": ISODate
}
```

### Indexes

| Collection | Index | Type |
|-----------|-------|------|
| `users` | `email` | Unique |
| `share_links` | `token` | Unique |
| `share_links` | `created_by` | Regular |
| `share_links` | `status` | Regular |
| `audit_logs` | `timestamp` | Descending |
| `audit_logs` | `event_type` | Regular |
| `audit_logs` | `user_id` | Regular |
| `shared_files` | `owner_id` | Regular |
| `shared_files` | `uploaded_at` | Descending |
| `device_records` | `share_link_id` | Regular |

---

## API Endpoints Reference

### Core Pipeline

| Method | Endpoint | Auth | Rate | Description |
|--------|----------|------|------|-------------|
| GET | `/health` | No | — | Health check |
| POST | `/sanitize` | Yes | 100/min | Redact PII from text |
| POST | `/audit` | Yes | 5/min | Run CrewAI 3-agent audit |
| POST | `/chat` | Yes | 10/min | Full pipeline: sanitize → audit → Gemini AI + MCP tools |

### Analytics

| Method | Endpoint | Auth | Rate | Description |
|--------|----------|------|------|-------------|
| GET | `/stats` | Yes | 20/min | Dashboard statistics |
| GET | `/events` | Yes | 60/min | Recent audit events (limit param) |
| DELETE | `/events` | Yes | — | Clear all user's audit events |
| GET | `/pii-distribution` | Yes | 60/min | PII entity type breakdown |
| GET | `/timeline` | Yes | 60/min | Hourly event timeline (hours param) |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login with credentials |
| GET | `/auth/me` | Yes | Get current user profile |
| POST | `/auth/verify-code` | No | Verify email with 6-digit code |
| POST | `/auth/send-verification` | No | Resend verification email |
| POST | `/auth/forgot-password` | No | Request password reset |
| POST | `/auth/reset-password` | No | Reset password with token |

### Vault

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/vault/upload` | Yes | Upload file (max 50MB, auto PII scan) |
| GET | `/vault/files` | Yes | List user's files |
| DELETE | `/vault/files/{id}` | Yes | Soft-delete a file |
| POST | `/vault/share` | Yes | Create share link with security config |
| GET | `/vault/links` | Yes | List user's share links |
| POST | `/vault/verify/{token}` | No | Verify share link access (email + code) |
| GET | `/vault/view/{token}` | View Token | Stream file content |
| GET | `/vault/status/{token}` | No | Check link status |
| POST | `/vault/screenshot/{token}` | No | Report screenshot attempt |
| POST | `/vault/killswitch` | Yes | Revoke all active links |
| GET | `/vault/risk/{token}` | Yes | Get link risk score |
| GET | `/vault/analytics` | Yes | Vault analytics aggregation |

### MCP

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/mcp/health` | No | MCP server status |
| GET | `/mcp/sse` | No | SSE stream for MCP clients |
| POST | `/mcp/messages/` | No | MCP message endpoint |

---

## MCP Tools Reference

### scan_pii
Scan text for PII using Presidio engine.
```json
// Input
{ "text": "Email john@acme.com", "mode": "strict" }
// Output
{ "clean_text": "Email <EMAIL_ADDRESS>", "entities_found": ["EMAIL_ADDRESS"], "entity_count": 1, "mode": "strict" }
```

### get_vault_files
Retrieve user's vault files. `owner_id` is auto-injected.
```json
// Output
{ "owner_id": "...", "file_count": 3, "files": [{"file_id": "...", "filename": "report.pdf", ...}] }
```

### get_audit_logs
Query audit logs with optional filters. `user_id` is auto-injected.
```json
// Output
{ "count": 10, "entries": [{"event_type": "redaction_event", "timestamp": "...", "safety_score": 95, ...}] }
```

### trigger_killswitch
Emergency revoke all active share links. `owner_id` is auto-injected.
```json
// Output
{ "owner_id": "...", "revoked_count": 3, "status": "completed" }
```

### get_dashboard_stats
Platform statistics. `user_id` is auto-injected.
```json
// Output
{ "total_redactions": 42, "active_links": 2, "avg_safety_score": 91.4 }
```

### get_pii_distribution
Entity type breakdown. `user_id` is auto-injected.
```json
// Output
{ "total_entity_types": 5, "distribution": {"EMAIL_ADDRESS": 42, "PHONE_NUMBER": 17, "PERSON": 12} }
```

---

## Environment Variables

Create a `.env` file in `backend-main/`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | — | Groq API key for CrewAI audit (llama-3.1-8b-instant) |
| `OPENROUTER_API_KEY` | Yes | — | OpenRouter API key for Gemini chat |
| `MONGO_URL` | Yes | `mongodb://localhost:27017` | MongoDB connection string |
| `JWT_SECRET_KEY` | Yes | `fallback_dev_key` | Secret for JWT token signing |
| `JWT_EXPIRE_HOURS` | No | `24` | JWT token expiry in hours |
| `MAXMIND_DB_PATH` | No | `./GeoLite2-City.mmdb` | Path to MaxMind GeoIP database |
| `DEVICE_HASH_SALT` | No | `default_salt` | Salt for device fingerprinting |
| `SCREENSHOT_REVOKE_THRESHOLD` | No | `5` | Screenshots before auto-revoke |
| `MAX_UPLOAD_SIZE_MB` | No | `50` | Max file upload size in MB |
| `EMAIL_USER` | No | — | SMTP email address (Gmail) |
| `EMAIL_PASS` | No | — | SMTP app password |
| `APP_URL` | No | `http://localhost:3000` | Frontend URL (for share links) |
| `DEV_MODE` | No | `true` | Enable dev mode (mock IPs for geo) |
| `GEMINI_API_KEY` | No | — | Google Gemini API key (if using direct) |
| `OPENAI_API_KEY` | No | — | OpenAI API key (unused, placeholder) |

Create a `.env.local` in `frontend/` (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE` | `http://127.0.0.1:8000` | Backend API URL |

---

## Getting Started

### Prerequisites

- **Python 3.11+** (backend)
- **Node.js 20+** (frontend)
- **MongoDB 7+** (running locally or remote)
- **Groq API Key** — Free at [console.groq.com](https://console.groq.com)
- **OpenRouter API Key** — Get at [openrouter.ai](https://openrouter.ai)

### Backend Setup

```bash
# Navigate to backend
cd backend-main

# Create virtual environment
python -m venv venv311

# Activate (Windows)
.\venv311\Scripts\Activate.ps1
# Activate (Linux/Mac)
source venv311/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy English NLP model (required by Presidio)
python -m spacy download en_core_web_lg

# Create .env file with your API keys
# (See Environment Variables section above)

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The backend will:
1. Load the Presidio PII detection engine with spaCy NLP model
2. Initialize MongoDB indexes
3. Mount the MCP SSE transport at `/mcp/sse`
4. Print "PII Shield Ready!" when ready

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

The frontend will start at `http://localhost:3000`.

### Quick Verification

```bash
# Health check
curl http://localhost:8000/health

# MCP health
curl http://localhost:8000/mcp/health
```

---

## Docker Deployment

### Backend Dockerfile

Multi-stage build with:
- `python:3.10-slim` base image
- System deps for spaCy, Presidio, geoip2
- spaCy model downloaded at build time
- Non-root `appuser` for security
- Health check endpoint monitoring

```bash
cd backend-main
docker build -t privacyproxy-backend .
docker run -p 8000:8000 --env-file .env privacyproxy-backend
```

### Frontend Dockerfile

Multi-stage Node.js build:
1. **deps** — Install npm packages
2. **builder** — Build Next.js production bundle
3. **runner** — Minimal production image with standalone output

```bash
cd frontend
docker build -t privacyproxy-frontend --build-arg NEXT_PUBLIC_API_BASE=http://your-backend:8000 .
docker run -p 3000:3000 privacyproxy-frontend
```

### Docker Compose (Example)

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend-main
    ports:
      - "8000:8000"
    env_file: ./backend-main/.env
    depends_on:
      - mongodb

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_BASE: http://backend:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mongo_data:
```

---

## Security Architecture

### Defense-in-Depth Model

```
User Input
    │
    ▼
┌──────────────────┐
│ 1. PII Redaction  │  Presidio + spaCy NLP (8 entity types)
│    Engine         │  Custom recognizers (API keys, SSNs, credit cards)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. CrewAI Audit   │  Hacker → Judge → Reporter (3 AI agents)
│    Security Gate  │  Blocks if safety_score < 70
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. AI Processing  │  Only sanitized text reaches Gemini
│    (Gemini + MCP) │  System prompt prevents ID leaking
└────────┬─────────┘
         │
         ▼
    Safe Response
```

### Zero-Trust File Sharing

- **Authentication Required** — JWT tokens for all protected endpoints
- **Access Code** — bcrypt-hashed access code for each share link
- **QKD Layer** — BB84-simulated one-time session tokens
- **Geo-Fencing** — Country + city restrictions via MaxMind GeoLite2
- **Device Lock** — SHA-256 fingerprint binding after first access
- **View Limits** — Configurable max views with burn-after-reading
- **Time Expiry** — Auto-expire after configurable hours (1–168)
- **Screenshot Defense** — Detection + auto-revoke after threshold
- **Kill-Switch** — One-click emergency revocation of all links
- **Audit Trail** — Every access attempt logged to MongoDB

---

## LLM Architecture

PrivacyProxy uses a **split LLM architecture** to avoid single-provider rate limiting:

| Purpose | Provider | Model | Protocol |
|---------|----------|-------|----------|
| **Security Audit** (CrewAI) | Groq (free tier) | `llama-3.1-8b-instant` | LiteLLM |
| **AI Chat + MCP Tools** | OpenRouter | `google/gemini-2.0-flash-lite-001` | httpx (OpenAI-compatible) |

**Why Split?**
- Groq's free tier has strict RPM limits; using it for both audit and chat would cause cascading 429 errors
- OpenRouter provides generous free tier for Gemini Flash 2.0 Lite
- Each provider only handles its designated workload

**Tool-Calling Flow:**
1. User sends message → sanitized by Presidio → audited by CrewAI
2. If `safety_score >= 70`, sanitized text sent to Gemini via OpenRouter
3. Gemini decides which MCP tools to call (0–5 rounds)
4. Each tool call executes against MongoDB with auto-injected user context
5. Tool results fed back to Gemini for final natural language response

---

## Rate Limiting

Per-endpoint limits enforced by SlowAPI (per-IP):

| Endpoint | Limit |
|----------|-------|
| `/sanitize` | 100 requests/minute |
| `/audit` | 5 requests/minute |
| `/chat` | 10 requests/minute |
| `/stats` | 20 requests/minute |
| `/events` | 60 requests/minute |
| `/pii-distribution` | 60 requests/minute |
| `/timeline` | 60 requests/minute |

Additional LLM-level rate limit handling:
- Groq 429 → Exponential backoff (4s × 2^attempt, up to 3 retries)
- OpenRouter 429 → 3-second wait + HTTP 503 to client
- Frontend retry logic with exponential backoff on 429/503

---

## Testing

### Backend Verification Script

A comprehensive test suite exists at `backend-main/full_mcp_check.py` with 10 end-to-end tests:

1. Health check
2. MCP health check
3. PII sanitization (strict mode)
4. PII sanitization (synthetic mode)
5. Chat — "What are my dashboard stats?"
6. Chat — "Show me recent security events"
7. Chat — "What types of PII detected?"
8. Chat — "Show me vault files"
9. Chat — "Revoke all shared links"
10. Full pipeline with all features

```bash
cd backend-main
.\venv311\Scripts\python.exe full_mcp_check.py
```

### MongoDB Data Verification

```bash
cd backend-main
.\venv311\Scripts\python.exe -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client['privacyvault_db']
    links = await db['share_links'].count_documents({'status': 'active'})
    redactions = await db['audit_logs'].count_documents({'event_type': 'redaction_event'})
    logs = await db['audit_logs'].count_documents({})
    print(f'Active links: {links}')
    print(f'Redaction events: {redactions}')
    print(f'Total audit logs: {logs}')

asyncio.run(check())
"
```

### Frontend Build Verification

```bash
cd frontend
npm run build
```

All 17 pages should generate successfully with zero TypeScript errors.

---

## License

This project was developed for the SNIST Hackathon 2024. All rights reserved.

---

> **PrivacyProxy** — Because your data deserves a bodyguard. 🛡️
