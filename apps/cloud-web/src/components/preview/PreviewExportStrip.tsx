"use client";

import type { ExportReadinessBody } from "@/lib/cloud-api";
import { blockingLine, warningLine } from "@/lib/export-readiness-messages";

type ExportBanner = { tone: "ok" | "err"; text: string } | null;

type Props = {
  loading: boolean;
  data: ExportReadinessBody | null;
  error: string | null;
  onRefresh: () => void;
  onExport: () => void;
  exporting: boolean;
  exportBanner: ExportBanner;
};

const MAX_BLOCK = 5;
const MAX_WARN = 4;

export function PreviewExportStrip({
  loading,
  data,
  error,
  onRefresh,
  onExport,
  exporting,
  exportBanner,
}: Props) {
  return (
    <div className="preview-export-strip shrink-0 border-b border-white/[0.06] bg-black/35 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Export para o Player
          </p>
          {error ? (
            <p className="mt-1 text-sm text-red-300/90" role="alert">
              {error}
            </p>
          ) : loading && !data ? (
            <p className="mt-1 text-sm text-slate-500">Carregando prontidão…</p>
          ) : data ? (
            <div className="mt-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {data.ready ? (
                  <span className="inline-flex rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/35">
                    Pronto para exportar
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-100 ring-1 ring-red-400/35">
                    Com bloqueios
                  </span>
                )}
                {data.ready && (data.warnings?.length ?? 0) > 0 ? (
                  <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-100 ring-1 ring-amber-400/30">
                    Com avisos ({data.warnings!.length})
                  </span>
                ) : null}
                <span className="text-xs text-slate-500">
                  {data.scene_count} cenas · invariante de ordem{" "}
                  <span className={data.sort_order_ok === false ? "text-amber-200" : "text-slate-400"}>
                    {data.sort_order_ok === false ? "inválida" : "ok"}
                  </span>
                </span>
              </div>
              {!data.ready && data.blocking?.length ? (
                <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-300">
                  {data.blocking.slice(0, MAX_BLOCK).map((b, i) => (
                    <li key={`${b.code}-${i}`}>{blockingLine(b)}</li>
                  ))}
                </ul>
              ) : null}
              {data.warnings?.length ? (
                <ul className="list-inside list-disc space-y-0.5 text-[11px] text-slate-500">
                  {data.warnings.slice(0, MAX_WARN).map((w, i) => (
                    <li key={`${w.code}-${i}`}>{warningLine(w)}</li>
                  ))}
                  {data.warnings.length > MAX_WARN ? (
                    <li className="list-none text-slate-600">
                      +{data.warnings.length - MAX_WARN} aviso(s) na aba Exportação.
                    </li>
                  ) : null}
                </ul>
              ) : null}
              {data.ready ? (
                <p className="text-xs text-slate-500">
                  Gere o pack na Cloud e abra a pasta no TelaFlow Player para executar o evento.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Corrija os bloqueios nas abas Scenes, Mídia ou Sorteios e use «Atualizar» abaixo.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Sem dados de prontidão.</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Atualizando…" : "Atualizar prontidão"}
          </button>
          <button
            type="button"
            onClick={() => void onExport()}
            disabled={!data?.ready || exporting}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? "Exportando…" : "Exportar para Player"}
          </button>
        </div>
      </div>

      {exportBanner ? (
        <p
          className={`mt-3 text-xs font-medium ${
            exportBanner.tone === "ok" ? "text-emerald-300/95" : "text-red-300/95"
          }`}
          role="status"
        >
          {exportBanner.text}
        </p>
      ) : null}
    </div>
  );
}
