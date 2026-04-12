"""Engine SQLAlchemy e sessão por pedido HTTP (inicialização preguiçosa para testes)."""

from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from telaflow_cloud_api.persistence.models import Base

_engine = None
_session_factory: sessionmaker[Session] | None = None


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "sqlite:///telaflow_cloud_api.db")


def _make_engine():
    url = _database_url()
    connect_args: dict = {}
    poolclass = None
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        if ":memory:" in url or url.rstrip("/") == "sqlite://":
            poolclass = StaticPool
    return create_engine(
        url,
        connect_args=connect_args,
        poolclass=poolclass,
        echo=os.environ.get("SQLALCHEMY_ECHO", "").lower() in ("1", "true", "yes"),
    )


def get_engine():
    global _engine
    if _engine is None:
        _engine = _make_engine()
    return _engine


def _get_session_factory() -> sessionmaker[Session]:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )
    return _session_factory


def create_all_tables() -> None:
    Base.metadata.create_all(bind=get_engine())


def dispose_engine() -> None:
    """Liberta o pool e força recriação na próxima utilização (testes / mudança de URL)."""
    global _engine, _session_factory
    if _engine is not None:
        _engine.dispose()
        _engine = None
    _session_factory = None


def get_session() -> Generator[Session, None, None]:
    db = _get_session_factory()()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
