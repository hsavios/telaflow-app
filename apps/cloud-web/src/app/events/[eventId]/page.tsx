"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { DrawConfigsWorkspace } from "@/components/events/DrawConfigsWorkspace";
import { ExportReadinessPanel } from "@/components/events/ExportReadinessPanel";
import { MediaRequirementsWorkspace } from "@/components/events/MediaRequirementsWorkspace";
import { ScenesWorkspace } from "@/components/events/ScenesWorkspace";
import {
  fetchDrawConfigs,
  fetchEvent,
  fetchExportReadiness,
  fetchMediaRequirements,
  fetchScenes,
  getCloudApiBase,
  runPackExport,
  type CloudDrawConfig,
  type CloudEvent,
  type CloudMediaRequirement,
  type CloudScene,
  type ExportReadinessBody,
} from "@/lib/cloud-api";
import { recordPackExport } from "@/lib/export-activity";
import { rememberLastOpenedEvent } from "@/lib/cloud-prefs";
import { EventRuntimePreviewModal } from "@/components/preview/EventRuntimePreviewModal";
import { orderedPreviewScenes } from "@/components/preview/runtimePreviewModel";

type PageState = "loading" | "ready" | "not_found" | "error";

type EditorAba = "scenes" | "sorteios" | "midia" | "exportacao";

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
  }
  return "Algo deu errado. Tente de novo.";
}

const ABA_LABEL: Record<EditorAba, string> = {
  scenes: "Scenes",
  sorteios: "Sorteios",
  midia: "Mídia",
  exportacao: "Exportação",
};

