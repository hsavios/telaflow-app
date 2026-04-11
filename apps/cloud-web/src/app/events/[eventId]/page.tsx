"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import {
  createScene,
  fetchEvent,
  fetchScenes,
  getCloudApiBase,
  type CloudEvent,
  type CloudScene,
} from "@/lib/cloud-api";
import {
  SCENE_TYPE_LABELS,
  SCENE_TYPES,
  type SceneType,
} from "@/lib/scene-types";

type PageState = "loading" | "ready" | "not_found" | "error";

function sceneErrMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "missing_api_url") {
      return "Configure NEXT_PUBLIC_CLOUD_API_URL apontando para a Cloud API.";
    }
    if (err.message === "event_not_found") {
      return "Evento não encontrado.";
    }
    if (err.message.startsWith("event_failed:")) {
      return "Falha ao carregar o evento.";
    }
    if (err.message.startsWith("scenes_list_failed:")) {
      return "Falha ao carregar as scenes.";
    }
    if (err.message.startsWith("scene_create_failed:")) {
      return "Não foi possível criar a scene. Verifique os dados.";
    }
  }
  return "Algo deu errado. Tente de novo.";
}

export default function EventDetailPage() {
  const params = useParams<{ eventId: string | string[] }>();
  const rawId = params?.eventId;
  const segment = Array.isArray(rawId) ? rawId[0] : rawId;
  const eventId =
    typeof segment === "string" && segment.length > 0
      ? decodeURIComponent(segment)
      : "";

  const dialogTitleId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [pageState, setPageState] = useState<PageState>("loading");
  const [pageError, setPageError] = useState<string | null>(null);
  const [event, setEvent] = useState<CloudEvent | null>(null);
  const [scenes, setScenes] = useState<CloudScene[]>([]);
  const [scenesError, setScenesError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [sceneName, setSceneName] = useState("");
  const [sceneType, setSceneType] = useState<SceneType>("opening");
  const [sortOrder, setSortOrder] = useState(0);
  const [sceneEnabled, setSceneEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const apiConfigured = getCloudApiBase() !== null;

  const loadAll = useCallback(async () => {
    if (!eventId) {
      setPageState("error");
      setPageError("Identificador do evento inválido.");
      return;
    }
    if (!getCloudApiBase()) {
      setPageState("error");
      setPageError(
        "Configure NEXT_PUBLIC_CLOUD_API_URL apontando para a Cloud API.",
      );
      return;
    }
    setPageState("loading");
    setPageError(null);
    setScenesError(null);
    try {
      const ev = await fetchEvent(eventId);
      setEvent(ev);
      setPageState("ready");
    } catch (e) {
      if (e instanceof Error && e.message === "event_not_found") {
        setPageState("not_found");
        setPageError(null);
        setEvent(null);
        return;
      }
      setPageState("error");
      setPageError(sceneErrMessage(e));
      setEvent(null);
      return;
    }
    try {
      const list = await fetchScenes(eventId);
      setScenes(list);
    } catch (e) {
      setScenesError(sceneErrMessage(e));
      setScenes([]);
    }
  }, [eventId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!modalOpen) return;
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [modalOpen]);

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  const openModal = () => {
    setFormError(null);
    setSceneName("");
    setSceneType("opening");
    setSortOrder(scenes.length);
    setSceneEnabled(true);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setFormError(null);
  };

  const submitScene = async () => {
    const trimmed = sceneName.trim();
    if (trimmed.length < 1) {
      setFormError("Informe o nome da scene.");
      return;
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setFormError("Informe a ordem como número inteiro ≥ 0.");
      return;
    }
    if (!eventId || !apiConfigured) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await createScene(eventId, {
        sort_order: sortOrder,
        type: sceneType,
        name: trimmed,
        enabled: sceneEnabled,
      });
      setModalOpen(false);
      setSuccessMsg("Scene criada.");
      const list = await fetchScenes(eventId);
      setScenes(list);
      setScenesError(null);
    } catch (e) {
      setFormError(sceneErrMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const emptyScenes = pageState === "ready" && scenes.length === 0 && !scenesError;

  return (
    <div className="min-h-screen text-tf-muted">
      <AppHeader />

      <main
        id="conteudo-principal"
        className="mx-auto max-w-content px-6 pb-20 pt-8 lg:px-10"
      >
        <nav className="mb-8 text-sm" aria-label="Navegação secundária">
          <Link
            href="/events"
            className="text-tf-subtle transition-colors hover:text-tf-fg"
          >
            ← Eventos
          </Link>
        </nav>

        {successMsg ? (
          <p
            className="mb-6 rounded-tf border border-tf-teal/30 bg-tf-teal-soft/30 px-4 py-3 text-sm text-tf-fg"
            role="status"
          >
            {successMsg}
          </p>
        ) : null}

        {pageState === "loading" ? (
          <p className="text-sm text-tf-subtle" aria-live="polite">
            Carregando…
          </p>
        ) : null}

        {pageState === "not_found" ? (
          <div
            className="rounded-tf-lg border border-tf-border bg-tf-mid/40 px-6 py-10 text-center"
            role="alert"
          >
            <h1 className="font-display text-xl font-semibold text-tf-fg">
              Evento não encontrado
            </h1>
            <p className="mt-2 text-sm text-tf-muted">
              Verifique o link ou volte para a lista de eventos.
            </p>
            <Link
              href="/events"
              className="mt-6 inline-block text-sm font-medium text-tf-fg underline-offset-2 hover:underline"
            >
              Ir para Eventos
            </Link>
          </div>
        ) : null}

        {pageState === "error" && pageError ? (
          <div
            className="rounded-tf-lg border border-red-500/25 bg-red-950/20 px-5 py-4 text-sm text-red-100/90"
            role="alert"
          >
            <p className="font-medium text-red-100">Falha ao carregar</p>
            <p className="mt-1 text-red-100/80">{pageError}</p>
            {apiConfigured ? (
              <button
                type="button"
                onClick={() => void loadAll()}
                className="mt-4 text-sm font-medium text-tf-fg underline-offset-2 hover:underline"
              >
                Tentar de novo
              </button>
            ) : null}
          </div>
        ) : null}

        {pageState === "ready" && event ? (
          <>
            {/* Bloco 1 — cabeçalho do evento */}
            <header className="border-b border-tf-border pb-8">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-tf-fg md:text-4xl">
                {event.name}
              </h1>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-tf-faint">event_id</dt>
                  <dd className="mt-1 font-mono text-xs text-tf-muted">
                    {event.event_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-tf-faint">organization_id</dt>
                  <dd className="mt-1 font-mono text-xs text-tf-muted">
                    {event.organization_id}
                  </dd>
                </div>
              </dl>
            </header>

            {/* Bloco 2 — operação */}
            <section className="py-8" aria-labelledby="scenes-intro">
              <h2
                id="scenes-intro"
                className="font-display text-lg font-semibold text-tf-fg"
              >
                Scenes
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-tf-muted">
                As scenes definem a sequência visual do evento na Cloud — blocos
                ordenados que, no futuro, seguem para o pack e para o Player.
              </p>
            </section>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-tf-subtle">
                {scenes.length}{" "}
                {scenes.length === 1 ? "scene cadastrada" : "scenes cadastradas"}
              </p>
              <button
                type="button"
                onClick={openModal}
                className="shrink-0 rounded-tf bg-tf-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={!apiConfigured}
              >
                Criar scene
              </button>
            </div>

            {scenesError ? (
              <p className="mt-4 text-sm text-red-300/90" role="alert">
                {scenesError}
              </p>
            ) : null}

            {emptyScenes ? (
              <div className="mt-10 rounded-tf-lg border border-tf-border bg-tf-mid/35 px-8 py-12 text-center md:px-12">
                <h3 className="font-display text-lg font-semibold text-tf-fg">
                  Nenhuma scene cadastrada
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-tf-muted">
                  Comece pela ordem da experiência: abertura, blocos institucionais
                  ou patrocínio, intervalos e encerramento — tudo vinculado a este
                  evento.
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
            ) : null}

            {pageState === "ready" && scenes.length > 0 ? (
              <div className="mt-8 overflow-hidden rounded-tf-lg border border-tf-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-tf-border bg-tf-mid/80 text-tf-subtle">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ordem</th>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tf-border bg-tf-mid/25">
                    {scenes.map((sc) => {
                      const t = sc.type as SceneType;
                      const label = SCENE_TYPE_LABELS[t] ?? sc.type;
                      return (
                        <tr key={sc.scene_id}>
                          <td className="px-4 py-3.5 tabular-nums text-tf-muted">
                            {sc.sort_order}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-tf-fg">
                            {sc.name}
                          </td>
                          <td className="px-4 py-3.5 text-tf-muted">
                            <span className="text-tf-fg">{label}</span>
                            <span className="ml-2 font-mono text-xs text-tf-faint">
                              {sc.type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-tf-muted">
                            {sc.enabled ? "Habilitada" : "Desabilitada"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}
      </main>

      <AppFooter />

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-tf-lg border border-tf-border bg-tf-mid p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
          >
            <h2
              id={dialogTitleId}
              className="font-display text-lg font-semibold text-tf-fg"
            >
              Nova scene
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-tf-subtle">
              Tipos seguem o contrato do produto (inglês no payload; rótulos na
              interface em português).
            </p>

            <label className="mt-5 block text-sm font-medium text-tf-muted">
              Nome
              <input
                ref={nameInputRef}
                type="text"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                maxLength={512}
                autoComplete="off"
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none ring-tf-accent/40 placeholder:text-tf-faint focus:border-tf-accent/50 focus:ring-2"
                placeholder="Ex.: Vinheta de abertura"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-tf-muted">
              Tipo
              <select
                value={sceneType}
                onChange={(e) =>
                  setSceneType(e.target.value as SceneType)
                }
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none focus:border-tf-accent/50 focus:ring-2"
              >
                {SCENE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SCENE_TYPE_LABELS[t]} ({t})
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-tf-muted">
              Ordem na sequência
              <input
                type="number"
                min={0}
                step={1}
                value={sortOrder}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setSortOrder(Number.isNaN(v) ? 0 : v);
                }}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none focus:border-tf-accent/50 focus:ring-2"
              />
            </label>

            <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-tf-muted">
              <input
                type="checkbox"
                checked={sceneEnabled}
                onChange={(e) => setSceneEnabled(e.target.checked)}
                className="size-4 rounded border-tf-border bg-tf-bg text-tf-accent focus:ring-tf-accent/40"
              />
              Habilitada (incluída na sequência em runtime)
            </label>

            {formError ? (
              <p className="mt-4 text-sm text-red-300/90" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-tf border border-tf-border px-4 py-2 text-sm font-medium text-tf-muted transition-colors hover:border-tf-border hover:text-tf-fg"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitScene()}
                disabled={submitting}
                className="rounded-tf bg-tf-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
