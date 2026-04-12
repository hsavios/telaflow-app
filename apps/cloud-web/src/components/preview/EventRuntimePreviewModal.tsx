"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CloudDrawConfig,
  CloudMediaRequirement,
  CloudScene,
  ExportReadinessBody,
} from "@/lib/cloud-api";
import { SCENE_TYPE_LABELS } from "@/lib/scene-types";
import { fraseAtmosferaPreview } from "./previewAtmosphere";
import { PreviewDrawSimple } from "./PreviewDrawSimple";
import { PreviewExportStrip } from "./PreviewExportStrip";
import { PreviewMediaBlock } from "./PreviewMediaBlock";
import {
  drawConfigForScene,
  isSceneType,
  mediaRequirementForScene,
  orderedPreviewScenes,
} from "./runtimePreviewModel";

/** Intervalo fixo entre cenas na simulação automática (sem FSM). */
const AUTO_ADVANCE_MS = 4500;

type ExportBanner = { tone: "ok" | "err"; text: string } | null;

type Props = {
  open: boolean;
  onClose: () => void;
  eventName: string;
  scenes: CloudScene[];
  drawConfigs: CloudDrawConfig[];
  mediaRequirements: CloudMediaRequirement[];
  previewMediaSrcById: Record<string, string>;
  onPickLocalMediaFile: (mediaId: string, file: File) => void;
  onClearLocalMediaFile: (mediaId: string) => void;
  exportReadiness: ExportReadinessBody | null;
  exportReadinessLoading: boolean;
  exportReadinessError: string | null;
  onRefreshExportReadiness: () => void;
  onExportToPlayer: () => void;
  exportToPlayerRunning: boolean;
  exportToPlayerBanner: ExportBanner;
};

function resolveMediaSrc(
  req: CloudMediaRequirement | null,
  previewMediaSrcById: Record<string, string>,
): string | null {
  if (!req) return null;
  const local = previewMediaSrcById[req.media_id]?.trim();
  if (local) return local;
  const api = req.preview_url?.trim();
  return api || null;
}

