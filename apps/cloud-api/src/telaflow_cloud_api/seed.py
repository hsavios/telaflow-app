"""Dados iniciais (showcase) — idempotente."""

from __future__ import annotations

import logging
import os
import uuid

from sqlalchemy.orm import Session

from telaflow_cloud_api.domain import Event, MediaRequirement, Scene
from telaflow_cloud_api.domain.draw_config import DrawConfig, NumberRange
from telaflow_cloud_api.domain.draw_public_copy import DrawPublicCopy
from telaflow_cloud_api.auth.passwords import hash_password
from telaflow_cloud_api.persistence.repository import Repository

SHOWCASE_EVENT_ID = "evt_telaflow_demo_v1"
SHOWCASE_ORG_ID = "org_telaflow_d1"

_LOG = logging.getLogger(__name__)


def seed_showcase_event_if_absent(session: Session) -> None:
    repo = Repository(session)
    if repo.event_exists(SHOWCASE_EVENT_ID):
        return

    repo.ensure_organization(SHOWCASE_ORG_ID, "TelaFlow Demo Organization")

    eid = SHOWCASE_EVENT_ID
    repo.create_event(
        Event(
            event_id=eid,
            organization_id=SHOWCASE_ORG_ID,
            name="Showcase TelaFlow — roteiro demo (Abertura ao encerramento)",
        ).model_dump(),
    )

    draw_row = DrawConfig(
        draw_config_id="dcf_demo_sorteio",
        event_id=eid,
        name="Sorteio principal",
        max_winners=1,
        notes="Demonstração — intervalo numérico padrão.",
        enabled=True,
        draw_type="number_range",
        number_range=NumberRange(min=1, max=1000),
        public_copy=DrawPublicCopy(
            headline="Momento do sorteio",
            audience_instructions="Boa sorte a todos os participantes.",
            result_label="Número sorteado",
        ),
    ).model_dump()
    repo.append_draw_config(eid, draw_row)

    media_specs: list[tuple[str, str, str]] = [
        ("med_demo_abert", "Abertura (vídeo no Player)", "video"),
        ("med_demo_inst", "Institucional (imagem)", "image"),
        ("med_demo_patroc", "Patrocínio (imagem)", "image"),
        ("med_demo_encerr", "Encerramento (vídeo)", "video"),
    ]
    for mid, label, mtype in media_specs:
        repo.append_media_requirement(
            eid,
            MediaRequirement(
                media_id=mid,
                event_id=eid,
                label=label,
                media_type=mtype,  # type: ignore[arg-type]
                required=False,
                scene_id=None,
                allowed_extensions_hint=None,
            ).model_dump(),
        )

    scenes_payload: list[tuple[int, str, str, str, str | None, str | None]] = [
        (0, "scn_demo_abert", "opening", "Abertura", "med_demo_abert", None),
        (1, "scn_demo_inst", "institutional", "Institucional", "med_demo_inst", None),
        (2, "scn_demo_pat", "sponsor", "Patrocínio", "med_demo_patroc", None),
        (3, "scn_demo_sort", "draw", "Sorteio principal", None, "dcf_demo_sorteio"),
        (4, "scn_demo_fim", "closing", "Encerramento", "med_demo_encerr", None),
    ]
    for sort_order, sid, st, name, mid, did in scenes_payload:
        repo.append_scene(
            eid,
            Scene(
                scene_id=sid,
                event_id=eid,
                sort_order=sort_order,
                type=st,  # type: ignore[arg-type]
                name=name,
                enabled=True,
                media_id=mid,
                draw_config_id=did,
            ).model_dump(),
        )


def seed_bootstrap_operator_if_absent(session: Session) -> None:
    """
    Cria o primeiro usuário (operador) se a tabela `users` estiver vazia.

    - E-mail: `TELAFLOW_BOOTSTRAP_ADMIN_EMAIL` (padrão `admin@telaflow.local`).
    - Senha: `TELAFLOW_BOOTSTRAP_ADMIN_PASSWORD`; se `TELAFLOW_JWT_SECRET` estiver
      definido e a senha estiver vazia, **não** cria usuário.
    - Sem JWT: se a senha estiver vazia, usa `TelaflowDev!2026` (apenas desenvolvimento).
    """
    repo = Repository(session)
    if repo.count_users() > 0:
        return

    email = os.environ.get("TELAFLOW_BOOTSTRAP_ADMIN_EMAIL", "admin@telaflow.local").strip().lower()
    if repo.get_user_by_email(email):
        return

    jwt_on = bool(os.environ.get("TELAFLOW_JWT_SECRET", "").strip())
    password = os.environ.get("TELAFLOW_BOOTSTRAP_ADMIN_PASSWORD", "").strip()
    if jwt_on and not password:
        _LOG.warning(
            "TELAFLOW_JWT_SECRET está definido mas TELAFLOW_BOOTSTRAP_ADMIN_PASSWORD está vazio; "
            "nenhum usuário bootstrap foi criado.",
        )
        return
    if not password:
        password = "admin123"
        _LOG.warning(
            "Usando senha bootstrap de desenvolvimento. Defina TELAFLOW_BOOTSTRAP_ADMIN_PASSWORD "
            "antes de expor a API.",
        )

    repo.ensure_organization(SHOWCASE_ORG_ID, "TelaFlow Demo Organization")
    user_id = f"usr_{uuid.uuid4().hex[:24]}"
    repo.create_user(
        user_id=user_id,
        email=email,
        password_hash=hash_password(password),
        display_name="Operador bootstrap",
    )
    repo.ensure_membership(user_id=user_id, organization_id=SHOWCASE_ORG_ID, role="admin")
