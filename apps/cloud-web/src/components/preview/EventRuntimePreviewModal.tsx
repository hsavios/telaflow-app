"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CloudDrawConfig, CloudMediaRequirement, CloudScene } from "@/lib/cloud-api";
import { SCENE_TYPE_LABELS } from "@/lib/scene-types";
import { fraseAtmosferaPreview } from "./previewAtmosphere";
import { PreviewDrawSimple } from "./PreviewDrawSimple";
import { PreviewMediaBlock } from "./PreviewMediaBlock";
import {
  drawConfigForScene,
  isSceneType,
  mediaRequirementForScene,
  orderedPreviewScenes,
} from "./runtimePreviewModel";

type Props = {
  open: boolean;
  onClose: () => void;
  eventName: string;
  scenes: CloudScene[];
  drawConfigs: CloudDrawConfig[];
  mediaRequirements: CloudMediaRequirement[];
};

export function EventRuntimePreviewModal({
  open,
  onClose,
  eventName,
  scenes,
  drawConfigs,
  mediaRequirements,
}: Props) {
  const roteiro = useMemo(() => orderedPreviewScenes(scenes), [scenes]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open, roteiro]);

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

  const atual = roteiro[index] ?? null;
  const proxima = index + 1 < roteiro.length ? roteiro[index + 1]! : null;

  const midia = useMemo(
    () => (atual ? mediaRequirementForScene(mediaRequirements, atual) : null),
    [atual, mediaRequirements],
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/75 p-0 sm:p-4"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-dvh w-full max-w-5xl flex-col overflow-hidden rounded-none border-0 border-tf-border bg-tf-mid shadow-2xl sm:max-h-[min(92dvh,880px)] sm:rounded-tf-lg sm:border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-runtime-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-tf-border bg-tf-bg/40 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tf-subtle">
              Palco · simulação
            </p>
            <h2
              id="preview-runtime-title"
              className="font-display text-lg font-semibold tracking-tight text-tf-fg sm:text-xl"
            >
              Simular evento
            </h2>
            <p className="mt-0.5 truncate text-xs text-tf-muted">{eventName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-tf border border-tf-border bg-tf-mid/60 px-3 py-1.5 text-sm font-medium text-tf-fg hover:bg-tf-mid"
          >
            Fechar
          </button>
        </header>

        {roteiro.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-tf-muted">
              Não há cenas <strong className="text-tf-fg">habilitadas</strong> neste evento.
              Ative pelo menos uma cena na aba Scenes para simular o roteiro.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-tf bg-tf-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Entendi
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row">
            <section
              className="preview-stage flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-5"
              aria-label="Cena atual no palco"
            >
              {atual ? (
                <>
                  <div className="preview-stage__header">
                    <span className="preview-stage__badge">
                      {isSceneType(atual.type)
                        ? SCENE_TYPE_LABELS[atual.type]
                        : atual.type}
                    </span>
                    <span className="preview-stage__step">
                      Cena {index + 1} de {roteiro.length}
                    </span>
                  </div>
                  <h3 className="preview-stage__title">{atual.name}</h3>
                  {atual.type !== "draw" && fraseAtmosferaPreview(atual.type) ? (
                    <p className="preview-stage__atmosphere">
                      {fraseAtmosferaPreview(atual.type)}
                    </p>
                  ) : null}

                  <div className="preview-stage__canvas mt-4 flex min-h-[12rem] flex-1 flex-col rounded-tf-lg border border-slate-600/40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:min-h-[14rem] sm:p-6">
                    {atual.type === "draw" && sorteio ? (
                      <PreviewDrawSimple drawConfig={sorteio} />
                    ) : atual.type === "draw" && !sorteio ? (
                      <div className="preview-stage-media preview-stage-media--empty">
                        <p className="preview-stage-media__title">Sorteio sem configuração</p>
                        <p className="preview-stage-media__hint">
                          Ligue um sorteio na aba Scenes e defina o registo na aba Sorteios.
                        </p>
                      </div>
                    ) : (
                      <PreviewMediaBlock requirement={midia} />
                    )}
                  </div>
                </>
              ) : null}
            </section>

            <aside className="flex w-full shrink-0 flex-col gap-4 border-t border-tf-border bg-tf-bg/25 p-4 sm:p-5 lg:w-80 lg:border-l lg:border-t-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-tf-subtle">
                  Próxima cena
                </p>
                {proxima ? (
                  <div className="mt-2 rounded-tf border border-tf-border bg-tf-mid/50 p-3">
                    <p className="font-medium text-tf-fg">{proxima.name}</p>
                    <p className="mt-1 text-xs text-tf-muted">
                      {isSceneType(proxima.type)
                        ? SCENE_TYPE_LABELS[proxima.type]
                        : proxima.type}{" "}
                      · ordem {proxima.sort_order}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-tf-faint">Fim do roteiro simulado.</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={irAnterior}
                  disabled={index <= 0}
                  className="flex-1 rounded-tf border border-tf-border bg-tf-mid/50 py-2.5 text-sm font-semibold text-tf-fg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={irProxima}
                  disabled={index >= roteiro.length - 1}
                  className="flex-1 rounded-tf bg-tf-accent py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-tf-subtle">
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
                            ? "bg-tf-accent-soft/40 text-tf-fg"
                            : "text-tf-muted hover:bg-tf-mid/50"
                        }`}
                      >
                        <span className="tabular-nums text-tf-faint">{i + 1}.</span>{" "}
                        <span className="font-medium">{s.name}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="text-[10px] leading-relaxed text-tf-faint">
                Teclado: ← → para navegar · Esc fecha. Isto não exporta nem corre o Player.
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
