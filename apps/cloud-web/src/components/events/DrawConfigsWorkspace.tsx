"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  createDrawConfig,
  deleteDrawConfig,
  updateDrawConfig,
  type CloudDrawConfig,
} from "@/lib/cloud-api";

function errText(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "draw_config_in_use") {
      return "Este sorteio ainda está vinculado a uma ou mais scenes. Remova o vínculo nas scenes antes de excluir.";
    }
    if (err.message === "draw_config_not_found") {
      return "Sorteio não encontrado.";
    }
    if (err.message.startsWith("draw_config_update_failed:")) {
      return "Não foi possível salvar o sorteio.";
    }
    if (err.message.startsWith("draw_config_create_failed:")) {
      return "Não foi possível criar o sorteio.";
    }
    if (err.message.startsWith("draw_config_delete_failed:")) {
      return "Não foi possível excluir o sorteio.";
    }
  }
  return "Algo deu errado. Tente de novo.";
}

type Props = {
  eventId: string;
  drawConfigs: CloudDrawConfig[];
  setDrawConfigs: (rows: CloudDrawConfig[]) => void;
  reloadDrawConfigs: () => Promise<void>;
  apiConfigured: boolean;
};

export function DrawConfigsWorkspace({
  eventId,
  drawConfigs,
  setDrawConfigs,
  reloadDrawConfigs,
  apiConfigured,
}: Props) {
  const modalTitleId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftMaxWinners, setDraftMaxWinners] = useState(1);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [panelSaving, setPanelSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMaxWinners, setNewMaxWinners] = useState(1);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const selected = drawConfigs.find((d) => d.draw_config_id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setDraftName("");
      return;
    }
    setDraftName(selected.name);
    setDraftMaxWinners(selected.max_winners);
    setDraftNotes(selected.notes ?? "");
    setDraftEnabled(selected.enabled);
    setPanelError(null);
  }, [selected]);

  useEffect(() => {
    if (!drawConfigs.some((d) => d.draw_config_id === selectedId)) {
      setSelectedId(null);
    }
  }, [drawConfigs, selectedId]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [banner]);

  const openModal = useCallback(() => {
    setModalError(null);
    setNewName("");
    setNewMaxWinners(1);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [modalOpen]);

  const submitNew = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 1) {
      setModalError("Informe o nome do sorteio.");
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await createDrawConfig(eventId, {
        name: trimmed,
        max_winners: newMaxWinners,
        notes: null,
        enabled: true,
      });
      setModalOpen(false);
      setBanner("Sorteio criado.");
      await reloadDrawConfigs();
    } catch (err) {
      setModalError(errText(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const savePanel = async () => {
    if (!selected) return;
    const trimmed = draftName.trim();
    if (trimmed.length < 1) {
      setPanelError("Nome obrigatório.");
      return;
    }
    setPanelSaving(true);
    setPanelError(null);
    try {
      const out = await updateDrawConfig(eventId, selected.draw_config_id, {
        name: trimmed,
        max_winners: draftMaxWinners,
        notes: draftNotes.trim() || null,
        enabled: draftEnabled,
      });
      setDrawConfigs(
        drawConfigs.map((d) =>
          d.draw_config_id === out.draw_config.draw_config_id ? out.draw_config : d,
        ),
      );
      setBanner("Sorteio salvo.");
      await reloadDrawConfigs();
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
        `Excluir o sorteio «${selected.name}»? Scenes não são alteradas; se alguma referenciar este id, a exclusão será bloqueada.`,
      )
    ) {
      return;
    }
    setPanelSaving(true);
    setPanelError(null);
    try {
      await deleteDrawConfig(eventId, selected.draw_config_id);
      setSelectedId(null);
      setBanner("Sorteio excluído.");
      await reloadDrawConfigs();
    } catch (err) {
      setPanelError(errText(err));
    } finally {
      setPanelSaving(false);
    }
  };

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
          Sorteios pertencem ao evento. A scene do tipo «sorteio» só escolhe um
          destes registros — a regra fica aqui, não no painel da scene.
        </p>
        <button
          type="button"
          onClick={openModal}
          className="shrink-0 rounded-tf bg-tf-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={!apiConfigured}
        >
          Novo sorteio
        </button>
      </div>

      {drawConfigs.length === 0 ? (
        <div className="rounded-tf-lg border border-tf-border bg-tf-mid/35 px-6 py-10 text-center">
          <h3 className="font-display text-lg font-semibold text-tf-fg">
            Nenhum sorteio cadastrado
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm text-tf-muted">
            Crie pelo menos um DrawConfig antes de vincular uma scene do tipo
            sorteio.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-6 rounded-tf border border-tf-border bg-tf-mid/60 px-5 py-2.5 text-sm font-semibold text-tf-fg disabled:opacity-50"
            disabled={!apiConfigured}
          >
            Criar primeiro sorteio
          </button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tf-subtle">
              Lista
            </h3>
            <ul className="flex flex-col gap-2" role="list">
              {drawConfigs.map((d) => (
                <li key={d.draw_config_id} role="listitem">
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.draw_config_id)}
                    className={`w-full rounded-tf border px-3 py-3 text-left text-sm transition-colors ${
                      selectedId === d.draw_config_id
                        ? "border-tf-accent/40 bg-tf-mid/50 ring-1 ring-tf-accent/25"
                        : "border-tf-border bg-tf-mid/40 hover:border-tf-border hover:bg-tf-mid/55"
                    }`}
                  >
                    <div className="font-medium text-tf-fg">{d.name}</div>
                    <div className="mt-1 font-mono text-xs text-tf-faint">
                      {d.draw_config_id}
                    </div>
                    {!d.enabled ? (
                      <span className="mt-1 inline-block text-xs text-tf-faint">
                        Desabilitado
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-tf-lg border border-tf-border bg-tf-mid/30 p-5 lg:min-h-[18rem]">
            {!selected ? (
              <p className="text-sm text-tf-muted">
                Selecione um sorteio na lista para editar nome, quantidade de
                ganhadores e notas internas.
              </p>
            ) : (
              <div className="space-y-5">
                <h3 className="font-display text-base font-semibold text-tf-fg">
                  Editar sorteio
                </h3>

                <label className="block text-sm font-medium text-tf-muted">
                  Nome
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    maxLength={256}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none focus:border-tf-accent/50 focus:ring-2 focus:ring-tf-accent/30"
                  />
                </label>

                <label className="block text-sm font-medium text-tf-muted">
                  Máximo de ganhadores
                  <input
                    type="number"
                    min={1}
                    max={999}
                    step={1}
                    value={draftMaxWinners}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setDraftMaxWinners(Number.isNaN(v) ? 1 : Math.min(999, Math.max(1, v)));
                    }}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
                  />
                </label>

                <label className="block text-sm font-medium text-tf-muted">
                  Notas (equipe)
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg outline-none focus:border-tf-accent/50"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-3 text-sm text-tf-muted">
                  <input
                    type="checkbox"
                    checked={draftEnabled}
                    onChange={(e) => setDraftEnabled(e.target.checked)}
                    className="size-4 rounded border-tf-border bg-tf-bg text-tf-accent"
                  />
                  Habilitado
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
              Novo sorteio
            </h2>
            <label className="mt-5 block text-sm font-medium text-tf-muted">
              Nome
              <input
                ref={nameInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={256}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
                placeholder="Ex.: Sorteio brinde ouro"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-tf-muted">
              Máximo de ganhadores
              <input
                type="number"
                min={1}
                max={999}
                value={newMaxWinners}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setNewMaxWinners(Number.isNaN(v) ? 1 : Math.min(999, Math.max(1, v)));
                }}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
              />
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
