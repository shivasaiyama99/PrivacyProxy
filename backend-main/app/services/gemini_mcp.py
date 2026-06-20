"""
OpenRouter → Gemini Flash 2.0 Lite handler for MCP tool-calling loop.

Uses httpx async client to call OpenRouter's chat completions API with
tool definitions that map to our MCP server tools.

Groq/LiteLLM is NOT used here — reserved exclusively for CrewAI audit.
"""

import os
import json
import asyncio
import httpx
from fastapi import HTTPException
from app.mcp_server import execute_tool

# ── Constants ─────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"
MAX_TOOL_ROUNDS = 5


# ── Tool definitions (OpenAI function-calling format) ─────────────────────

def get_openrouter_tools():
    """Return the 6 MCP tool definitions in OpenAI function-calling format."""
    return [
        {
            "type": "function",
            "function": {
                "name": "scan_pii",
                "description": (
                    "Scan a block of text for PII using the Presidio redaction engine. "
                    "Returns cleaned text and detected entity types."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "The raw text to scan for PII."},
                        "mode": {
                            "type": "string",
                            "enum": ["strict", "synthetic", "mask"],
                            "description": "Redaction mode (default: strict).",
                        },
                    },
                    "required": ["text"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_vault_files",
                "description": (
                    "Retrieve the most recent files stored in the PrivacyProxy vault "
                    "for a given owner. Returns file metadata."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "owner_id": {"type": "string", "description": "The owner ID whose vault files to retrieve."},
                        "limit": {"type": "integer", "description": "Max files to return (default 20)."},
                    },
                    "required": ["owner_id"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_audit_logs",
                "description": (
                    "Query the audit log collection. Optionally filter by event_type or user_id."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_type": {"type": "string", "description": "Optional event type filter."},
                        "user_id": {"type": "string", "description": "Optional user ID to scope logs."},
                        "limit": {"type": "integer", "description": "Max entries to return (default 50)."},
                    },
                    "required": [],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "trigger_killswitch",
                "description": (
                    "Emergency kill-switch: revoke ALL active share links for an owner."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "owner_id": {"type": "string", "description": "The owner whose links to revoke."},
                    },
                    "required": ["owner_id"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_dashboard_stats",
                "description": (
                    "Aggregate high-level dashboard statistics: total redactions, "
                    "active share links, and average safety score."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "Optional user ID to scope stats."},
                    },
                    "required": [],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_pii_distribution",
                "description": (
                    "Return a breakdown of PII entity types detected across all audit logs."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "Optional user ID to scope the distribution."},
                    },
                    "required": [],
                },
            },
        },
    ]


# ── Main entry-point ──────────────────────────────────────────────────────

async def chat_with_gemini_mcp(
    clean_text: str,
    current_user: dict,
) -> dict:
    """
    Send *clean_text* to Gemini via OpenRouter with MCP tools enabled.

    Returns {"reply": str, "tools_called": list[{tool, args}]}
    """
    try:
        api_key = os.getenv("GROQ_API_KEY") or GROQ_API_KEY
        if not api_key:
            raise HTTPException(503, detail="GROQ_API_KEY not configured")

        system_msg = {
            "role": "system",
            "content": (
                "You are a privacy platform assistant. "
                "You have access to tools to query the user's data. "
                "IMPORTANT: Never ask the user for their ID, owner_id, or user_id. "
                "These are automatically provided by the system for every tool call. "
                "When a user asks about their files, vault, security events, statistics, "
                "or PII data — immediately call the appropriate tool without asking for any IDs. "
                "Always call tools proactively when the user's intent is clear."
            ),
        }
        messages = [system_msg, {"role": "user", "content": clean_text}]
        tools_called = []
        final_reply = "(no response)"

        async with httpx.AsyncClient(timeout=60) as client:
            for _round in range(MAX_TOOL_ROUNDS):
                response = await client.post(
                    GROQ_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": MODEL,
                        "messages": messages,
                        "tools": get_openrouter_tools(),
                        "tool_choice": "auto",
                    },
                )

                if response.status_code == 429:
                    await asyncio.sleep(3)
                    raise HTTPException(503, detail="AI rate limited, retry in 3 seconds")

                if response.status_code != 200:
                    raise HTTPException(503, detail=f"Groq assistant error: {response.status_code} - {response.text}")

                data = response.json()
                message = data["choices"][0]["message"]

                # No tool calls → final text reply
                if not message.get("tool_calls"):
                    final_reply = message.get("content", "")
                    break

                # Tool calls requested — process them
                messages.append(message)

                for tc in message["tool_calls"]:
                    name = tc["function"]["name"]
                    args = json.loads(tc["function"]["arguments"]) if isinstance(tc["function"]["arguments"], str) else tc["function"]["arguments"]

                    # Auto-inject user context for EVERY tool that needs it
                    uid = str(current_user["_id"])
                    if name in ("get_vault_files", "trigger_killswitch"):
                        args["owner_id"] = uid
                    if name in ("get_audit_logs", "get_pii_distribution", "get_dashboard_stats"):
                        args["user_id"] = uid

                    print(f"🔧 Groq assistant tool call: {name}({args})")
                    result = await execute_tool(name, args)

                    tools_called.append({"tool": name, "args": args})

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(result, default=str),
                    })

        return {"reply": final_reply, "tools_called": tools_called}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Groq assistant MCP error: {e}")
        raise HTTPException(503, detail=str(e))
