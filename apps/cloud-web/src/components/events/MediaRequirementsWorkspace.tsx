"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  createMediaRequirement,
  deleteMediaRequirement,
  updateMediaRequirement,
  type CloudMediaRequirement,
  type CloudScene,
} from "@/lib/cloud-api";

const MEDIA_TYPE_LABELS: Record<CloudMediaRequirement["media_type"], string> = {
  video: "Vídeo",
  image: "Imagem",
  audio: "Áudio",
  other: "Outro",
};

function errText(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "media_requirement_in_use") {
      return "Este slot ainda está referenciado em uma ou mais scenes. Remova o media_id na scene antes de excluir.";
    }
    if (err.message === "media_requirement_not_found") {
      return "Requisito não encontrado.";
    }
    if (err.message.startsWith("media_requirement_update_failed:")) {
      return "Não foi possível salvar o requisito.";
    }
    if (err.message.startsWith("media_requirement_create_failed:")) {
      return "Não foi possível criar o requisito.";
    }
    if (err.message.startsWith("media_requirement_delete_failed:")) {
      return "Não foi possível excluir o requisito.";
    }
  }
  return "Algo deu errado. Tente de novo.";
}

type Props = {
  eventId: string;
  scenes: CloudScene[];
  mediaRequirements: CloudMediaRequirement[];
  setMediaRequirements: (rows: CloudMediaRequirement[]) => void;
  reloadMediaRequirements: () => Promise<void>;
  apiConfigured: boolean;
};

