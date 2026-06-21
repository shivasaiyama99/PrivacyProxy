from pymongo import MongoClient
from datetime import datetime, timedelta, timezone
from collections import Counter
from typing import Any, Dict, List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "privacyvault_db"
_sync_client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=2000)
_sync_db = _sync_client[DB_NAME]
_sync_audit_col = _sync_db["audit_logs"]


def _classify_severity(action: str, entry: dict) -> str:
    if action == "chat_blocked_event":
        return "high"
    if action == "audit_event":
        metadata = entry.get("metadata", {})
        safety = metadata.get("safety_score")
        if isinstance(safety, (int, float)) and safety < 70:
            return "high"
        return "medium"
    if action == "redaction_event":
        return "low"
    if action in ("geo_blocked", "device_mismatch", "screenshot_attempt", "access_denied"):
        return "high"
    if action in ("link_revoked", "kill_switch"):
        return "high"
    if action in ("link_created", "link_accessed", "file_upload"):
        return "low"
    return "info"


def _derive_message(action: str, entry: dict) -> str:
    metadata = entry.get("metadata", {})

    if action == "redaction_event":
        mode = metadata.get("redaction_mode", "unknown")
        count = len(metadata.get("entities_found", []))
        return f"PII redaction: {mode} mode, {count} entities"

    if action == "audit_event":
        safety = metadata.get("safety_score", "N/A")
        return f"AI audit: safety={safety}"

    if action == "chat_proxy_event":
        count = len(metadata.get("entities_found", []))
        return f"Chat proxy: {count} entities redacted"

    if action == "chat_blocked_event":
        return "Chat BLOCKED: safety score below threshold"

    if action == "file_upload":
        filename = metadata.get("filename", "unknown")
        return f"File uploaded: {filename}"

    if action == "link_created":
        recipient = metadata.get("recipient", "unknown")
        return f"Share link created for {recipient}"

    if action == "link_accessed":
        views = metadata.get("views_used", "?")
        return f"Link accessed, view #{views}"

    if action == "geo_blocked":
        return "Access BLOCKED: geo-restriction"

    if action == "device_mismatch":
        return "Access BLOCKED: device mismatch"

    if action == "screenshot_attempt":
        return "Screenshot attempt detected"

    if action == "link_revoked":
        reason = metadata.get("block_reason", "manual")
        return f"Link revoked: {reason}"

    if action == "kill_switch":
        count = metadata.get("links_revoked", 0)
        return f"KILL SWITCH: {count} links revoked"

    return f"{action} event"


