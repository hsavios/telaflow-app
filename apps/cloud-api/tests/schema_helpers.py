"""
Materializa JSON Schemas emitidos pelo zod-to-json-schema ($ref na raiz + definitions).
Usado com jsonschema.Draft7Validator para validar payloads do export.
"""

from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft7Validator


def _materializar_raiz(doc: dict) -> dict:
    ref = doc.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/definitions/"):
        nome = ref.rsplit("/", maxsplit=1)[-1]
        defs = doc.get("definitions")
        if not isinstance(defs, dict) or nome not in defs:
            raise ValueError(f"Schema inválido: falta definitions/{nome}")
        raiz = dict(defs[nome])
        raiz["definitions"] = defs
        return raiz
    return doc


def validador_para_arquivo(schema_path: Path) -> Draft7Validator:
    texto = schema_path.read_text(encoding="utf-8")
    doc = json.loads(texto)
    materializado = _materializar_raiz(doc)
    return Draft7Validator(materializado)


def validar_instancia(validator: Draft7Validator, instancia: object) -> None:
    """Levanta jsonschema.exceptions.ValidationError se a instância não conformar."""
    validator.validate(instancia)
