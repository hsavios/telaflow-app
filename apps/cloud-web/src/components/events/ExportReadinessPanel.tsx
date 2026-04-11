"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchExportReadiness,
  type ExportReadinessBlocking,
  type ExportReadinessBody,
  type SceneReadinessEvaluation,
} from "@/lib/cloud-api";

function blockingLine(b: ExportReadinessBlocking): string {
  switch (b.code) {
    case "no_scenes":
      return b.message ?? "Nenhuma scene no evento.";
    case "sort_order_invalid":
      return b.message ?? "Ordem inválida: use 0..n-1 sem buracos (§16.1).";
    case "all_scenes_disabled":
      return b.message ?? "Todas as scenes estão desabilitadas.";
    case "scene_name_empty":
      return `Scene sem nome válido (${b.scene_id ?? "?"})`;
    case "scene_type_missing":
      return `Scene sem tipo (${b.scene_id ?? "?"})`;
    case "scene_media_unknown":
      return `Scene referencia media_id inexistente (${b.media_id ?? "?"})`;
    case "scene_draw_unknown":
      return `Scene referencia sorteio inexistente (${b.draw_config_id ?? "?"})`;
    case "draw_scene_missing_trigger":
      return `Scene de sorteio sem DrawConfig vinculado (${b.scene_id ?? "?"})`;
    default:
      return b.message ?? b.code;
  }
}

function warningLine(w: ExportReadinessBlocking): string {
  switch (w.code) {
    case "required_media_not_linked":
      return `Mídia obrigatória ainda não usada em nenhuma scene: ${w.label ?? w.media_id ?? "?"}`;
    case "draw_config_unused":
      return `Sorteio cadastrado mas não referenciado no roteiro: ${w.name ?? w.draw_config_id ?? "?"}`;
    case "sponsor_scene_no_primary_media":
      return `Scene patrocinador sem mídia principal (${w.scene_id ?? "?"}) — aviso §16.1.`;
    case "draw_config_disabled_referenced":
      return `Scene referencia sorteio desabilitado (${w.scene_id ?? "?"})`;
    case "media_requirement_scene_hint_mismatch":
      return `Slot de mídia sugere outra scene que a que referencia o media_id (${w.scene_id ?? "?"})`;
    default:
      return w.message ?? w.code;
  }
}

function lifecycleLabel(lc: SceneReadinessEvaluation["lifecycle"]): string {
  switch (lc) {
    case "draft":
      return "Rascunho";
    case "blocked":
      return "Bloqueada";
    case "warning":
      return "Aviso";
    case "ready":
      return "Pronta";
    default:
      return lc;
  }
}

type Props = {
  eventId: string;
  apiConfigured: boolean;
};

export function ExportReadinessPanel({ eventId, apiConfigured }: Props) {
  const [data, setData] = useState<ExportReadinessBody | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId || !apiConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchExportReadiness(eventId);
      setData(r);
    } catch {
      setError("Não foi possível carregar a prontidão para export.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, apiConfigured]);

  useEffect(() => {
    void load();
  }, [load]);

  const lc = data?.lifecycle_counts;
  const evaluations = data?.scene_evaluations ?? [];

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-tf-subtle">
          Contrato{" "}
          <span className="font-mono text-tf-muted">
            {data?.schema_version ?? "export_readiness.v1"}
          </span>{" "}
          — alinhado a @telaflow/shared-contracts e à matriz §16 / resumo §17
          do EVENT_EDITOR_FEATURE_SPEC. Não gera Pack.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !apiConfigured}
          className="shrink-0 rounded-tf border border-tf-border bg-tf-mid/50 px-4 py-2 text-sm font-medium text-tf-fg hover:bg-tf-mid disabled:opacity-50"
        >
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <div
            className={`rounded-tf-lg border px-5 py-4 ${
              data.ready
                ? "border-tf-teal/35 bg-tf-teal-soft/20"
                : "border-amber-500/35 bg-amber-950/25"
            }`}
          >
            <p className="font-display text-base font-semibold text-tf-fg">
              {data.ready ? "Pronto para export (checagens mínimas)" : "Ainda não pronto"}
            </p>
            <p className="mt-2 text-xs text-tf-subtle">
              Invariante de ordem:{" "}
              <span className="font-medium text-tf-muted">
                {data.sort_order_ok === false
                  ? "falhou — corrija sort_order"
                  : "ok"}
              </span>
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-tf-faint">Scenes</dt>
                <dd className="mt-1 tabular-nums text-tf-fg">{data.scene_count}</dd>
              </div>
              <div>
                <dt className="text-tf-faint">Sorteios</dt>
                <dd className="mt-1 tabular-nums text-tf-fg">
                  {data.draw_config_count}
                </dd>
              </div>
              <div>
                <dt className="text-tf-faint">Requisitos de mídia</dt>
                <dd className="mt-1 tabular-nums text-tf-fg">
                  {data.media_requirement_count}
                </dd>
              </div>
            </dl>
          </div>

          {lc ? (
            <div className="rounded-tf border border-tf-border bg-tf-mid/25 px-4 py-3 text-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-tf-subtle">
                Lifecycle por scene (§17.1)
              </h3>
              <p className="mt-2 text-tf-muted">
                Prontas:{" "}
                <span className="font-semibold tabular-nums text-tf-fg">
                  {lc.ready}
                </span>
                {" · "}
                Avisos:{" "}
                <span className="font-semibold tabular-nums text-tf-fg">
                  {lc.warning}
                </span>
                {" · "}
                Bloqueadas:{" "}
                <span className="font-semibold tabular-nums text-tf-fg">
                  {lc.blocked}
                </span>
                {" · "}
                Rascunho:{" "}
                <span className="font-semibold tabular-nums text-tf-fg">
                  {lc.draft}
                </span>
              </p>
            </div>
          ) : null}

          {evaluations.length > 0 ? (
            <div className="overflow-x-auto rounded-tf border border-tf-border">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-tf-border bg-tf-bg/40 text-xs uppercase text-tf-subtle">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Scene</th>
                    <th className="px-3 py-2">Lifecycle</th>
                    <th className="px-3 py-2">Códigos</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((row) => (
                    <tr
                      key={row.scene_id}
                      className="border-b border-tf-border/80 last:border-0"
                    >
                      <td className="px-3 py-2 tabular-nums text-tf-muted">
                        {row.sort_order}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-tf-faint">
                        {row.scene_id}
                      </td>
                      <td className="px-3 py-2 text-tf-fg">
                        {lifecycleLabel(row.lifecycle)}
                      </td>
                      <td className="px-3 py-2 text-xs text-tf-muted">
                        {[
                          ...row.blocking_codes.map((c) => `B:${c}`),
                          ...row.warning_codes.map((c) => `W:${c}`),
                        ].join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {data.blocking.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-red-200/80">
                Bloqueantes (lista plana)
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-100/90">
                {data.blocking.map((b, i) => (
                  <li key={`${b.code}-${i}`}>{blockingLine(b)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.warnings.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">
                Avisos
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-100/85">
                {data.warnings.map((w, i) => (
                  <li key={`${w.code}-${i}`}>{warningLine(w)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-tf-muted">Nenhum aviso no momento.</p>
          )}
        </div>
      ) : !loading && !error ? (
        <p className="text-sm text-tf-muted">Carregue após configurar a API.</p>
      ) : null}
    </div>
  );
}
