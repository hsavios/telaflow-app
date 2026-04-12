"""Acesso a dados do domínio evento / cenas / sorteios / mídia."""

from __future__ import annotations

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from telaflow_cloud_api.persistence.ids import new_draw_config_id, new_media_id, new_scene_id
from telaflow_cloud_api.persistence.models import (
    DrawConfigRow,
    DrawRegistrationRow,
    DrawRegistrationSessionRow,
    EventRow,
    ExportPackageRow,
    MediaRequirementRow,
    MembershipRow,
    OrganizationRow,
    SceneRow,
    UserRow,
)


class Repository:
    def __init__(self, session: Session):
        self.session = session

    # --- organizations ---

    def ensure_organization(self, organization_id: str, name: str) -> None:
        row = self.session.get(OrganizationRow, organization_id)
        if row is None:
            self.session.add(OrganizationRow(organization_id=organization_id, name=name))
            self.session.flush()

    # --- users / memberships ---

    def count_users(self) -> int:
        n = self.session.scalar(select(func.count()).select_from(UserRow))
        return int(n or 0)

    def get_user_by_email(self, email: str) -> dict | None:
        row = self.session.scalar(select(UserRow).where(UserRow.email == email.strip().lower()))
        if row is None:
            return None
        return {
            "user_id": row.user_id,
            "email": row.email,
            "password_hash": row.password_hash,
            "display_name": row.display_name,
        }

    def create_user(
        self,
        *,
        user_id: str,
        email: str,
        password_hash: str,
        display_name: str | None,
    ) -> dict:
        row = UserRow(
            user_id=user_id,
            email=email.strip().lower(),
            password_hash=password_hash,
            display_name=display_name,
        )
        self.session.add(row)
        self.session.flush()
        return {"user_id": row.user_id, "email": row.email, "display_name": row.display_name}

    def ensure_membership(
        self,
        *,
        user_id: str,
        organization_id: str,
        role: str = "member",
    ) -> None:
        existing = self.session.scalar(
            select(MembershipRow).where(
                MembershipRow.user_id == user_id,
                MembershipRow.organization_id == organization_id,
            ),
        )
        if existing is None:
            self.session.add(
                MembershipRow(
                    user_id=user_id,
                    organization_id=organization_id,
                    role=role,
                ),
            )
            self.session.flush()

    def list_organization_ids_for_user(self, user_id: str) -> list[str]:
        q = (
            select(MembershipRow.organization_id)
            .where(MembershipRow.user_id == user_id)
            .order_by(MembershipRow.organization_id)
        )
        return list(self.session.scalars(q).all())

    # --- events ---

    def event_exists(self, event_id: str) -> bool:
        return self.session.get(EventRow, event_id) is not None

    def get_event(self, event_id: str) -> dict | None:
        row = self.session.get(EventRow, event_id)
        if row is None:
            return None
        return {
            "event_id": row.event_id,
            "organization_id": row.organization_id,
            "name": row.name,
        }

    def list_events(self, *, organization_id: str | None = None) -> list[dict]:
        q = select(EventRow).order_by(EventRow.event_id)
        if organization_id is not None:
            q = q.where(EventRow.organization_id == organization_id)
        return [
            {"event_id": r.event_id, "organization_id": r.organization_id, "name": r.name}
            for r in self.session.scalars(q).all()
        ]

    def create_event(self, payload: dict) -> dict:
        oid = payload["organization_id"]
        if self.session.get(OrganizationRow, oid) is None:
            self.ensure_organization(oid, (payload.get("name") or oid)[:256])
        row = EventRow(
            event_id=payload["event_id"],
            organization_id=payload["organization_id"],
            name=payload["name"],
        )
        self.session.add(row)
        self.session.flush()
        return self.get_event(row.event_id)  # type: ignore[return-value]

    # --- scenes ---

    def _scene_rows(self, event_id: str) -> list[SceneRow]:
        q = (
            select(SceneRow)
            .where(SceneRow.event_id == event_id)
            .order_by(SceneRow.sort_order, SceneRow.scene_id)
        )
        return list(self.session.scalars(q).all())

    def list_scenes(self, event_id: str) -> list[dict]:
        return [dict(r.payload) for r in self._scene_rows(event_id)]

    def scene_index(self, event_id: str, scene_id: str) -> int | None:
        rows = self._scene_rows(event_id)
        for i, r in enumerate(rows):
            if r.scene_id == scene_id:
                return i
        return None

    def sort_order_used(self, event_id: str, sort_order: int, exclude_scene_id: str | None) -> bool:
        for r in self._scene_rows(event_id):
            if exclude_scene_id and r.scene_id == exclude_scene_id:
                continue
            if r.sort_order == sort_order:
                return True
        return False

    def set_scenes_for_event(self, event_id: str, payloads: list[dict]) -> None:
        self.session.execute(delete(SceneRow).where(SceneRow.event_id == event_id))
        for p in payloads:
            self.session.add(
                SceneRow(
                    event_id=event_id,
                    scene_id=p["scene_id"],
                    sort_order=int(p.get("sort_order", 0)),
                    payload=dict(p),
                ),
            )

    def append_scene(self, event_id: str, payload: dict) -> dict:
        p = dict(payload)
        self.session.add(
            SceneRow(
                event_id=event_id,
                scene_id=p["scene_id"],
                sort_order=int(p.get("sort_order", 0)),
                payload=p,
            ),
        )
        self.session.flush()
        return dict(p)

    def update_scene_at_index(self, event_id: str, index: int, payload: dict) -> dict:
        rows = self._scene_rows(event_id)
        row = rows[index]
        row.sort_order = int(payload.get("sort_order", row.sort_order))
        row.payload = dict(payload)
        self.session.flush()
        return dict(row.payload)

    def delete_scene(self, event_id: str, scene_id: str) -> str | None:
        row = self.session.scalar(
            select(SceneRow).where(SceneRow.event_id == event_id, SceneRow.scene_id == scene_id),
        )
        if row is None:
            return None
        self.session.delete(row)
        self.session.flush()
        self.compact_scene_orders(event_id)
        return scene_id

    def _compact_sort_orders_in_memory(self, bucket: list[dict]) -> None:
        bucket.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))
        for i, s in enumerate(bucket):
            s["sort_order"] = i

    def compact_scene_orders(self, event_id: str) -> None:
        bucket = self.list_scenes(event_id)
        self._compact_sort_orders_in_memory(bucket)
        self.set_scenes_for_event(event_id, bucket)

    # --- draw configs ---

    def list_draw_configs(self, event_id: str) -> list[dict]:
        q = (
            select(DrawConfigRow)
            .where(DrawConfigRow.event_id == event_id)
            .order_by(DrawConfigRow.draw_config_id)
        )
        return [dict(r.payload) for r in self.session.scalars(q).all()]

    def get_draw_config(self, event_id: str, draw_config_id: str) -> dict | None:
        q = select(DrawConfigRow).where(
            DrawConfigRow.event_id == event_id,
            DrawConfigRow.draw_config_id == draw_config_id,
        )
        row = self.session.scalar(q)
        return dict(row.payload) if row else None

    def append_draw_config(self, event_id: str, payload: dict) -> dict:
        p = dict(payload)
        self.session.add(
            DrawConfigRow(
                event_id=event_id,
                draw_config_id=p["draw_config_id"],
                payload=p,
            ),
        )
        self.session.flush()
        return p

    def update_draw_config(self, event_id: str, draw_config_id: str, payload: dict) -> dict | None:
        row = self.session.scalar(
            select(DrawConfigRow).where(
                DrawConfigRow.event_id == event_id,
                DrawConfigRow.draw_config_id == draw_config_id,
            ),
        )
        if row is None:
            return None
        row.payload = dict(payload)
        self.session.flush()
        return dict(row.payload)

    def delete_draw_config(self, event_id: str, draw_config_id: str) -> bool:
        row = self.session.scalar(
            select(DrawConfigRow).where(
                DrawConfigRow.event_id == event_id,
                DrawConfigRow.draw_config_id == draw_config_id,
            ),
        )
        if row is None:
            return False
        self.session.delete(row)
        self.session.flush()
        return True

    # --- media requirements ---

    def list_media_requirements(self, event_id: str) -> list[dict]:
        q = (
            select(MediaRequirementRow)
            .where(MediaRequirementRow.event_id == event_id)
            .order_by(MediaRequirementRow.media_id)
        )
        return [dict(r.payload) for r in self.session.scalars(q).all()]

    def get_media_requirement(self, event_id: str, media_id: str) -> dict | None:
        row = self.session.scalar(
            select(MediaRequirementRow).where(
                MediaRequirementRow.event_id == event_id,
                MediaRequirementRow.media_id == media_id,
            ),
        )
        return dict(row.payload) if row else None

    def append_media_requirement(self, event_id: str, payload: dict) -> dict:
        p = dict(payload)
        self.session.add(
            MediaRequirementRow(
                event_id=event_id,
                media_id=p["media_id"],
                payload=p,
            ),
        )
        self.session.flush()
        return p

    def update_media_requirement(self, event_id: str, media_id: str, payload: dict) -> dict | None:
        row = self.session.scalar(
            select(MediaRequirementRow).where(
                MediaRequirementRow.event_id == event_id,
                MediaRequirementRow.media_id == media_id,
            ),
        )
        if row is None:
            return None
        row.payload = dict(payload)
        self.session.flush()
        return dict(row.payload)

    def delete_media_requirement(self, event_id: str, media_id: str) -> bool:
        row = self.session.scalar(
            select(MediaRequirementRow).where(
                MediaRequirementRow.event_id == event_id,
                MediaRequirementRow.media_id == media_id,
            ),
        )
        if row is None:
            return False
        self.session.delete(row)
        self.session.flush()
        return True

    def clear_media_scene_hints(self, event_id: str, scene_id: str) -> None:
        for p in self.list_media_requirements(event_id):
            if p.get("scene_id") == scene_id:
                p["scene_id"] = None
                self.update_media_requirement(event_id, p["media_id"], p)

    # --- references ---

    def scenes_referencing_draw(self, event_id: str, draw_config_id: str) -> list[str]:
        return [s["scene_id"] for s in self.list_scenes(event_id) if s.get("draw_config_id") == draw_config_id]

    def scenes_referencing_media(self, event_id: str, media_id: str) -> list[str]:
        return [s["scene_id"] for s in self.list_scenes(event_id) if s.get("media_id") == media_id]

    # --- export audit ---

    def record_export_package(
        self,
        *,
        export_id: str,
        event_id: str,
        generated_at,
        export_directory: str,
        zip_path: str | None = None,
        checksum_sha256: str | None = None,
    ) -> None:
        self.session.add(
            ExportPackageRow(
                export_id=export_id,
                event_id=event_id,
                generated_at=generated_at,
                export_directory=export_directory,
                zip_path=zip_path,
                checksum_sha256=checksum_sha256,
            ),
        )

    # --- registration (QR flow) ---

    def create_registration_session(
        self,
        *,
        event_id: str,
        draw_config_id: str,
        public_token: str,
        join_base_url: str | None,
        opens_at,
        closes_at,
    ) -> DrawRegistrationSessionRow:
        row = DrawRegistrationSessionRow(
            id=str(uuid.uuid4()),
            event_id=event_id,
            draw_config_id=draw_config_id,
            public_token=public_token,
            opens_at=opens_at,
            closes_at=closes_at,
            join_base_url=join_base_url,
        )
        self.session.add(row)
        self.session.flush()
        return row

    def get_registration_session_by_token(self, public_token: str) -> DrawRegistrationSessionRow | None:
        return self.session.scalar(
            select(DrawRegistrationSessionRow).where(
                DrawRegistrationSessionRow.public_token == public_token,
            ),
        )

    def add_registration(
        self,
        session_id: str,
        *,
        display_name: str | None,
        assigned_number: int | None,
        created_at,
    ) -> DrawRegistrationRow:
        row = DrawRegistrationRow(
            id=str(uuid.uuid4()),
            session_id=session_id,
            display_name=display_name,
            assigned_number=assigned_number,
            created_at=created_at,
        )
        self.session.add(row)
        self.session.flush()
        return row

    def list_registrations(self, session_id: str) -> list[DrawRegistrationRow]:
        q = select(DrawRegistrationRow).where(DrawRegistrationRow.session_id == session_id)
        return list(self.session.scalars(q).all())

    def list_registration_sessions(self, event_id: str) -> list[DrawRegistrationSessionRow]:
        q = select(DrawRegistrationSessionRow).where(DrawRegistrationSessionRow.event_id == event_id)
        return list(self.session.scalars(q).all())


def assert_scene_exists(repo: Repository, event_id: str, scene_id: str) -> None:
    from fastapi import HTTPException

    if repo.scene_index(event_id, scene_id) is None:
        raise HTTPException(
            status_code=400,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )


def validate_scene_links(
    repo: Repository,
    event_id: str,
    scene_type: str,
    media_id: str | None,
    draw_config_id: str | None,
) -> None:
    from fastapi import HTTPException

    if draw_config_id and repo.get_draw_config(event_id, draw_config_id) is None:
        raise HTTPException(
            status_code=400,
            detail={"error": "draw_config_not_found", "draw_config_id": draw_config_id},
        )
    if media_id and repo.get_media_requirement(event_id, media_id) is None:
        raise HTTPException(
            status_code=400,
            detail={"error": "media_id_not_found", "media_id": media_id},
        )
    if scene_type == "draw" and not draw_config_id:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "draw_scene_requires_draw_config",
                "message": "Scene do tipo draw exige draw_config_id do mesmo evento.",
            },
        )


__all__ = ["Repository", "assert_scene_exists", "validate_scene_links"]
