"""
MCP (Model Context Protocol) Server for PrivacyProxy.

Exposes 6 tools over SSE transport, mounted into the existing FastAPI app.
Every tool uses async Motor queries and ensures no raw PII leaks in responses.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from mcp.server import Server
from mcp.types import Tool, TextContent
from mcp.server.sse import SseServerTransport

from app.database import db, audit_col, files_col, links_col

logger = logging.getLogger("mcp_server")

# ---------------------------------------------------------------------------
# Lazy reference to the RedactionEngine instance (set by main.py at startup)
# ---------------------------------------------------------------------------
_redaction_engine = None


def set_redaction_engine(engine):
    """Called once from main.py after the engine is initialised."""
    global _redaction_engine
    _redaction_engine = engine


# ---------------------------------------------------------------------------
# MCP Server instance
# ---------------------------------------------------------------------------
mcp_server = Server("privacyproxy-mcp")

# ---------------------------------------------------------------------------
# SSE Transport (mounted by main.py)
# ---------------------------------------------------------------------------
sse_transport = SseServerTransport("/mcp/messages/")


# ===== TOOL DEFINITIONS ====================================================

TOOL_DEFINITIONS: List[Tool] = [
    Tool(
        name="scan_pii",
        description=(
            "Scan a block of text for PII (Personally Identifiable Information) "
            "using the Presidio redaction engine. Returns the cleaned text and a "
            "list of entity types that were detected."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The raw text to scan for PII.",
                },
                "mode": {
                    "type": "string",
                    "enum": ["strict", "synthetic", "mask"],
                    "description": "Redaction mode: strict (replace with placeholders), "
                    "synthetic (replace with fake data), or mask (numbered labels).",
                    "default": "strict",
                },
            },
            "required": ["text"],
        },
    ),
    Tool(
        name="get_vault_files",
        description=(
            "Retrieve the most recent files stored in the PrivacyProxy vault "
            "for a given owner. Returns file metadata (id, filename, size, date)."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "owner_id": {
                    "type": "string",
                    "description": "The user/owner ID whose vault files to retrieve.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max number of files to return (default 20).",
                    "default": 20,
                },
            },
            "required": ["owner_id"],
        },
    ),
    Tool(
        name="get_audit_logs",
        description=(
            "Query the audit log collection. Optionally filter by event_type. "
            "Returns recent audit entries with timestamp, event type, and metadata."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "event_type": {
                    "type": "string",
                    "description": "Optional event type filter (e.g. redaction_event, "
                    "audit_event, chat_proxy_event, chat_blocked_event).",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max entries to return (default 50).",
                    "default": 50,
                },
                "user_id": {
                    "type": "string",
                    "description": "Optional user ID to scope logs.",
                },
            },
            "required": [],
        },
    ),
    Tool(
        name="trigger_killswitch",
        description=(
            "Emergency kill-switch: revoke ALL active share links for an owner. "
            "Returns the number of links that were revoked."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "owner_id": {
                    "type": "string",
                    "description": "The owner whose active links should be revoked.",
                },
            },
            "required": ["owner_id"],
        },
    ),
    Tool(
        name="get_dashboard_stats",
        description=(
            "Aggregate high-level dashboard statistics: total redactions, "
            "active share links, and average safety score."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "Optional user ID to scope stats.",
                },
            },
            "required": [],
        },
    ),
    Tool(
        name="get_pii_distribution",
        description=(
            "Return a breakdown of PII entity types detected across all audit "
            "logs (e.g. EMAIL_ADDRESS: 42, PHONE_NUMBER: 17)."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "Optional user ID to scope the distribution.",
                },
            },
            "required": [],
        },
    ),
]


# ===== HANDLER: list_tools ==================================================

@mcp_server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """Return all available MCP tools."""
    return TOOL_DEFINITIONS


# ===== HANDLER: call_tool ===================================================

@mcp_server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any] | None) -> List[TextContent]:
    """
    Dispatch a tool call to the appropriate async handler.
    Every handler returns a JSON-serialisable dict wrapped in TextContent.
    """
    import json

    arguments = arguments or {}

    try:
        if name == "scan_pii":
            result = await _tool_scan_pii(arguments)
        elif name == "get_vault_files":
            result = await _tool_get_vault_files(arguments)
        elif name == "get_audit_logs":
            result = await _tool_get_audit_logs(arguments)
        elif name == "trigger_killswitch":
            result = await _tool_trigger_killswitch(arguments)
        elif name == "get_dashboard_stats":
            result = await _tool_get_dashboard_stats(arguments)
        elif name == "get_pii_distribution":
            result = await _tool_get_pii_distribution(arguments)
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception as exc:
        logger.exception("MCP tool '%s' failed", name)
        result = {"error": str(exc)}

    return [TextContent(type="text", text=json.dumps(result, default=str))]


# ===== TOOL IMPLEMENTATIONS ================================================

async def _tool_scan_pii(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Scan text for PII using the existing Presidio RedactionEngine.
    Returns cleaned text and the list of entity types found.
    """
    text = args.get("text", "")
    mode = args.get("mode", "strict")

    if not text:
        return {"error": "Parameter 'text' is required and must be non-empty."}
    if len(text) > 10_000:
        return {"error": "Text exceeds 10 000 character limit."}
    if mode not in ("strict", "synthetic", "mask"):
        return {"error": f"Invalid mode '{mode}'. Use strict, synthetic, or mask."}

    if _redaction_engine is None:
        return {"error": "Redaction engine is not initialised yet."}

    result = _redaction_engine.sanitize(text, mode=mode)
    return {
        "clean_text": result["clean_text"],
        "entities_found": result["items"],
        "entity_count": len(result["items"]),
        "mode": mode,
    }