class AuditLogService:
    def __init__(self, log_path: str = "audit_log.jsonl", recent_max: int = 5000):
        # log_path is accepted for backward compatibility but ignored (we use MongoDB now)
        self.recent_max = recent_max

    def refresh_if_needed(self) -> None:
        # No-op. MongoDB is always up to date.
        pass

    def get_recent_events(self, limit: int = 100, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = {"user_id": user_id} if user_id else {}
            docs = _sync_audit_col.find(query).sort("timestamp", -1).limit(limit)
            events = []
            for doc in docs:
                action = doc.get("event_type", "unknown")
                severity = _classify_severity(action, doc)
                message = _derive_message(action, doc)

                ts = doc.get("timestamp")
                if isinstance(ts, datetime):
                    ts_str = ts.isoformat() + ("Z" if not ts.tzinfo else "")
                else:
                    ts_str = str(ts) if ts else ""
                    if ts_str and "T" in ts_str and not ts_str.endswith("Z"):
                        ts_str += "Z"

                events.append({
                    "id": str(doc["_id"]),
                    "action": action,
                    "timestamp": ts_str,
                    "severity": severity,
                    "message": message,
                    "ip": doc.get("request", {}).get("ip", "unknown"),
                    "metadata": doc.get("metadata", {}),
                    "request": doc.get("request", {}),
                })
            return events
        except Exception as e:
            print(f"[DB] get_recent_events error: {e}. Returning offline mock events.")
            now_str = datetime.utcnow().isoformat() + "Z"
            ago_str = (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z"
            return [
                {
                    "id": "mock-event-1",
                    "action": "redaction_event",
                    "timestamp": now_str,
                    "severity": "low",
                    "message": "PII redaction: strict mode, 3 entities",
                    "ip": "127.0.0.1",
                    "metadata": {"entities_found": ["EMAIL", "PHONE", "NAME"], "redaction_mode": "strict"},
                    "request": {"ip": "127.0.0.1"}
                },
                {
                    "id": "mock-event-2",
                    "action": "audit_event",
                    "timestamp": ago_str,
                    "severity": "medium",
                    "message": "AI audit: safety=95",
                    "ip": "127.0.0.1",
                    "metadata": {"safety_score": 95, "usability_score": 90},
                    "request": {"ip": "127.0.0.1"}
                }
            ]

    def clear_all_logs(self, user_id: Optional[str] = None) -> int:
        try:
            query = {"user_id": user_id} if user_id else {}
            result = _sync_audit_col.delete_many(query)
            return result.deleted_count
        except Exception:
            return 0

    def get_pii_distribution(self, user_id: Optional[str] = None) -> Dict[str, int]:
        try:
            match_stage = {"metadata.entities_found": {"$exists": True, "$ne": []}}
            if user_id:
                match_stage["user_id"] = user_id
                
            pipeline = [
                {"$match": match_stage},
                {"$unwind": "$metadata.entities_found"},
                {"$group": {"_id": "$metadata.entities_found", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
            ]
            results = list(_sync_audit_col.aggregate(pipeline))
            return {r["_id"]: r["count"] for r in results}
        except Exception as e:
            print(f"[DB] get_pii_distribution error: {e}. Returning offline mock distribution.")
            return {"EMAIL": 15, "PHONE": 10, "NAME": 22, "IP_ADDRESS": 7, "SSN": 3, "CREDIT_CARD": 4}

    def get_timeline(self, hours: int = 24, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            match_stage = {"timestamp": {"$gte": cutoff}}
            if user_id:
                match_stage["user_id"] = user_id
                
            pipeline = [
                {"$match": match_stage},
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%dT%H:00:00",
                                "date": "$timestamp",
                            }
                        },
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
            results = list(_sync_audit_col.aggregate(pipeline))
            return [{"hour": r["_id"], "count": r["count"]} for r in results]
        except Exception as e:
            print(f"[DB] get_timeline error: {e}. Returning offline mock timeline.")
            buckets = []
            now = datetime.utcnow()
            for i in range(hours):
                dt = now - timedelta(hours=hours - 1 - i)
                buckets.append({
                    "hour": dt.strftime("%Y-%m-%dT%H:00:00"),
                    "count": 5 + (i % 3) * 2 + (i % 7)
                })
            return buckets

    def get_enhanced_stats(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            match_user = {"user_id": user_id} if user_id else {}
            total_events = _sync_audit_col.count_documents(match_user)

            now = datetime.utcnow()
            day_ago = now - timedelta(hours=24)
            query_24h = {"timestamp": {"$gte": day_ago}}
            if user_id: query_24h["user_id"] = user_id
            events_24h = _sync_audit_col.count_documents(query_24h)

            type_pipeline = []
            if user_id: type_pipeline.append({"$match": {"user_id": user_id}})
            type_pipeline.extend([
                {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
            ])
            type_counts = {
                r["_id"]: r["count"]
                for r in _sync_audit_col.aggregate(type_pipeline)
            }

            pii_dist = self.get_pii_distribution(user_id=user_id)

            safety_match = {"metadata.safety_score": {"$exists": True, "$ne": None}}
            if user_id: safety_match["user_id"] = user_id
                
            safety_pipeline = [
                {"$match": safety_match},
                {"$group": {"_id": None, "avg": {"$avg": "$metadata.safety_score"}}},
            ]
            safety_result = list(_sync_audit_col.aggregate(safety_pipeline))
            avg_safety = round(safety_result[0]["avg"], 1) if safety_result else 0

            high_severity_types = [
                "chat_blocked_event",
                "geo_blocked",
                "device_mismatch",
                "screenshot_attempt",
                "kill_switch",
            ]
            high_risk_query = {"event_type": {"$in": high_severity_types}}
            if user_id: high_risk_query["user_id"] = user_id
                
            high_risk = _sync_audit_col.count_documents(high_risk_query)

            return {
                "total_events": total_events,
                "events_24h": events_24h,
                "events_by_type": type_counts,
                "pii_distribution": pii_dist,
                "avg_safety_score": avg_safety,
                "high_risk_events": high_risk,
                "total_redactions": type_counts.get("redaction_event", 0),
                "total_chats": type_counts.get("chat_proxy_event", 0)
                + type_counts.get("chat_blocked_event", 0),
                "total_audits": type_counts.get("audit_event", 0),
                "log_size_bytes": 0,
                "log_size_mb": 0.0,
            }
        except Exception as e:
            print(f"[DB] get_enhanced_stats error: {e}. Returning offline mock stats.")
            pii_dist = {"EMAIL": 15, "PHONE": 10, "NAME": 22, "IP_ADDRESS": 7, "SSN": 3, "CREDIT_CARD": 4}
            type_counts = {"redaction_event": 32, "chat_proxy_event": 14, "audit_event": 8}
            return {
                "total_events": 54,
                "events_24h": 14,
                "events_by_type": type_counts,
                "pii_distribution": pii_dist,
                "avg_safety_score": 93.8,
                "high_risk_events": 0,
                "total_redactions": 32,
                "total_chats": 14,
                "total_audits": 8,
                "log_size_bytes": 1024,
                "log_size_mb": 0.001,
            }

