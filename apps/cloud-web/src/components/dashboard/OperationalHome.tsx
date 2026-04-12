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

function readinessLabel(r: ExportReadinessBody | null): {
  text: string;
  tone: "ok" | "warn" | "bad" | "muted";
} {
  if (!r) return { text: "—", tone: "muted" };
  if (r.ready && r.warnings.length === 0) {
    return { text: "Pronto", tone: "ok" };
  }
  if (r.ready && r.warnings.length > 0) {
    return { text: "Pronto · avisos", tone: "warn" };
  }
  if (r.blocking.length > 0) {
    return { text: "Bloqueado", tone: "bad" };
  }
  return { text: "Pendente", tone: "warn" };
}

const readinessToneClass = {
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
  return "Falha ao carregar o painel.";
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-tf-lg border border-tf-border bg-tf-mid/40 px-4 py-3.5 shadow-[0_0_0_1px_rgba(248,250,252,0.03)_inset]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-tf-subtle">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight text-tf-fg">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs leading-snug text-tf-faint">{hint}</p>
      ) : null}
    </div>
  );
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
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportBanner, setExportBanner] = useState<{
    tone: "ok" | "err";
    text: string;
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

  const now = Date.now();
  const kpis = {
    active: rows.length,
    readyExport: rows.filter((r) => r.readiness?.ready).length,
    withAlerts: rows.filter((r) => (r.readiness?.warnings.length ?? 0) > 0)
      .length,
    exports7d: countExportsSince(now - MS_7D),
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
      blocks: blocks.slice(0, 12),
      warns: warns.slice(0, 10),
    };
  }, [rows]);

  const recentExports = readRecentExports().slice(0, 8);
  const recentEvents = rows.slice(0, 6);

  const lastOpened = getLastOpenedEventId();
  const lastOpenedValid =
    lastOpened && rows.some((r) => r.event.event_id === lastOpened);

  const onExport = async (ev: CloudEvent) => {
    if (!getCloudApiBase()) return;
    setExportingId(ev.event_id);
    setExportBanner(null);
    try {
      const out = await runPackExport(ev.event_id);
      recordPackExport({
        exportId: out.export_id,
        eventId: ev.event_id,
        eventName: ev.name,
      });
      setExportBanner({
        tone: "ok",
        text: `Export concluído: ${ev.name} · ${out.export_id}`,
      });
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
          text: `${ev.name}: corrija os bloqueios antes de exportar.`,
        });
      } else {
        setExportBanner({
          tone: "err",
          text: `${ev.name}: falha ao exportar. Tente de novo.`,
        });
      }
    } finally {
      setExportingId(null);
    }
  };

  return (
    <main
      id="conteudo-principal"
      className="mx-auto max-w-content px-6 pb-20 pt-8 md:pt-10 lg:px-10"
    >
      <section
        id="visao-geral"
        className="scroll-mt-28"
        aria-labelledby="dash-titulo"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1
              id="dash-titulo"
              className="font-display text-2xl font-semibold tracking-tight text-tf-fg md:text-3xl"
            >
              Operação
            </h1>
            <p className="mt-1 text-sm text-tf-muted">
              Eventos, prontidão para pack e export recente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-tf border border-tf-border bg-tf-mid/50 px-4 py-2.5 text-sm font-semibold text-tf-fg transition-colors hover:border-tf-accent/35 hover:bg-tf-mid"
            >
              Novo evento
            </Link>
            {lastOpenedValid && lastOpened ? (
              <Link
                href={`/events/${encodeURIComponent(lastOpened)}`}
                onClick={() => rememberLastOpenedEvent(lastOpened)}
                className="inline-flex items-center justify-center rounded-tf bg-tf-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Abrir último evento
              </Link>
            ) : (
              <span
                className="inline-flex cursor-not-allowed items-center justify-center rounded-tf border border-tf-border bg-tf-mid/25 px-4 py-2.5 text-sm font-medium text-tf-faint"
                title="Abra um evento a partir da lista para memorizar o atalho."
              >
                Abrir último evento
              </span>
            )}
          </div>
        </div>

        {exportBanner ? (
          <p
            className={`mt-6 rounded-tf border px-4 py-3 text-sm ${
              exportBanner.tone === "ok"
                ? "border-tf-teal/30 bg-tf-teal-soft/25 text-tf-fg"
                : "border-red-500/25 bg-red-950/25 text-red-100/90"
            }`}
            role="status"
          >
            {exportBanner.text}
          </p>
        ) : null}

        {loadState === "loading" ? (
          <p className="mt-8 text-sm text-tf-subtle" aria-live="polite">
            Carregando painel…
          </p>
        ) : null}

        {loadState === "error" && listError ? (
          <div
            className="mt-8 rounded-tf-lg border border-red-500/25 bg-red-950/20 px-5 py-4 text-sm text-red-100/90"
            role="alert"
          >
            <p className="font-medium">Não foi possível carregar o painel</p>
            <p className="mt-1 text-red-100/80">{listError}</p>
            {apiConfigured ? (
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="mt-4 text-sm font-medium text-tf-fg underline-offset-2 hover:underline"
              >
                Tentar de novo
              </button>
            ) : null}
          </div>
        ) : null}

        {loadState === "ok" ? (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Eventos ativos" value={kpis.active} />
              <KpiCard
                label="Prontos para exportar"
                value={kpis.readyExport}
                hint="Checagem de prontidão ok."
              />
              <KpiCard
                label="Com alertas"
                value={kpis.withAlerts}
                hint="Há avisos na prontidão."
              />
              <KpiCard
                label="Exports (7 dias)"
                value={kpis.exports7d}
                hint="Neste navegador."
              />
            </div>

            <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
              <div className="min-w-0">
                <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-tf-subtle">
                  Eventos
                </h2>
                {rows.length === 0 ? (
                  <div className="mt-4 rounded-tf-lg border border-tf-border bg-tf-mid/30 px-6 py-10 text-center">
                    <p className="text-sm font-medium text-tf-fg">
                      Nenhum evento ainda
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-tf-muted">
                      Crie um evento para montar o roteiro e gerar pack na VPS.
                    </p>
                    <Link
                      href="/events"
                      className="mt-6 inline-flex rounded-tf bg-tf-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Ir para Eventos
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-tf-lg border border-tf-border">
                    <table className="w-full min-w-[52rem] text-left text-sm">
                      <thead className="border-b border-tf-border bg-tf-mid/80 text-xs uppercase tracking-wide text-tf-subtle">
                        <tr>
                          <th className="px-3 py-3 font-medium">Nome</th>
                          <th className="px-3 py-3 font-medium tabular-nums">
                            Scenes
                          </th>
                          <th className="px-3 py-3 font-medium tabular-nums">
                            Sorteios
                          </th>
                          <th className="px-3 py-3 font-medium tabular-nums">
                            Mídias
                          </th>
                          <th className="px-3 py-3 font-medium">Prontidão</th>
                          <th className="px-3 py-3 font-medium">Último export</th>
                          <th className="px-3 py-3 font-medium text-right">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-tf-border bg-tf-mid/20">
                        {rows.map(({ event: ev, readiness: r, readinessError }) => {
                          const rl = readinessLabel(r);
                          const last = lastExportForEvent(ev.event_id);
                          const canExport = Boolean(r?.ready);
                          return (
                            <tr
                              key={ev.event_id}
                              className="hover:bg-tf-mid/35"
                            >
                              <td className="max-w-[14rem] px-3 py-3">
                                <span className="font-medium text-tf-fg">
                                  {ev.name}
                                </span>
                                {readinessError ? (
                                  <span className="mt-1 block text-xs text-amber-200/80">
                                    Prontidão indisponível
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-3 tabular-nums text-tf-muted">
                                {r?.scene_count ?? "—"}
                              </td>
                              <td className="px-3 py-3 tabular-nums text-tf-muted">
                                {r?.draw_config_count ?? "—"}
                              </td>
                              <td className="px-3 py-3 tabular-nums text-tf-muted">
                                {r?.media_requirement_count ?? "—"}
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${readinessToneClass[rl.tone]}`}
                                >
                                  {rl.text}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-tf-muted">
                                {last ? (
                                  <span className="text-xs leading-snug">
                                    {formatWhen(last.at)}
                                    <span className="mt-0.5 block font-mono text-[10px] text-tf-faint">
                                      {last.exportId}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-tf-faint">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Link
                                    href={`/events/${encodeURIComponent(ev.event_id)}`}
                                    onClick={() =>
                                      rememberLastOpenedEvent(ev.event_id)
                                    }
                                    className="text-sm font-medium text-tf-accent hover:text-blue-300"
                                  >
                                    Abrir
                                  </Link>
                                  <button
                                    type="button"
                                    disabled={
                                      !canExport ||
                                      exportingId === ev.event_id ||
                                      readinessError
                                    }
                                    onClick={() => void onExport(ev)}
                                    className="text-sm font-medium text-tf-fg underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-tf-faint disabled:no-underline"
                                    title={
                                      canExport
                                        ? "Gerar pack no servidor"
                                        : "Evento ainda não está pronto para export"
                                    }
                                  >
                                    {exportingId === ev.event_id
                                      ? "Exportando…"
                                      : "Exportar"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <aside className="mt-10 space-y-8 lg:mt-8">
                <div>
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-tf-subtle">
                    Atenção operacional
                  </h2>
                  <div className="mt-3 space-y-4 rounded-tf-lg border border-tf-border bg-tf-mid/30 p-4">
                    {attention.blocks.length === 0 &&
                    attention.warns.length === 0 ? (
                      <p className="text-sm text-tf-muted">
                        Nenhuma pendência listada pela prontidão.
                      </p>
                    ) : null}
                    {attention.blocks.length > 0 ? (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-red-200/85">
                          Bloqueios
                        </h3>
                        <ul className="mt-2 space-y-2 text-sm text-red-100/88">
                          {attention.blocks.map((b, i) => (
                            <li key={`b-${b.eventId}-${i}`}>
                              <Link
                                href={`/events/${encodeURIComponent(b.eventId)}`}
                                className="font-medium text-tf-fg underline-offset-2 hover:underline"
                              >
                                {b.eventName}
                              </Link>
                              <span className="text-red-100/70">
                                {" "}
                                · {b.line}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {attention.warns.length > 0 ? (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-200/85">
                          Avisos
                        </h3>
                        <ul className="mt-2 space-y-2 text-sm text-amber-100/88">
                          {attention.warns.map((w, i) => (
                            <li key={`w-${w.eventId}-${i}`}>
                              <Link
                                href={`/events/${encodeURIComponent(w.eventId)}`}
                                className="font-medium text-tf-fg underline-offset-2 hover:underline"
                              >
                                {w.eventName}
                              </Link>
                              <span className="text-amber-100/75">
                                {" "}
                                · {w.line}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-tf-subtle">
                    Atividade recente
                  </h2>
                  <div className="mt-3 rounded-tf-lg border border-tf-border bg-tf-mid/30 p-4">
                    <h3 className="text-xs font-medium text-tf-faint">
                      Exports (neste navegador)
                    </h3>
                    {recentExports.length === 0 ? (
                      <p className="mt-2 text-sm text-tf-muted">
                        Nenhum export registrado ainda.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm">
                        {recentExports.map((ex) => (
                          <li key={ex.exportId} className="leading-snug">
                            <Link
                              href={`/events/${encodeURIComponent(ex.eventId)}`}
                              className="font-medium text-tf-accent hover:text-blue-300"
                            >
                              {ex.eventName}
                            </Link>
                            <span className="block text-xs text-tf-subtle">
                              {formatWhen(ex.at)} ·{" "}
                              <span className="font-mono text-tf-faint">
                                {ex.exportId}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {recentEvents.length > 0 ? (
                      <>
                        <h3 className="mt-5 text-xs font-medium text-tf-faint">
                          Eventos recentes
                        </h3>
                        <ul className="mt-2 space-y-1.5 text-sm text-tf-muted">
                          {recentEvents.map(({ event: ev }) => (
                            <li key={ev.event_id}>
                              <Link
                                href={`/events/${encodeURIComponent(ev.event_id)}`}
                                className="text-tf-fg hover:text-tf-accent"
                              >
                                {ev.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
