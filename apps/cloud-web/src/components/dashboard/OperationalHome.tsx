"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchEvents,
  fetchExportReadiness,
  getCloudApiBase,
  runPackExport,
  type CloudEvent,
  type ExportReadinessBody,
} from "@/lib/cloud-api";
import { getLastOpenedEventId, rememberLastOpenedEvent } from "@/lib/cloud-prefs";
import { blockingLine, warningLine } from "@/lib/export-readiness-messages";
import {
  countExportsSince,
  lastExportForEvent,
  readRecentExports,
  recordPackExport,
} from "@/lib/export-activity";

type LoadState = "idle" | "loading" | "ok" | "error";

type DashboardRow = {
  event: CloudEvent;
  readiness: ExportReadinessBody | null;
  readinessError: boolean;
};

const MS_7D = 7 * 24 * 60 * 60 * 1000;

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatWhen(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return dateFmt.format(t);
}

/** Texto curto de status operacional (sem jargão de API). */
function statusOperacional(r: ExportReadinessBody | null): {
  text: string;
  tone: "ok" | "warn" | "bad" | "muted";
} {
  if (!r) return { text: "—", tone: "muted" };
  if (r.ready && r.warnings.length === 0) {
    return { text: "Pronto", tone: "ok" };
  }
  if (r.ready && r.warnings.length > 0) {
    return { text: "Pronto com avisos", tone: "warn" };
  }
  if (r.blocking.length > 0) {
    return { text: "Com bloqueios", tone: "bad" };
  }
  return { text: "Em preparação", tone: "warn" };
}

const statusToneClass = {
  ok: "border-tf-teal/30 bg-tf-teal-soft/25 text-tf-teal",
  warn: "border-amber-500/30 bg-amber-950/30 text-amber-100/90",
  bad: "border-red-500/30 bg-red-950/25 text-red-100/90",
  muted: "border-tf-border bg-tf-mid/30 text-tf-subtle",
} as const;

function formatListError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "missing_api_url") {
      return "Configure NEXT_PUBLIC_CLOUD_API_URL apontando para a Cloud API.";
    }
    if (err.message.startsWith("list_failed:")) {
      return "Não foi possível carregar os eventos.";
    }
  }
  return "Falha ao carregar a página.";
}

function KpiChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-tf border border-tf-border bg-tf-mid/35 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-tf-faint">
        {label}
      </p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular-nums text-tf-fg">
        {value}
      </p>
    </div>
  );
}

function resolveFocoEventId(
  rows: DashboardRow[],
  lastOpened: string | null,
  manualId: string | null,
): string | null {
  const ids = new Set(rows.map((r) => r.event.event_id));
  if (manualId && ids.has(manualId)) return manualId;
  if (lastOpened && ids.has(lastOpened)) return lastOpened;
  return rows[0]?.event.event_id ?? null;
}