export function EventRuntimePreviewModal({
  open,
  onClose,
  eventName,
  scenes,
  drawConfigs,
  mediaRequirements,
  previewMediaSrcById,
  onPickLocalMediaFile,
  onClearLocalMediaFile,
  exportReadiness,
  exportReadinessLoading,
  exportReadinessError,
  onRefreshExportReadiness,
  onExportToPlayer,
  exportToPlayerRunning,
  exportToPlayerBanner,
}: Props) {
  const roteiro = useMemo(() => orderedPreviewScenes(scenes), [scenes]);
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setAutoPlay(false);
  }, [open, roteiro]);

  useEffect(() => {
    if (!open || !autoPlay || roteiro.length === 0) {
      if (autoTimerRef.current != null) {
        window.clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => {
        if (i >= roteiro.length - 1) {
          setAutoPlay(false);
          return i;
        }
        return i + 1;
      });
    }, AUTO_ADVANCE_MS) as unknown as number;
    autoTimerRef.current = id;
    return () => {
      window.clearInterval(id);
      if (autoTimerRef.current === id) autoTimerRef.current = null;
    };
  }, [open, autoPlay, roteiro.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(roteiro.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, roteiro.length]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const atual = roteiro[index] ?? null;
  const proxima = index + 1 < roteiro.length ? roteiro[index + 1]! : null;

  const midia = useMemo(
    () => (atual ? mediaRequirementForScene(mediaRequirements, atual) : null),
    [atual, mediaRequirements],
  );

  const midiaResolved = useMemo(
    () => resolveMediaSrc(midia, previewMediaSrcById),
    [midia, previewMediaSrcById],
  );

  const hasLocalBlob = Boolean(
    midia && previewMediaSrcById[midia.media_id]?.startsWith("blob:"),
  );

  const sorteio = useMemo(
    () => (atual ? drawConfigForScene(drawConfigs, atual) : null),
    [atual, drawConfigs],
  );

  const irAnterior = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const irProxima = useCallback(() => {
    setIndex((i) => Math.min(roteiro.length - 1, i + 1));
  }, [roteiro.length]);

  const toggleAuto = useCallback(() => {
    setAutoPlay((v) => !v);
  }, []);

  if (!open) return null;

  return (
    <div
      className="preview-presentation-backdrop fixed inset-0 z-[70] flex flex-col justify-stretch p-0 sm:p-2 sm:py-4"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className="preview-presentation-shell mx-auto flex h-full max-h-dvh w-full max-w-[1180px] flex-col overflow-hidden sm:max-h-[min(96dvh,56rem)] sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-runtime-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.07] bg-slate-950/90 px-4 py-3 backdrop-blur-sm sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Pré-visualização do evento
            </p>
            <h2
              id="preview-runtime-title"
              className="mt-0.5 font-display text-lg font-semibold tracking-tight text-slate-50 sm:text-xl"
            >
              {eventName}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Modo apresentação — palco no browser. Próximo passo: exportar e executar no Player.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/10"
          >
            Sair
          </button>
        </header>

        <PreviewExportStrip
          loading={exportReadinessLoading}
          data={exportReadiness}
          error={exportReadinessError}
          onRefresh={onRefreshExportReadiness}
          onExport={onExportToPlayer}
          exporting={exportToPlayerRunning}
          exportBanner={exportToPlayerBanner}
        />

        {roteiro.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-slate-400">
              Não há cenas <strong className="text-slate-100">habilitadas</strong> neste evento.
              Ative pelo menos uma cena na aba Scenes para simular o roteiro.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-tf-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Entendi
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row">
            <section
              className="preview-stage preview-public-scene flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6"
              aria-label="Cena atual no palco"
            >
              {atual ? (
                <article
                  className={`preview-public-scene__article mx-auto w-full max-w-[960px] text-center ${
                    atual.type === "draw" ? "preview-public-scene__article--draw" : ""
                  }`}
                >
                  <header className="preview-public-scene__header">
                    <p className="preview-public-scene__kind">
                      {isSceneType(atual.type)
                        ? SCENE_TYPE_LABELS[atual.type]
                        : atual.type}
                    </p>
                    <p className="preview-public-scene__step">
                      Cena {index + 1} de {roteiro.length}
                    </p>
                    <h3 className="preview-public-scene__title">{atual.name}</h3>
                    {atual.type !== "draw" && fraseAtmosferaPreview(atual.type) ? (
                      <p className="preview-public-scene__atmosphere">
                        {fraseAtmosferaPreview(atual.type)}
                      </p>
                    ) : null}
                  </header>

                  <div
                    className={`preview-public-scene__canvas mt-5 flex min-h-[min(52vh,22rem)] flex-1 flex-col sm:min-h-[min(48vh,26rem)] ${
                      atual.type === "draw" ? "preview-public-scene__canvas--draw" : ""
                    }`}
                  >
                    {atual.type === "draw" && sorteio ? (
                      <PreviewDrawSimple drawConfig={sorteio} />
                    ) : atual.type === "draw" && !sorteio ? (
                      <div className="preview-stage-media preview-stage-media--empty">
                        <p className="preview-stage-media__title">Sorteio sem configuração</p>
                        <p className="preview-stage-media__hint">
                          Associe um sorteio na aba Scenes e configure-o na aba Sorteios.
                        </p>
                      </div>
                    ) : (
                      <PreviewMediaBlock
                        requirement={midia}
                        resolvedSrc={midiaResolved}
                        onPickLocalMediaFile={onPickLocalMediaFile}
                        onClearLocalMediaFile={onClearLocalMediaFile}
                        hasLocalBlob={hasLocalBlob}
                      />
                    )}
                  </div>
                </article>
              ) : null}
            </section>

            <aside className="flex w-full shrink-0 flex-col gap-4 border-t border-white/[0.06] bg-black/25 p-4 sm:p-5 lg:w-[22rem] lg:border-l lg:border-t-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Próxima cena
                </p>
                {proxima ? (
                  <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left">
                    <p className="font-medium text-slate-100">{proxima.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {isSceneType(proxima.type)
                        ? SCENE_TYPE_LABELS[proxima.type]
                        : proxima.type}{" "}
                      · ordem {proxima.sort_order}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Fim do roteiro simulado.</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={irAnterior}
                    disabled={index <= 0}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={irProxima}
                    disabled={index >= roteiro.length - 1}
                    className="flex-1 rounded-lg bg-tf-accent py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
                <button
                  type="button"
                  onClick={toggleAuto}
                  className={`w-full rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                    autoPlay
                      ? "border-amber-500/50 bg-amber-950/30 text-amber-100"
                      : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  }`}
                >
                  {autoPlay
                    ? `Parar automático (${AUTO_ADVANCE_MS / 1000}s/cena)`
                    : "Simular execução automática"}
                </button>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Roteiro
                </p>
                <ol className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs sm:max-h-48">
                  {roteiro.map((s, i) => (
                    <li key={s.scene_id}>
                      <button
                        type="button"
                        onClick={() => setIndex(i)}
                        className={`w-full rounded px-2 py-1.5 text-left transition-colors ${
                          i === index
                            ? "bg-tf-accent-soft/50 text-slate-50"
                            : "text-slate-500 hover:bg-white/5"
                        }`}
                      >
                        <span className="tabular-nums text-slate-600">{i + 1}.</span>{" "}
                        <span className="font-medium">{s.name}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="text-[10px] leading-relaxed text-slate-600">
                Teclado: ← → · Esc sai. Automático: {AUTO_ADVANCE_MS / 1000}s por cena.
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