export function MediaRequirementsWorkspace({
  eventId,
  scenes,
  mediaRequirements,
  setMediaRequirements,
  reloadMediaRequirements,
  apiConfigured,
}: Props) {
  const modalTitleId = useId();
  const labelInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftType, setDraftType] =
    useState<CloudMediaRequirement["media_type"]>("video");
  const [draftRequired, setDraftRequired] = useState(false);
  const [draftSceneId, setDraftSceneId] = useState<string>("");
  const [draftHint, setDraftHint] = useState("");
  const [panelSaving, setPanelSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] =
    useState<CloudMediaRequirement["media_type"]>("video");
  const [newRequired, setNewRequired] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const selected =
    mediaRequirements.find((m) => m.media_id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setDraftLabel("");
      return;
    }
    setDraftLabel(selected.label);
    setDraftType(selected.media_type);
    setDraftRequired(selected.required);
    setDraftSceneId(selected.scene_id ?? "");
    setDraftHint(selected.allowed_extensions_hint ?? "");
    setPanelError(null);
  }, [selected]);

  useEffect(() => {
    if (!mediaRequirements.some((m) => m.media_id === selectedId)) {
      setSelectedId(null);
    }
  }, [mediaRequirements, selectedId]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [banner]);

  const openModal = useCallback(() => {
    setModalError(null);
    setNewLabel("");
    setNewType("video");
    setNewRequired(false);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const t = window.setTimeout(() => labelInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [modalOpen]);

  const submitNew = async () => {
    const trimmed = newLabel.trim();
    if (trimmed.length < 1) {
      setModalError("Informe o rótulo do slot (ex.: vinheta de abertura).");
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await createMediaRequirement(eventId, {
        label: trimmed,
        media_type: newType,
        required: newRequired,
        scene_id: null,
        allowed_extensions_hint: null,
      });
      setModalOpen(false);
      setBanner("Requisito de mídia criado (sem upload na Cloud no MVP).");
      await reloadMediaRequirements();
    } catch (err) {
      setModalError(errText(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const savePanel = async () => {
    if (!selected) return;
    const trimmed = draftLabel.trim();
    if (trimmed.length < 1) {
      setPanelError("Rótulo obrigatório.");
      return;
    }
    setPanelSaving(true);
    setPanelError(null);
    try {
      const out = await updateMediaRequirement(eventId, selected.media_id, {
        label: trimmed,
        media_type: draftType,
        required: draftRequired,
        scene_id: draftSceneId ? draftSceneId : null,
        allowed_extensions_hint: draftHint.trim() || null,
      });
      setMediaRequirements(
        mediaRequirements.map((m) =>
          m.media_id === out.media_requirement.media_id
            ? out.media_requirement
            : m,
        ),
      );
      setBanner("Requisito salvo.");
      await reloadMediaRequirements();
    } catch (err) {
      setPanelError(errText(err));
    } finally {
      setPanelSaving(false);
    }
  };

  const removeSelected = async () => {
    if (!selected) return;
    if (
      !window.confirm(
        `Excluir o slot «${selected.label}» (${selected.media_id})? Não remove arquivos locais; só o manifesto na Cloud.`,
      )
    ) {
      return;
    }
    setPanelSaving(true);
    setPanelError(null);
    try {
      await deleteMediaRequirement(eventId, selected.media_id);
      setSelectedId(null);
      setBanner("Requisito excluído.");
      await reloadMediaRequirements();
    } catch (err) {
      setPanelError(errText(err));
    } finally {
      setPanelSaving(false);
    }
  };

  const sceneOptions = [...scenes].sort(
    (a, b) => a.sort_order - b.sort_order || a.scene_id.localeCompare(b.scene_id),
  );

  return (
    <div className="mt-8 space-y-6">
      {banner ? (
        <p
          className="rounded-tf border border-tf-teal/30 bg-tf-teal-soft/30 px-4 py-3 text-sm text-tf-fg"
          role="status"
        >
          {banner}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-tf-subtle">
          Manifesto por evento: cada entrada tem um{" "}
          <span className="font-mono text-tf-muted">media_id</span> estável. O
          Player fará o binding com arquivos na workspace local.
        </p>
        <button
          type="button"
          onClick={openModal}
          className="shrink-0 rounded-tf bg-tf-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={!apiConfigured}
        >
          Novo requisito
        </button>
      </div>

      {mediaRequirements.length === 0 ? (
        <div className="rounded-tf-lg border border-tf-border bg-tf-mid/35 px-6 py-10 text-center">
          <h3 className="font-display text-lg font-semibold text-tf-fg">
            Nenhum requisito de mídia
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm text-tf-muted">
            Declare slots (vídeo, imagem, etc.) com obrigatoriedade. Depois,
            nas scenes, escolha qual slot alimenta a mídia principal.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-6 rounded-tf border border-tf-border bg-tf-mid/60 px-5 py-2.5 text-sm font-semibold text-tf-fg disabled:opacity-50"
            disabled={!apiConfigured}
          >
            Criar primeiro requisito
          </button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tf-subtle">
              Manifesto
            </h3>
            <ul className="flex flex-col gap-2" role="list">
              {mediaRequirements.map((m) => (
                <li key={m.media_id} role="listitem">
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.media_id)}
                    className={`w-full rounded-tf border px-3 py-3 text-left text-sm transition-colors ${
                      selectedId === m.media_id
                        ? "border-tf-accent/40 bg-tf-mid/50 ring-1 ring-tf-accent/25"
                        : "border-tf-border bg-tf-mid/40 hover:border-tf-border hover:bg-tf-mid/55"
                    }`}
                  >
                    <div className="font-medium text-tf-fg">{m.label}</div>
                    <div className="mt-1 text-xs text-tf-muted">
                      {MEDIA_TYPE_LABELS[m.media_type]}
                      {m.required ? " · obrigatório" : ""}
                    </div>
                    <div className="mt-1 font-mono text-xs text-tf-faint">
                      {m.media_id}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-tf-lg border border-tf-border bg-tf-mid/30 p-5 lg:min-h-[18rem]">
            {!selected ? (
              <p className="text-sm text-tf-muted">
                Selecione um item na lista para editar rótulo, tipo, obrigatoriedade
                e vínculo opcional a uma scene (dica de consumo).
              </p>
            ) : (
              <div className="space-y-5">
                <h3 className="font-display text-base font-semibold text-tf-fg">
                  Editar requisito
                </h3>

                <label className="block text-sm font-medium text-tf-muted">
                  Rótulo
                  <input
                    type="text"
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    maxLength={256}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none focus:border-tf-accent/50 focus:ring-2 focus:ring-tf-accent/30"
                  />
                </label>

                <label className="block text-sm font-medium text-tf-muted">
                  Tipo
                  <select
                    value={draftType}
                    onChange={(e) =>
                      setDraftType(
                        e.target.value as CloudMediaRequirement["media_type"],
                      )
                    }
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
                  >
                    {(Object.keys(MEDIA_TYPE_LABELS) as CloudMediaRequirement["media_type"][]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {MEDIA_TYPE_LABELS[k]}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="flex cursor-pointer items-center gap-3 text-sm text-tf-muted">
                  <input
                    type="checkbox"
                    checked={draftRequired}
                    onChange={(e) => setDraftRequired(e.target.checked)}
                    className="size-4 rounded border-tf-border bg-tf-bg text-tf-accent"
                  />
                  Obrigatório para o evento
                </label>

                <label className="block text-sm font-medium text-tf-muted">
                  Scene sugerida (opcional)
                  <select
                    value={draftSceneId}
                    onChange={(e) => setDraftSceneId(e.target.value)}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
                  >
                    <option value="">Nenhuma</option>
                    {sceneOptions.map((s) => (
                      <option key={s.scene_id} value={s.scene_id}>
                        #{s.sort_order} — {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-tf-muted">
                  Dica de extensões (opcional)
                  <input
                    type="text"
                    value={draftHint}
                    onChange={(e) => setDraftHint(e.target.value)}
                    maxLength={512}
                    placeholder=".mp4, .mov"
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg"
                  />
                </label>

                {panelError ? (
                  <p className="text-sm text-red-300/90" role="alert">
                    {panelError}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void savePanel()}
                    disabled={panelSaving}
                    className="rounded-tf bg-tf-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {panelSaving ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSelected()}
                    disabled={panelSaving}
                    className="rounded-tf border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200/90 hover:bg-red-950/30 disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !modalSubmitting) {
              setModalOpen(false);
              setModalError(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-tf-lg border border-tf-border bg-tf-mid p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
          >
            <h2
              id={modalTitleId}
              className="font-display text-lg font-semibold text-tf-fg"
            >
              Novo requisito de mídia
            </h2>
            <label className="mt-5 block text-sm font-medium text-tf-muted">
              Rótulo
              <input
                ref={labelInputRef}
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                maxLength={256}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-tf-muted">
              Tipo
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(
                    e.target.value as CloudMediaRequirement["media_type"],
                  )
                }
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
              >
                {(Object.keys(MEDIA_TYPE_LABELS) as CloudMediaRequirement["media_type"][]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {MEDIA_TYPE_LABELS[k]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm text-tf-muted">
              <input
                type="checkbox"
                checked={newRequired}
                onChange={(e) => setNewRequired(e.target.checked)}
                className="size-4 rounded border-tf-border bg-tf-bg text-tf-accent"
              />
              Obrigatório
            </label>
            {modalError ? (
              <p className="mt-4 text-sm text-red-300/90" role="alert">
                {modalError}
              </p>
            ) : null}
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!modalSubmitting) {
                    setModalOpen(false);
                    setModalError(null);
                  }
                }}
                className="rounded-tf border border-tf-border px-4 py-2 text-sm text-tf-muted"
                disabled={modalSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitNew()}
                disabled={modalSubmitting}
                className="rounded-tf bg-tf-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {modalSubmitting ? "Salvando…" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
