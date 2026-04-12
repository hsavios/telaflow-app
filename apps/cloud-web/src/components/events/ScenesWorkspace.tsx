"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  createScene,
  deleteScene,
  reorderScenes,
  updateScene,
  type CloudDrawConfig,
  type CloudMediaRequirement,
  type CloudScene,
} from "@/lib/cloud-api";
import {
  SCENE_TYPE_LABELS,
  SCENE_TYPES,
  type SceneType,
} from "@/lib/scene-types";

function nextFreeSortOrder(scenes: CloudScene[]): number {
  const used = new Set(scenes.map((s) => s.sort_order));
  let n = 0;
  while (used.has(n)) n += 1;
  return n;
}

function errText(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "sort_order_conflict") {
      return "Esta ordem já está em uso. Escolha outro número ou reordene pela lista.";
    }
    if (err.message.startsWith("scene_reorder_failed:")) {
      return "Não foi possível salvar a nova ordem.";
    }
    if (err.message.startsWith("scene_update_failed:")) {
      return "Não foi possível salvar alterações.";
    }
    if (err.message.startsWith("scene_delete_failed:")) {
      return "Não foi possível excluir a scene.";
    }
    if (err.message === "scene_not_found") {
      return "Scene não encontrada.";
    }
    if (err.message === "draw_scene_requires_draw_config") {
      return "Scene do tipo sorteio exige um DrawConfig do evento. Escolha na lista ou cadastre na aba Sorteios.";
    }
    if (err.message === "media_id_not_found") {
      return "O media_id não existe nos requisitos deste evento. Ajuste na aba Mídia.";
    }
    if (err.message === "draw_config_not_found") {
      return "O draw_config_id não existe neste evento. Ajuste na aba Sorteios.";
    }
  }
  return "Algo deu errado. Tente de novo.";
}

