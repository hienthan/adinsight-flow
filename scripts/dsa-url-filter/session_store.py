#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


SESSION_ROOT = Path("/tmp/dsa-url-filter")
SESSION_TTL_MINUTES = 60


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_session_root() -> Path:
    SESSION_ROOT.mkdir(parents=True, exist_ok=True)
    return SESSION_ROOT


def session_dir(session_id: str) -> Path:
    return ensure_session_root() / session_id


def meta_path(session_id: str) -> Path:
    return session_dir(session_id) / "meta.json"


def rows_path(session_id: str) -> Path:
    return session_dir(session_id) / "rows.json"


def summary_path(session_id: str) -> Path:
    return session_dir(session_id) / "summary.json"


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def create_session_meta(session_id: str, file_name: str, platform: str, row_count: int, country_options: list[str]) -> dict[str, Any]:
    created_at = utc_now()
    expires_at = created_at + timedelta(minutes=SESSION_TTL_MINUTES)
    payload = {
        "session_id": session_id,
        "file_name": file_name,
        "platform": platform,
        "created_at": created_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "row_count": row_count,
        "country_options": country_options,
    }
    write_json(meta_path(session_id), payload)
    return payload


def load_session(session_id: str) -> dict[str, Any]:
    session_directory = session_dir(session_id)
    if not session_directory.exists():
        raise FileNotFoundError(f"Session {session_id} was not found.")

    meta = read_json(meta_path(session_id))
    rows = read_json(rows_path(session_id))
    summary = read_json(summary_path(session_id))
    return {
        "meta": meta,
        "rows": rows,
        "summary": summary,
    }


def cleanup_expired_sessions() -> None:
    root = ensure_session_root()
    now = utc_now()
    for candidate in root.iterdir():
        meta_file = candidate / "meta.json"
        if not meta_file.exists():
            continue
        try:
            meta = read_json(meta_file)
            expires_at = datetime.fromisoformat(meta["expires_at"])
            if expires_at <= now:
                shutil.rmtree(candidate, ignore_errors=True)
        except Exception:
            shutil.rmtree(candidate, ignore_errors=True)