export default function EventDetailPage() {
  const params = useParams<{ eventId: string | string[] }>();
  const rawId = params?.eventId;
  const segment = Array.isArray(rawId) ? rawId[0] : rawId;
  const eventId =
    typeof segment === "string" && segment.length > 0
      ? decodeURIComponent(segment)
      : "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [pageError, setPageError] = useState<string | null>(null);
  const [event, setEvent] = useState<CloudEvent | null>(null);
  const [scenes, setScenes] = useState<CloudScene[]>([]);
  const [drawConfigs, setDrawConfigs] = useState<CloudDrawConfig[]>([]);
  const [mediaRequirements, setMediaRequirements] = useState<
    CloudMediaRequirement[]
  >([]);
  const [scenesError, setScenesError] = useState<string | null>(null);
  const [aba, setAba] = useState<EditorAba>("scenes");
  const [previewOpen, setPreviewOpen] = useState(false);
  /** URLs blob/https por `media_id` — só no browser; usado na pré-visualização do palco. */
  const [previewMediaSrcById, setPreviewMediaSrcById] = useState<
    Record<string, string>
  >({});
  const previewMediaSrcRef = useRef(previewMediaSrcById);
  previewMediaSrcRef.current = previewMediaSrcById;

  const apiConfigured = getCloudApiBase() !== null;

  const podeSimularEvento = useMemo(
    () => orderedPreviewScenes(scenes).length > 0,
    [scenes],
  );

  const registerPreviewMediaFile = useCallback((mediaId: string, file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewMediaSrcById((prev) => {
      const old = prev[mediaId];
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return { ...prev, [mediaId]: url };
    });
  }, []);

  const clearPreviewMediaFile = useCallback((mediaId: string) => {
    setPreviewMediaSrcById((prev) => {
      const cur = prev[mediaId];
      if (cur?.startsWith("blob:")) URL.revokeObjectURL(cur);
      const rest = { ...prev };
      delete rest[mediaId];
      return rest;
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(previewMediaSrcRef.current).forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
    };
  }, []);

  const [previewReadiness, setPreviewReadiness] = useState<ExportReadinessBody | null>(
    null,
  );
  const [previewReadinessLoading, setPreviewReadinessLoading] = useState(false);
  const [previewReadinessError, setPreviewReadinessError] = useState<string | null>(
    null,
  );
  const [previewExporting, setPreviewExporting] = useState(false);
  const [previewExportBanner, setPreviewExportBanner] = useState<{
    tone: "ok" | "err";
    text: string;
  } | null>(null);

  const loadPreviewReadiness = useCallback(async () => {
    if (!eventId || !getCloudApiBase()) return;
    setPreviewReadinessLoading(true);
    setPreviewReadinessError(null);
    try {
      const r = await fetchExportReadiness(eventId);
      setPreviewReadiness(r);
    } catch {
      setPreviewReadiness(null);
      setPreviewReadinessError("Não foi possível carregar a prontidão para export.");
    } finally {
      setPreviewReadinessLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!previewOpen || !apiConfigured || !eventId) return;
    void loadPreviewReadiness();
  }, [previewOpen, apiConfigured, eventId, loadPreviewReadiness]);

  useEffect(() => {
    if (!previewOpen) setPreviewExportBanner(null);
  }, [previewOpen]);

  const reloadScenes = useCallback(async () => {
    if (!eventId || !getCloudApiBase()) return;
    const list = await fetchScenes(eventId);
    setScenes(list);
    setScenesError(null);
  }, [eventId]);

  const reloadDrawConfigs = useCallback(async () => {
    if (!eventId || !getCloudApiBase()) return;
    const list = await fetchDrawConfigs(eventId);
    setDrawConfigs(list);
  }, [eventId]);

  const reloadMediaRequirements = useCallback(async () => {
    if (!eventId || !getCloudApiBase()) return;
    const list = await fetchMediaRequirements(eventId);
    setMediaRequirements(list);
  }, [eventId]);

  const reloadEditorBundles = useCallback(async () => {
    if (!eventId || !getCloudApiBase()) return;
    await Promise.all([
      reloadScenes(),
      reloadDrawConfigs(),
      reloadMediaRequirements(),
    ]);
  }, [eventId, reloadDrawConfigs, reloadMediaRequirements, reloadScenes]);

  const handleExportFromPreview = useCallback(async () => {
    if (!eventId || !getCloudApiBase() || !event) return;
    setPreviewExporting(true);
    setPreviewExportBanner(null);
    try {
      const out = await runPackExport(eventId);
      recordPackExport({
        exportId: out.export_id,
        eventId,
        eventName: event.name,
      });
      setPreviewExportBanner({
        tone: "ok",
        text: `Pack gerado: ${out.export_id} — pasta: ${out.export_directory}`,
      });
      await reloadEditorBundles();
      await loadPreviewReadiness();
    } catch (e) {
      if (e instanceof Error && e.message === "export_not_ready") {
        setPreviewExportBanner({
          tone: "err",
          text: "Ainda há bloqueios — atualize a prontidão e ajuste o roteiro antes de exportar.",
        });
      } else {
        setPreviewExportBanner({
          tone: "err",
          text: "Não foi possível exportar. Tente de novo.",
        });
      }
    } finally {
      setPreviewExporting(false);
    }
  }, [eventId, event, reloadEditorBundles, loadPreviewReadiness]);

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
      await reloadEditorBundles();
    } catch (e) {
      setScenesError(sceneErrMessage(e));
      setScenes([]);
      setDrawConfigs([]);
      setMediaRequirements([]);
    }
  }, [eventId, reloadEditorBundles]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (pageState !== "ready" || !eventId || !event) return;
    rememberLastOpenedEvent(eventId);
  }, [pageState, eventId, event]);

  return (
    <div className="min-h-screen text-tf-muted">
      <AppHeader />

      <main
        id="conteudo-principal"
        className="mx-auto min-w-0 max-w-content px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-10"
      >
        <nav className="mb-8 text-sm" aria-label="Navegação secundária">
          <Link
            href="/events"
            className="text-tf-subtle transition-colors hover:text-tf-fg"
          >
            ← Eventos
          </Link>
        </nav>

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
            <header className="border-b border-tf-border pb-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-tf-subtle">
                    Editor do evento
                  </p>
                  <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-tf-fg md:text-4xl">
                    {event.name}
                  </h1>
                  <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-tf-faint">event_id</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-tf-muted">
                        {event.event_id}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-tf-faint">organization_id</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-tf-muted">
                        {event.organization_id}
                      </dd>
                    </div>
                  </dl>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  disabled={!apiConfigured || !podeSimularEvento}
                  title={
                    !podeSimularEvento
                      ? "Ative pelo menos uma cena no roteiro para abrir a simulação."
                      : "Abrir palco simulado no browser (sem export)"
                  }
                  className="shrink-0 rounded-tf border border-violet-500/35 bg-gradient-to-br from-violet-600/90 to-violet-800/95 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Simular evento
                </button>
              </div>
            </header>

            <EventRuntimePreviewModal
              open={previewOpen}
              onClose={() => setPreviewOpen(false)}
              eventName={event.name}
              scenes={scenes}
              drawConfigs={drawConfigs}
              mediaRequirements={mediaRequirements}
              previewMediaSrcById={previewMediaSrcById}
              onPickLocalMediaFile={registerPreviewMediaFile}
              onClearLocalMediaFile={clearPreviewMediaFile}
              exportReadiness={previewReadiness}
              exportReadinessLoading={previewReadinessLoading}
              exportReadinessError={previewReadinessError}
              onRefreshExportReadiness={() => void loadPreviewReadiness()}
              onExportToPlayer={() => void handleExportFromPreview()}
              exportToPlayerRunning={previewExporting}
              exportToPlayerBanner={previewExportBanner}
            />

            <nav
              className="tf-scroll-touch mt-6 flex gap-2 overflow-x-auto border-b border-tf-border pb-3 sm:mt-8 sm:flex-wrap sm:overflow-visible sm:pb-4"
              aria-label="Módulos do editor"
            >
              {(Object.keys(ABA_LABEL) as EditorAba[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAba(key)}
                  className={`shrink-0 rounded-tf px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                    aba === key
                      ? "bg-tf-accent text-white"
                      : "border border-tf-border bg-tf-mid/40 text-tf-muted hover:border-tf-accent/30 hover:text-tf-fg"
                  }`}
                >
                  {ABA_LABEL[key]}
                </button>
              ))}
            </nav>

            {scenesError ? (
              <p className="mb-4 mt-6 text-sm text-red-300/90" role="alert">
                {scenesError}
              </p>
            ) : null}

            {aba === "scenes" ? (
              <section className="py-8" aria-labelledby="scenes-intro">
                <h2
                  id="scenes-intro"
                  className="font-display text-lg font-semibold text-tf-fg"
                >
                  Scenes
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-tf-muted">
                  Lista mestra ordenável; vínculos de mídia e sorteio são
                  escolhas por id, com cadastro nas abas Mídia e Sorteios — sem
                  misturar regras de sorteio nesta tela.
                </p>
                <ScenesWorkspace
                  eventId={eventId}
                  scenes={scenes}
                  setScenes={setScenes}
                  reloadScenes={reloadEditorBundles}
                  apiConfigured={apiConfigured}
                  drawConfigs={drawConfigs}
                  mediaRequirements={mediaRequirements}
                  onOpenSorteios={() => setAba("sorteios")}
                  onOpenMidia={() => setAba("midia")}
                />
              </section>
            ) : null}

            {aba === "sorteios" ? (
              <section className="py-8" aria-labelledby="draw-intro">
                <h2
                  id="draw-intro"
                  className="font-display text-lg font-semibold text-tf-fg"
                >
                  Sorteios (DrawConfig)
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-tf-muted">
                  Cada sorteio tem nome, intervalo numérico opcional, textos para o telão
                  (manchete, instruções, rótulo do resultado) e notas internas. A scene do tipo
                  sorteio só referencia o id — a regra fica aqui.
                </p>
                <DrawConfigsWorkspace
                  eventId={eventId}
                  drawConfigs={drawConfigs}
                  setDrawConfigs={setDrawConfigs}
                  reloadDrawConfigs={reloadEditorBundles}
                  apiConfigured={apiConfigured}
                />
              </section>
            ) : null}

            {aba === "midia" ? (
              <section className="py-8" aria-labelledby="media-intro">
                <h2
                  id="media-intro"
                  className="font-display text-lg font-semibold text-tf-fg"
                >
                  Requisitos de mídia
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-tf-muted">
                  Manifesto por evento: tipos, obrigatoriedade e{" "}
                  <span className="font-mono text-tf-subtle">media_id</span>{" "}
                  estável. Sem upload para a Cloud no MVP.
                </p>
                <MediaRequirementsWorkspace
                  eventId={eventId}
                  scenes={scenes}
                  mediaRequirements={mediaRequirements}
                  setMediaRequirements={setMediaRequirements}
                  reloadMediaRequirements={reloadEditorBundles}
                  apiConfigured={apiConfigured}
                />
              </section>
            ) : null}

            {aba === "exportacao" ? (
              <section className="py-8" aria-labelledby="export-intro">
                <h2
                  id="export-intro"
                  className="font-display text-lg font-semibold text-tf-fg"
                >
                  Prontidão para export
                </h2>
                <ExportReadinessPanel
                  eventId={eventId}
                  apiConfigured={apiConfigured}
                />
              </section>
            ) : null}
          </>
        ) : null}
      </main>

      <AppFooter />
    </div>
  );
}