function SortableSceneRow({
  scene,
  selected,
  onSelect,
}: {
  scene: CloudScene;
  selected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.scene_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const t = scene.type as SceneType;
  const label = SCENE_TYPE_LABELS[t] ?? scene.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch gap-0 rounded-tf border border-tf-border bg-tf-mid/40 text-sm transition-shadow ${
        selected
          ? "border-tf-accent/40 ring-1 ring-tf-accent/25"
          : "hover:border-tf-border hover:bg-tf-mid/55"
      } ${isDragging ? "z-10 opacity-90 shadow-lg" : ""}`}
    >
      <button
        type="button"
        className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center border-r border-tf-border bg-tf-bg/40 text-tf-subtle hover:bg-tf-mid/60 active:cursor-grabbing"
        aria-label={`Reordenar: ${scene.name}`}
        {...attributes}
        {...listeners}
      >
        <span className="select-none text-base leading-none text-tf-faint">
          ⋮⋮
        </span>
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 px-3 py-3 text-left"
      >
        <div className="font-medium text-tf-fg">{scene.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-tf-muted">
          <span className="tabular-nums text-tf-subtle">#{scene.sort_order}</span>
          <span>{label}</span>
          <span className="font-mono text-tf-faint">{scene.type}</span>
          {!scene.enabled ? (
            <span className="rounded border border-tf-border px-1.5 py-0 text-tf-faint">
              Desabilitada
            </span>
          ) : null}
        </div>
      </button>
    </div>
  );
}

type Props = {
  eventId: string;
  scenes: CloudScene[];
  setScenes: (rows: CloudScene[]) => void;
  reloadScenes: () => Promise<void>;
  apiConfigured: boolean;
  drawConfigs: CloudDrawConfig[];
  mediaRequirements: CloudMediaRequirement[];
  onOpenSorteios: () => void;
  onOpenMidia: () => void;
};

export function ScenesWorkspace({
  eventId,
  scenes,
  setScenes,
  reloadScenes,
  apiConfigured,
  drawConfigs,
  mediaRequirements,
  onOpenSorteios,
  onOpenMidia,
}: Props) {
  const modalTitleId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<SceneType>("opening");
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [draftMediaId, setDraftMediaId] = useState("");
  const [draftDrawConfigId, setDraftDrawConfigId] = useState("");
  const [panelSaving, setPanelSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<SceneType>("opening");
  const [newSortOrder, setNewSortOrder] = useState(0);
  const [newEnabled, setNewEnabled] = useState(true);
  const [newMediaId, setNewMediaId] = useState("");
  const [newDrawConfigId, setNewDrawConfigId] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [reorderBusy, setReorderBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const selected = useMemo(
    () => scenes.find((s) => s.scene_id === selectedId) ?? null,
    [scenes, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setDraftName("");
      return;
    }
    setDraftName(selected.name);
    setDraftType(selected.type as SceneType);
    setDraftEnabled(selected.enabled);
    setDraftMediaId(selected.media_id?.trim() ?? "");
    setDraftDrawConfigId(selected.draw_config_id?.trim() ?? "");
    setPanelError(null);
  }, [selected]);

  useEffect(() => {
    if (!scenes.some((s) => s.scene_id === selectedId)) {
      setSelectedId(null);
    }
  }, [scenes, selectedId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sceneIds = useMemo(() => scenes.map((s) => s.scene_id), [scenes]);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = scenes.findIndex((s) => s.scene_id === active.id);
    const newIndex = scenes.findIndex((s) => s.scene_id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = [...scenes];
    const reordered = arrayMove(scenes, oldIndex, newIndex);
    const ids = reordered.map((s) => s.scene_id);
    setScenes(reordered);
    setReorderBusy(true);
    setBanner(null);
    try {
      const saved = await reorderScenes(eventId, ids);
      setScenes(saved);
    } catch (err) {
      setScenes(previous);
      setBanner(errText(err));
    } finally {
      setReorderBusy(false);
    }
  };

  const openModal = useCallback(() => {
    setModalError(null);
    setNewName("");
    setNewType("opening");
    setNewSortOrder(nextFreeSortOrder(scenes));
    setNewEnabled(true);
    setNewMediaId("");
    setNewDrawConfigId("");
    setModalOpen(true);
  }, [scenes]);

  useEffect(() => {
    if (!modalOpen) return;
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [modalOpen]);

  const submitNew = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 1) {
      setModalError("Informe o nome da scene.");
      return;
    }
    if (newType === "draw" && !newDrawConfigId.trim()) {
      setModalError(
        "Para tipo sorteio, escolha um DrawConfig existente ou cadastre um na aba Sorteios.",
      );
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await createScene(eventId, {
        sort_order: newSortOrder,
        type: newType,
        name: trimmed,
        enabled: newEnabled,
        ...(newMediaId.trim()
          ? { media_id: newMediaId.trim() }
          : {}),
        ...(newType === "draw"
          ? { draw_config_id: newDrawConfigId.trim() }
          : {}),
      });
      setModalOpen(false);
      setBanner("Scene criada.");
      await reloadScenes();
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
      await updateScene(eventId, selected.scene_id, {
        name: trimmed,
        type: draftType,
        enabled: draftEnabled,
        media_id: draftMediaId.trim() ? draftMediaId.trim() : null,
        draw_config_id:
          draftType === "draw"
            ? draftDrawConfigId.trim()
              ? draftDrawConfigId.trim()
              : null
            : null,
      });
      setBanner("Alterações salvas.");
      await reloadScenes();
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
        `Excluir a scene «${selected.name}»? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    setPanelSaving(true);
    setPanelError(null);
    try {
      await deleteScene(eventId, selected.scene_id);
      setSelectedId(null);
      setBanner("Scene excluída.");
      await reloadScenes();
    } catch (err) {
      setPanelError(errText(err));
    } finally {
      setPanelSaving(false);
    }
  };

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [banner]);

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
          {scenes.length}{" "}
          {scenes.length === 1 ? "scene" : "scenes"} · ordem única por evento
        </p>
        <button
          type="button"
          onClick={openModal}
          className="shrink-0 rounded-tf bg-tf-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={!apiConfigured}
        >
          Nova scene
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="rounded-tf-lg border border-tf-border bg-tf-mid/35 px-6 py-12 text-center md:px-10">
          <h3 className="font-display text-lg font-semibold text-tf-fg">
            Nenhuma scene cadastrada
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-tf-muted">
            Monte a sequência visual do evento: lista vertical à esquerda e
            edição à direita. Use o tipo antes de detalhar mídia ou sorteio em
            módulos dedicados.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-8 rounded-tf border border-tf-border bg-tf-mid/60 px-5 py-2.5 text-sm font-semibold text-tf-fg transition-colors hover:border-tf-accent/35 hover:bg-tf-mid disabled:opacity-50"
            disabled={!apiConfigured}
          >
            Criar primeira scene
          </button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tf-subtle">
              Sequência
            </h3>
            {reorderBusy ? (
              <p className="mb-2 text-xs text-tf-faint">Salvando ordem…</p>
            ) : null}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => void onDragEnd(e)}
            >
              <SortableContext
                items={sceneIds}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-2" role="list">
                  {scenes.map((sc) => (
                    <li key={sc.scene_id} role="listitem">
                      <SortableSceneRow
                        scene={sc}
                        selected={selectedId === sc.scene_id}
                        onSelect={() => setSelectedId(sc.scene_id)}
                      />
                    </li>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          <aside
            className="rounded-tf-lg border border-tf-border bg-tf-mid/30 p-5 lg:min-h-[20rem]"
            aria-label="Edição da scene"
          >
            {!selected ? (
              <p className="text-sm leading-relaxed text-tf-muted">
                Selecione uma scene na lista para editar nome, tipo e estado
                habilitada. A ordem na sequência muda arrastando pelo ícone à
                esquerda de cada linha.
              </p>
            ) : (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-tf-fg">
                    Editar scene
                  </h3>
                  <p className="mt-1 font-mono text-xs text-tf-faint">
                    {selected.scene_id}
                  </p>
                </div>

                <label className="block text-sm font-medium text-tf-muted">
                  Nome
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    maxLength={512}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none focus:border-tf-accent/50 focus:ring-2 focus:ring-tf-accent/30"
                  />
                </label>

                <label className="block text-sm font-medium text-tf-muted">
                  Tipo
                  <select
                    value={draftType}
                    onChange={(e) => {
                      const v = e.target.value as SceneType;
                      setDraftType(v);
                      if (v !== "draw") setDraftDrawConfigId("");
                    }}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none focus:border-tf-accent/50 focus:ring-2"
                  >
                    {SCENE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {SCENE_TYPE_LABELS[t]} ({t})
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="text-sm font-medium text-tf-muted">
                    Ordem na sequência
                  </span>
                  <p className="mt-2 tabular-nums text-sm text-tf-fg">
                    {selected.sort_order}
                    <span className="ml-2 text-xs text-tf-subtle">
                      (altere arrastando na lista)
                    </span>
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-3 text-sm text-tf-muted">
                  <input
                    type="checkbox"
                    checked={draftEnabled}
                    onChange={(e) => setDraftEnabled(e.target.checked)}
                    className="size-4 rounded border-tf-border bg-tf-bg text-tf-accent"
                  />
                  Habilitada
                </label>

                <div className="space-y-4 border-t border-tf-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-tf-subtle">
                    Vínculos (manifesto / sorteios)
                  </p>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs text-tf-faint" htmlFor={`${eventId}-media`}>
                        Mídia principal (slot)
                      </label>
                      <button
                        type="button"
                        onClick={onOpenMidia}
                        className="text-xs font-medium text-tf-accent hover:underline"
                      >
                        Abrir aba Mídia
                      </button>
                    </div>
                    <select
                      id={`${eventId}-media`}
                      value={draftMediaId}
                      onChange={(e) => setDraftMediaId(e.target.value)}
                      className="mt-1 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg"
                    >
                      <option value="">Nenhuma</option>
                      {mediaRequirements.map((m) => (
                        <option key={m.media_id} value={m.media_id}>
                          {m.label} ({m.media_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  {draftType === "draw" ? (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          className="text-xs text-tf-faint"
                          htmlFor={`${eventId}-draw`}
                        >
                          Sorteio (DrawConfig)
                        </label>
                        <button
                          type="button"
                          onClick={onOpenSorteios}
                          className="text-xs font-medium text-tf-accent hover:underline"
                        >
                          Abrir aba Sorteios
                        </button>
                      </div>
                      <select
                        id={`${eventId}-draw`}
                        value={draftDrawConfigId}
                        onChange={(e) => setDraftDrawConfigId(e.target.value)}
                        className="mt-1 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg"
                      >
                        <option value="">Selecione…</option>
                        {drawConfigs.map((d) => (
                          <option key={d.draw_config_id} value={d.draw_config_id}>
                            {d.name}
                            {d.number_range
                              ? ` · ${d.number_range.min}–${d.number_range.max}`
                              : ""}{" "}
                            ({d.draw_config_id})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs leading-relaxed text-tf-muted">
                        Intervalo de números e textos para o telão definem-se no registro deste sorteio
                        (aba Sorteios), não nesta scene — aqui só escolhe qual sorteio dispara no Player.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-tf-faint">
                      Só scenes do tipo sorteio escolhem DrawConfig. Regras do sorteio
                      permanecem na aba Sorteios.
                    </p>
                  )}
                </div>

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
                    {panelSaving ? "Salvando…" : "Salvar alterações"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSelected()}
                    disabled={panelSaving}
                    className="rounded-tf border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200/90 hover:bg-red-950/30 disabled:opacity-50"
                  >
                    Excluir scene
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
              Nova scene
            </h2>
            <p className="mt-2 text-xs text-tf-subtle">
              Escolha o tipo e a ordem inicial (única neste evento).
            </p>

            <label className="mt-5 block text-sm font-medium text-tf-muted">
              Nome
              <input
                ref={nameInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={512}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none focus:border-tf-accent/50 focus:ring-2"
                placeholder="Ex.: Abertura institucional"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-tf-muted">
              Tipo
              <select
                value={newType}
                onChange={(e) => {
                  const v = e.target.value as SceneType;
                  setNewType(v);
                  if (v !== "draw") setNewDrawConfigId("");
                }}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
              >
                {SCENE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SCENE_TYPE_LABELS[t]} ({t})
                  </option>
                ))}
              </select>
            </label>

            {newType === "draw" ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-tf-muted">
                    Sorteio (obrigatório)
                  </span>
                  <button
                    type="button"
                    onClick={onOpenSorteios}
                    className="text-xs font-medium text-tf-accent hover:underline"
                  >
                    Aba Sorteios
                  </button>
                </div>
                <select
                  value={newDrawConfigId}
                  onChange={(e) => setNewDrawConfigId(e.target.value)}
                  className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg"
                >
                  <option value="">Selecione um DrawConfig…</option>
                  {drawConfigs.map((d) => (
                    <option key={d.draw_config_id} value={d.draw_config_id}>
                      {d.name}
                      {d.number_range
                        ? ` · ${d.number_range.min}–${d.number_range.max}`
                        : ""}{" "}
                      ({d.draw_config_id})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <label className="mt-4 block text-sm font-medium text-tf-muted">
              Mídia principal (opcional)
              <select
                value={newMediaId}
                onChange={(e) => setNewMediaId(e.target.value)}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg"
              >
                <option value="">Nenhuma</option>
                {mediaRequirements.map((m) => (
                  <option key={m.media_id} value={m.media_id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-tf-muted">
              Ordem (inteiro ≥ 0, único por evento)
              <input
                type="number"
                min={0}
                step={1}
                value={newSortOrder}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setNewSortOrder(Number.isNaN(v) ? 0 : v);
                }}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
              />
            </label>

            <label className="mt-4 flex items-center gap-3 text-sm text-tf-muted">
              <input
                type="checkbox"
                checked={newEnabled}
                onChange={(e) => setNewEnabled(e.target.checked)}
                className="size-4 rounded border-tf-border bg-tf-bg text-tf-accent"
              />
              Habilitada
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
                className="rounded-tf border border-tf-border px-4 py-2 text-sm text-tf-muted hover:text-tf-fg"
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