async def _tool_get_vault_files(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Query the shared_files collection for a given owner_id.
    Returns file metadata without any raw PII.
    """
    owner_id = args.get("owner_id", "")
    limit = min(int(args.get("limit", 20)), 100)

    if not owner_id:
        return {"error": "Parameter 'owner_id' is required."}

    try:
        cursor = files_col.find({"owner_id": owner_id}).sort("uploaded_at", -1).limit(limit)
        files = []
        async for doc in cursor:
            files.append({
                "file_id": str(doc["_id"]),
                "filename": doc.get("filename", "unknown"),
                "content_type": doc.get("content_type", ""),
                "file_size_bytes": doc.get("file_size_bytes", 0),
                "uploaded_at": str(doc.get("uploaded_at", "")),
                "description": doc.get("description", ""),
            })
        return {"owner_id": owner_id, "file_count": len(files), "files": files}
    except Exception as exc:
        logger.exception("get_vault_files failed")
        return {"error": str(exc)}


async def _tool_get_audit_logs(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Query the audit_logs collection with optional event_type and user_id filters.
    Strips any raw PII from the response.
    """
    event_type = args.get("event_type")
    user_id = args.get("user_id")
    limit = min(int(args.get("limit", 50)), 200)

    query: Dict[str, Any] = {}
    if event_type:
        query["event_type"] = event_type
    if user_id:
        query["user_id"] = user_id

    try:
        cursor = audit_col.find(query).sort("timestamp", -1).limit(limit)
        entries: List[Dict[str, Any]] = []
        async for doc in cursor:
            metadata = doc.get("metadata", {})
            entries.append({
                "id": str(doc["_id"]),
                "event_type": doc.get("event_type", "unknown"),
                "timestamp": str(doc.get("timestamp", "")),
                "user_id": doc.get("user_id"),
                "safety_score": metadata.get("safety_score"),
                "redaction_mode": metadata.get("redaction_mode"),
                "entity_count": len(metadata.get("entities_found", [])),
                "processing_time_ms": metadata.get("processing_time_ms"),
            })
        return {"count": len(entries), "entries": entries}
    except Exception as exc:
        logger.exception("get_audit_logs failed")
        return {"error": str(exc)}


async def _tool_trigger_killswitch(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Emergency kill-switch: set all active share_links for an owner to 'revoked'.
    Also writes an audit log entry for compliance.
    """
    owner_id = args.get("owner_id", "")
    if not owner_id:
        return {"error": "Parameter 'owner_id' is required."}

    try:
        result = await links_col.update_many(
            {"created_by": owner_id, "status": "active"},
            {
                "$set": {
                    "status": "revoked",
                    "revoked_at": datetime.utcnow(),
                    "revoke_reason": "mcp_killswitch",
                }
            },
        )
        revoked_count = result.modified_count

        # Write audit log
        await audit_col.insert_one({
            "event_type": "kill_switch",
            "timestamp": datetime.utcnow(),
            "user_id": owner_id,
            "metadata": {
                "links_revoked": revoked_count,
                "trigger": "mcp_tool",
            },
            "request": {"ip": "mcp_internal"},
        })

        return {
            "owner_id": owner_id,
            "revoked_count": revoked_count,
            "status": "completed",
        }
    except Exception as exc:
        logger.exception("trigger_killswitch failed")
        return {"error": str(exc)}


async def _tool_get_dashboard_stats(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aggregate dashboard statistics from audit_logs and share_links:
    - total_redactions
    - active_links
    - avg_safety_score
    """
    user_id = args.get("user_id")

    try:
        # Total redactions
        redaction_query: Dict[str, Any] = {"event_type": "redaction_event"}
        if user_id:
            redaction_query["user_id"] = user_id
        total_redactions = await audit_col.count_documents(redaction_query)

        # Active share links
        links_query: Dict[str, Any] = {"status": "active"}
        if user_id:
            links_query["created_by"] = user_id
        active_links = await links_col.count_documents(links_query)

        # Average safety score
        safety_match: Dict[str, Any] = {
            "metadata.safety_score": {"$exists": True, "$ne": None},
        }
        if user_id:
            safety_match["user_id"] = user_id

        pipeline = [
            {"$match": safety_match},
            {"$group": {"_id": None, "avg": {"$avg": "$metadata.safety_score"}}},
        ]
        agg_result = await audit_col.aggregate(pipeline).to_list(length=1)
        avg_safety = round(agg_result[0]["avg"], 1) if agg_result else 0.0

        return {
            "total_redactions": total_redactions,
            "active_links": active_links,
            "avg_safety_score": avg_safety,
        }
    except Exception as exc:
        logger.exception("get_dashboard_stats failed")
        return {"error": str(exc)}


async def _tool_get_pii_distribution(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aggregate PII entity type counts from audit_logs.
    Returns a dict like {"EMAIL_ADDRESS": 42, "PHONE_NUMBER": 17, ...}.
    """
    user_id = args.get("user_id")

    try:
        match_stage: Dict[str, Any] = {
            "metadata.entities_found": {"$exists": True, "$ne": []},
        }
        if user_id:
            match_stage["user_id"] = user_id

        pipeline = [
            {"$match": match_stage},
            {"$unwind": "$metadata.entities_found"},
            {"$group": {"_id": "$metadata.entities_found", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        results = await audit_col.aggregate(pipeline).to_list(length=100)
        distribution = {r["_id"]: r["count"] for r in results}

        return {
            "total_entity_types": len(distribution),
            "distribution": distribution,
        }
    except Exception as exc:
        logger.exception("get_pii_distribution failed")
        return {"error": str(exc)}


# ===== HELPER: Build OpenAI-compatible tool definitions for Groq ============

def get_openai_tool_definitions() -> List[Dict[str, Any]]:
    """
    Return the 6 MCP tools in OpenAI function-calling format so they can be
    passed to Groq / LiteLLM ``tools`` parameter.
    """
    openai_tools = []
    for t in TOOL_DEFINITIONS:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.inputSchema,
            },
        })
    return openai_tools


async def execute_tool(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an MCP tool by name and return a plain dict.
    Used by the /chat route to fulfil LLM tool_call requests.
    """
    import json

    contents = await handle_call_tool(name, arguments)
    # contents is List[TextContent]; parse the first one back to dict
    if contents and contents[0].text:
        return json.loads(contents[0].text)
    return {"error": "Empty tool response"}
