#!/usr/bin/env python3
"""
Gera `openapi/openapi.json` a partir do app FastAPI (contrato HTTP da Cloud API).

Uso (na pasta apps/cloud-api, com venv ativo):
  python scripts/export_openapi.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    sys.path.insert(0, str(src))

    from telaflow_cloud_api.main import app  # noqa: PLC0415

    out = root / "openapi" / "openapi.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