export function OperationalHome() {
  const apiConfigured = getCloudApiBase() !== null;
  const [loadState, setLoadState] = useState<LoadState>(() =>
    apiConfigured ? "loading" : "error",
  );
  const [listError, setListError] = useState<string | null>(() =>
    apiConfigured ? null : "Configure NEXT_PUBLIC_CLOUD_API_URL.",
  );
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [focoManualId, setFocoManualId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportBanner, setExportBanner] = useState<{
    tone: "ok" | "err";
    text: string;
    action?: {
      label: string;
      url: string;
    };
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!getCloudApiBase()) {
      setLoadState("error");
      setListError("Configure NEXT_PUBLIC_CLOUD_API_URL.");
      return;
    }
    setLoadState("loading");
    setListError(null);
    try {
      const events = await fetchEvents();
      const newestFirst = [...events].reverse();
      const merged: DashboardRow[] = await Promise.all(
        newestFirst.map(async (event) => {
          try {
            const readiness = await fetchExportReadiness(event.event_id);
            return { event, readiness, readinessError: false };
          } catch {
            return { event, readiness: null, readinessError: true };
          }
        }),
      );
      setRows(merged);
      setLoadState("ok");
    } catch (e) {
      setLoadState("error");
      setListError(formatListError(e));
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!exportBanner) return;
    const t = window.setTimeout(() => setExportBanner(null), 6000);
    return () => window.clearTimeout(t);
  }, [exportBanner]);

  const lastOpened = getLastOpenedEventId();
  const focoEventId = useMemo(
    () => resolveFocoEventId(rows, lastOpened, focoManualId),
    [rows, lastOpened, focoManualId],
  );

  const focoRow = useMemo(
    () => rows.find((r) => r.event.event_id === focoEventId) ?? null,
    [rows, focoEventId],
  );

  const now = Date.now();
  const kpis = {
    active: rows.length,
    prontosExportar: rows.filter((r) => r.readiness?.ready).length,
    comBloqueios: rows.filter((r) => (r.readiness?.blocking.length ?? 0) > 0)
      .length,
    exportsRecentes: countExportsSince(now - MS_7D),
  };

  const attention = useMemo(() => {
    const blocks: { eventName: string; eventId: string; line: string }[] = [];
    const warns: { eventName: string; eventId: string; line: string }[] = [];
    for (const r of rows) {
      if (!r.readiness) continue;
      for (const b of r.readiness.blocking) {
        blocks.push({
          eventName: r.event.name,
          eventId: r.event.event_id,
          line: blockingLine(b),
        });
      }
      for (const w of r.readiness.warnings) {
        warns.push({
          eventName: r.event.name,
          eventId: r.event.event_id,
          line: warningLine(w),
        });
      }
    }
    return {
      blocks: blocks.slice(0, 8),
      warns: warns.slice(0, 6),
    };
  }, [rows]);

  const recentExports = readRecentExports().slice(0, 6);

  const lastOpenedValid =
    lastOpened && rows.some((r) => r.event.event_id === lastOpened);

  const onExport = async (ev: CloudEvent, archiveZip = false) => {
    if (!getCloudApiBase()) return;
    setExportingId(ev.event_id);
    setExportBanner(null);
    try {
      const out = await runPackExport(ev.event_id, { archiveZip });
      recordPackExport({
        exportId: out.export_id,
        eventId: ev.event_id,
        eventName: ev.name,
      });
      const zipPart =
        archiveZip && out.zip_path ? ` · ZIP: ${out.zip_path}` : archiveZip ? " · ZIP gerado no servidor." : "";
      setExportBanner({
        tone: "ok",
        text: `Pack gerado: ${ev.name} · ${out.export_id}${zipPart}`,
      });

      // Mostrar botão de download para ZIP se disponível
      if (archiveZip && out.zip_path) {
        setExportBanner({
          tone: "ok",
          text: `ZIP de "${ev.name}" pronto! Clique para baixar.`,
          action: {
            label: "Baixar ZIP",
            url: `/api/exports/${out.export_id}/zip`
          }
        });
      } else if (archiveZip) {
        // ZIP solicitado mas não disponível ainda
        setExportBanner({
          tone: "ok",
          text: `Exportação "${ev.name}" concluída. ZIP sendo gerado...`,
        });
        // Tentar novamente após alguns segundos
        setTimeout(async () => {
          try {
            const readiness = await fetchExportReadiness(ev.event_id);
            if (readiness.ready) {
              setExportBanner({
                tone: "ok",
                text: `ZIP de "${ev.name}" disponível! Atualize a página.`,
              });
            }
          } catch {
            /* mantém estado anterior */
          }
        }, 3000);
      } else {
        // Mostrar estado pós-exportação para pasta
        setTimeout(() => {
          setExportBanner({
            tone: "ok",
            text: `Pacote "${ev.name}" pronto para abrir no Player`,
          });
        }, 1000);
      }
      try {
        const readiness = await fetchExportReadiness(ev.event_id);
        setRows((prev) =>
          prev.map((row) =>
            row.event.event_id === ev.event_id
              ? { ...row, readiness, readinessError: false }
              : row,
          ),
        );
      } catch {
        /* mantém linha anterior */
      }
    } catch (e) {
      if (e instanceof Error && e.message === "export_not_ready") {
        setExportBanner({
          tone: "err",
          text: `${ev.name}: resolva os bloqueios antes de exportar o pack.`,
        });
      } else {
        setExportBanner({
          tone: "err",
          text: `${ev.name}: não foi possível exportar o pack. Tente de novo.`,
        });
      }
    } finally {
      setExportingId(null);
    }
  };

  const setFocoFromRow = (eventId: string) => {
    setFocoManualId(eventId);
    rememberLastOpenedEvent(eventId);
  };

  return (
    <main
      id="conteudo-principal"
      className="mx-auto min-w-0 max-w-content px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-5 md:pt-6 lg:px-10"
    >
      <section
        id="visao-geral"
        className="scroll-mt-28"
        aria-labelledby="dash-titulo"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1
            id="dash-titulo"
            className="font-display text-lg font-semibold tracking-tight text-tf-fg md:text-xl"
          >
            Operação
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-tf border border-tf-border bg-tf-mid/50 px-3 py-2 text-xs font-semibold text-tf-fg sm:text-sm"
            >
              Novo evento
            </Link>
            {lastOpenedValid && lastOpened ? (
              <Link
                href={`/events/${encodeURIComponent(lastOpened)}`}
                onClick={() => rememberLastOpenedEvent(lastOpened)}
                className="inline-flex items-center justify-center rounded-tf bg-tf-accent px-3 py-2 text-xs font-semibold text-white sm:text-sm"
              >
                Último evento
              </Link>
            ) : (
              <span
                className="inline-flex cursor-not-allowed items-center justify-center rounded-tf border border-tf-border px-3 py-2 text-xs font-medium text-tf-faint sm:text-sm"
                title="Abra um evento na lista para memorizar o atalho."
              >
                Último evento
              </span>
            )}
          </div>
        </div>

        {exportBanner ? (
          <div
            className={`mt-3 rounded-tf border px-4 py-3 text-sm ${exportBanner.tone === "ok"
              ? "border-tf-teal/30 bg-tf-teal-soft/25 text-tf-teal"
              : "border-red-500/30 bg-red-950/25 text-red-100/90"
              }`}
            role="status"
          >
            <p className="font-medium">{exportBanner.text}</p>
            {exportBanner.action && (
              <a
                href={exportBanner.action.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center rounded-tf bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
              >
                {exportBanner.action.label}
              </a>
            )}
          </div>
        ) : null}

        {loadState === "loading" ? (
          <p className="mt-4 text-xs text-tf-subtle sm:text-sm" aria-live="polite">
            Carregando eventos…
          </p>
        ) : null}

        {loadState === "error" && listError ? (
          <div
            className="mt-4 rounded-tf-lg border border-red-500/25 bg-red-950/20 px-4 py-3 text-sm text-red-100/90"
            role="alert"
          >
            <p className="font-medium">Algo deu errado</p>
            <p className="mt-1 text-red-100/80">{listError}</p>
            {apiConfigured ? (
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="mt-3 text-sm font-medium text-tf-fg underline-offset-2 hover:underline"
              >
                Tentar de novo
              </button>
            ) : null}
          </div>
        ) : null}

        {loadState === "ok" ? (
          <div className="mt-5 flex min-w-0 flex-col gap-8 xl:flex-row xl:items-start xl:gap-10">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-tf-border pb-3">
                <h2 className="font-display text-base font-semibold text-tf-fg md:text-lg">
                  Seus eventos
                </h2>
                <p className="max-w-[12rem] text-right text-[11px] leading-snug text-tf-faint sm:max-w-none sm:text-left">
                  Toque na linha para definir o evento em foco
                </p>
              </div>

              {rows.length === 0 ? (
                <div className="mt-6 rounded-tf-lg border border-tf-border bg-tf-mid/30 px-6 py-10 text-center">
                  <p className="text-sm font-medium text-tf-fg">
                    Nenhum evento ainda
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-tf-muted">
                    Crie um evento e volte aqui para acompanhar o pack.
                  </p>
                  <Link
                    href="/events"
                    className="mt-6 inline-flex rounded-tf bg-tf-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Criar evento
                  </Link>
                </div>
              ) : (
                <>
                  <p
                    className="mt-3 text-[11px] text-tf-faint md:hidden"
                    aria-hidden="true"
                  >
                    Deslize a tabela horizontalmente para ver todas as colunas.
                  </p>
                  <div className="tf-scroll-touch mt-2 overflow-x-auto rounded-tf-lg border border-tf-border shadow-[0_0_0_1px_rgba(248,250,252,0.02)_inset]">
                    <table className="w-full min-w-[34rem] text-left text-sm sm:min-w-[40rem] lg:min-w-[48rem]">
                      <thead className="border-b border-tf-border bg-tf-mid/90 text-[11px] font-medium uppercase tracking-wide text-tf-subtle">
                        <tr>
                          <th className="px-3 py-2.5">Nome</th>
                          <th className="px-3 py-2.5 tabular-nums">Cenas</th>
                          <th className="px-3 py-2.5 tabular-nums">Sorteios</th>
                          <th className="px-3 py-2.5 tabular-nums">Mídias</th>
                          <th className="px-3 py-2.5">Pronto para exportar</th>
                          <th className="px-3 py-2.5">Última exportação</th>
                          <th className="px-3 py-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-tf-border bg-tf-mid/15">
                        {rows.map(({ event: ev, readiness: r, readinessError }) => {
                          const st = statusOperacional(r);
                          const last = lastExportForEvent(ev.event_id);
                          const podeExportar = Boolean(r?.ready);
                          const isFoco = ev.event_id === focoEventId;
                          return (
                            <tr
                              key={ev.event_id}
                              onClick={() => setFocoFromRow(ev.event_id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setFocoFromRow(ev.event_id);
                                }
                              }}
                              tabIndex={0}
                              className={`cursor-pointer outline-none transition-colors hover:bg-tf-mid/40 focus-visible:bg-tf-mid/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tf-accent/40 ${isFoco ? "bg-tf-accent-soft/15" : ""
                                }`}
                              aria-selected={isFoco}
                            >
                              <td className="max-w-[13rem] px-3 py-2.5">
                                <span className="font-medium text-tf-fg">
                                  {ev.name}
                                </span>
                                {readinessError ? (
                                  <span className="mt-0.5 block text-[11px] text-amber-200/85">
                                    Status indisponível
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2.5 tabular-nums text-tf-muted">
                                {r?.scene_count ?? "—"}
                              </td>
                              <td className="px-3 py-2.5 tabular-nums text-tf-muted">
                                {r?.draw_config_count ?? "—"}
                              </td>
                              <td className="px-3 py-2.5 tabular-nums text-tf-muted">
                                {r?.media_requirement_count ?? "—"}
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusToneClass[st.tone]}`}
                                >
                                  {st.text}
                                </span>
                              </td>
                              <td
                                className="px-3 py-2.5 text-tf-muted"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {last ? (
                                  <span className="text-[11px] leading-snug">
                                    {formatWhen(last.at)}
                                  </span>
                                ) : (
                                  <span className="text-tf-faint">—</span>
                                )}
                              </td>
                              <td
                                className="px-3 py-2.5 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Link
                                    href={`/events/${encodeURIComponent(ev.event_id)}`}
                                    onClick={() =>
                                      rememberLastOpenedEvent(ev.event_id)
                                    }
                                    className="text-xs font-medium text-tf-accent sm:text-sm"
                                  >
                                    Abrir
                                  </Link>
                                  <button
                                    type="button"
                                    disabled={
                                      !podeExportar ||
                                      exportingId === ev.event_id ||
                                      readinessError
                                    }
                                    onClick={() => void onExport(ev, false)}
                                    className="text-xs font-medium text-tf-fg underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-tf-faint disabled:no-underline sm:text-sm"
                                    title={
                                      podeExportar
                                        ? "Gerar pack no servidor"
                                        : "Resolva os bloqueios para exportar o pack"
                                    }
                                  >
                                    {exportingId === ev.event_id
                                      ? "Exportando…"
                                      : "Exportar para Player"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      !podeExportar ||
                                      exportingId === ev.event_id ||
                                      readinessError
                                    }
                                    onClick={() => void onExport(ev, true)}
                                    className="text-xs font-medium text-tf-accent underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-tf-faint disabled:no-underline sm:text-sm"
                                    title="Gera também ficheiro .zip junto ao export"
                                  >
                                    ZIP
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {rows.length > 0 ? (
              <aside className="w-full min-w-0 shrink-0 space-y-5 border-t border-tf-border pt-6 xl:w-[min(100%,320px)] xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-tf-faint">
                    Resumo
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <KpiChip label="Eventos ativos" value={kpis.active} />
                    <KpiChip
                      label="Prontos para exportar"
                      value={kpis.prontosExportar}
                    />
                    <KpiChip label="Com bloqueios" value={kpis.comBloqueios} />
                    <KpiChip
                      label="Exports recentes"
                      value={kpis.exportsRecentes}
                    />
                  </div>
                  <p className="mt-2 text-[10px] leading-snug text-tf-faint">
                    Exports recentes: últimos 7 dias, neste dispositivo.
                  </p>
                </div>

                {focoRow ? (
                  <div className="rounded-tf-lg border border-tf-accent/25 bg-gradient-to-b from-tf-accent-soft/20 to-tf-mid/40 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-tf-subtle">
                      Evento em foco
                    </p>
                    <p className="mt-2 font-display text-base font-semibold text-tf-fg">
                      {focoRow.event.name}
                    </p>
                    <div className="mt-2">
                      {(() => {
                        const st = statusOperacional(focoRow.readiness);
                        return (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusToneClass[st.tone]}`}
                          >
                            {st.text}
                          </span>
                        );
                      })()}
                    </div>
                    {focoRow.readiness && !focoRow.readinessError ? (
                      <p className="mt-3 text-xs leading-relaxed text-tf-muted">
                        <span className="font-medium text-tf-fg">
                          {focoRow.readiness.blocking.length}
                        </span>{" "}
                        {focoRow.readiness.blocking.length === 1
                          ? "bloqueio"
                          : "bloqueios"}
                        {" · "}
                        <span className="font-medium text-tf-fg">
                          {focoRow.readiness.warnings.length}
                        </span>{" "}
                        {focoRow.readiness.warnings.length === 1
                          ? "aviso"
                          : "avisos"}
                      </p>
                    ) : focoRow.readinessError ? (
                      <p className="mt-3 text-xs text-amber-200/85">
                        Não foi possível carregar o status neste momento.
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-tf-muted">—</p>
                    )}
                    <div className="mt-3 text-xs text-tf-subtle">
                      <span className="text-tf-faint">Última exportação: </span>
                      {(() => {
                        const last = lastExportForEvent(focoRow.event.event_id);
                        return last ? (
                          <>
                            {formatWhen(last.at)}
                            <span className="mt-0.5 block font-mono text-[10px] text-tf-faint">
                              {last.exportId}
                            </span>
                          </>
                        ) : (
                          <span className="text-tf-muted">
                            Ainda não exportado neste dispositivo.
                          </span>
                        );
                      })()}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Link
                        href={`/events/${encodeURIComponent(focoRow.event.event_id)}`}
                        onClick={() =>
                          rememberLastOpenedEvent(focoRow.event.event_id)
                        }
                        className="inline-flex flex-1 items-center justify-center rounded-tf bg-tf-accent px-3 py-2 text-center text-sm font-semibold text-white hover:opacity-90"
                      >
                        Continuar edição
                      </Link>
                      <button
                        type="button"
                        disabled={
                          !focoRow.readiness?.ready ||
                          exportingId === focoRow.event.event_id ||
                          focoRow.readinessError
                        }
                        onClick={() => void onExport(focoRow.event, false)}
                        className="inline-flex flex-1 items-center justify-center rounded-tf border border-tf-border bg-tf-mid/60 px-3 py-2 text-sm font-semibold text-tf-fg hover:bg-tf-mid disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {exportingId === focoRow.event.event_id
                          ? "Exportando…"
                          : "Exportar para Player"}
                      </button>
                      <button
                        type="button"
                        disabled={
                          !focoRow.readiness?.ready ||
                          exportingId === focoRow.event.event_id ||
                          focoRow.readinessError
                        }
                        onClick={() => void onExport(focoRow.event, true)}
                        className="inline-flex flex-1 items-center justify-center rounded-tf border border-tf-accent/40 bg-tf-accent-soft/15 px-3 py-2 text-sm font-semibold text-tf-accent hover:bg-tf-accent-soft/25 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Exportar ZIP
                      </button>
                    </div>
                  </div>
                ) : null}

                {attention.blocks.length > 0 || attention.warns.length > 0 ? (
                  <div className="rounded-tf border border-tf-border/80 bg-tf-mid/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-tf-faint">
                      Outras pendências
                    </p>
                    {attention.blocks.length > 0 ? (
                      <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-red-100/85">
                        {attention.blocks.map((b, i) => (
                          <li key={`b-${b.eventId}-${i}`}>
                            <button
                              type="button"
                              onClick={() => setFocoFromRow(b.eventId)}
                              className="text-left font-medium text-tf-fg underline-offset-2 hover:underline"
                            >
                              {b.eventName}
                            </button>
                            <span className="text-red-100/65"> · {b.line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {attention.warns.length > 0 ? (
                      <ul
                        className={`mt-2 space-y-1.5 text-[11px] leading-snug text-amber-100/85 ${attention.blocks.length > 0 ? "border-t border-tf-border/60 pt-2" : ""}`}
                      >
                        {attention.warns.map((w, i) => (
                          <li key={`w-${w.eventId}-${i}`}>
                            <button
                              type="button"
                              onClick={() => setFocoFromRow(w.eventId)}
                              className="text-left font-medium text-tf-fg underline-offset-2 hover:underline"
                            >
                              {w.eventName}
                            </button>
                            <span className="text-amber-100/65">
                              {" "}
                              · {w.line}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-tf border border-tf-border/60 bg-tf-bg/20 p-3 opacity-90">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-tf-faint">
                    Atividade recente
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-tf-faint">
                    Registrado neste dispositivo — não sincroniza com outros
                    navegadores ou aparelhos.
                  </p>
                  {recentExports.length === 0 ? (
                    <p className="mt-2 text-xs text-tf-subtle">
                      Nenhum pack listado ainda por aqui.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-xs text-tf-muted">
                      {recentExports.map((ex) => (
                        <li key={ex.exportId}>
                          <Link
                            href={`/events/${encodeURIComponent(ex.eventId)}`}
                            className="font-medium text-tf-accent/90 hover:text-blue-300"
                          >
                            {ex.eventName}
                          </Link>
                          <span className="block text-[10px] text-tf-faint">
                            {formatWhen(ex.at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
