import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildPackSummary } from "../pack/packSummary.js";
import type { PackLoaderSuccess } from "../pack/validateLoadedPack.js";
import type { PlayerOperationalKind } from "../runtime/operationalState.js";
import { describeOperationalKindPt } from "../runtime/operationalState.js";
import {
  createEmptyBindingsFile,
  MediaBindingsFileSchema,
  serializeBindingsFile,
} from "../media/mediaBindingsFile.js";
import { ExecutionLogPanel } from "../execution/ExecutionLogPanel.js";
import type { ExecutionLogEntry, ExecutionLogLevel } from "../execution/executionLog.js";
import { runPreflightMvp } from "../preflight/runPreflight.js";
import type { PreflightResult } from "../preflight/types.js";
import { ExecutingRuntimeView } from "../runtime/ExecutingRuntimeView.js";

type StatusMidia = "nao_vinculado" | "vinculado" | "ausente";

function statusMidia(
  workspace: string | null,
  bindings: Record<string, string>,
  mediaId: string,
  existeCache: Map<string, boolean>,
): StatusMidia {
  if (!workspace) return "nao_vinculado";
  const rel = bindings[mediaId];
  if (!rel) return "nao_vinculado";
  const hit = existeCache.get(`${workspace}||${rel}`);
  if (hit === false) return "ausente";
  if (hit === true) return "vinculado";
  return "nao_vinculado";
}

type Props = {
  runtimeKind: PlayerOperationalKind;
  packRoot: string;
  packData: PackLoaderSuccess;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  lastPreflight: PreflightResult | null;
  sceneIndex: number;
  executionLog: ExecutionLogEntry[];
  onWorkspaceChange: (root: string | null, bindings: Record<string, string>) => void;
  onBindingsChange: (next: Record<string, string>) => void;
  onPreflightComplete: (r: PreflightResult) => void;
  onStartExecution: () => void;
  onSceneIndexChange: (index: number) => void;
  onFinishExecution: () => void;
  /** Apenas em `executing`: anexa eventos ao registo JSONL (ex.: playback). */
  onAppendExecutionLog?: (entry: {
    level: ExecutionLogLevel;
    code: string;
    message: string;
  }) => void;
};

export function PackLoadedWorkspace({
  runtimeKind,
  packRoot,
  packData,
  workspaceRoot,
  bindings,
  lastPreflight,
  sceneIndex,
  executionLog,
  onWorkspaceChange,
  onBindingsChange,
  onPreflightComplete,
  onStartExecution,
  onSceneIndexChange,
  onFinishExecution,
  onAppendExecutionLog,
}: Props) {
  const resumo = useMemo(() => buildPackSummary(packRoot, packData), [packRoot, packData]);
  const [existeCache, setExisteCache] = useState<Map<string, boolean>>(new Map());
  const [preflightBusy, setPreflightBusy] = useState(false);
  const [binderBusy, setBinderBusy] = useState(false);

  const refreshExistencia = useCallback(async () => {
    if (!workspaceRoot) {
      setExisteCache(new Map());
      return;
    }
    const mediaIds = new Set<string>();
    for (const req of packData.mediaManifest.requirements) {
      mediaIds.add(req.media_id);
    }
    for (const sc of packData.event.scenes) {
      if (sc.enabled && sc.media_id) {
        mediaIds.add(sc.media_id);
      }
    }
    const m = new Map<string, boolean>();
    for (const mediaId of mediaIds) {
      const rel = bindings[mediaId];
      if (!rel) continue;
      const key = `${workspaceRoot}||${rel}`;
      try {
        const ok = await invoke<boolean>("file_exists_under_workspace", {
          workspacePath: workspaceRoot,
          relative: rel,
        });
        m.set(key, ok);
      } catch {
        m.set(key, false);
      }
    }
    setExisteCache(m);
  }, [workspaceRoot, bindings, packData.mediaManifest.requirements, packData.event.scenes]);

  const escolherWorkspace = useCallback(async () => {
    setBinderBusy(true);
    try {
      const sel = await open({
        directory: true,
        multiple: false,
        title: "Selecionar pasta de workspace (mídia local)",
      });
      if (sel === null || Array.isArray(sel)) return;
      const raw = await invoke<string | null>("load_media_bindings_file", {
        workspacePath: sel,
      });
      let nextBindings: Record<string, string> = {};
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          const doc = MediaBindingsFileSchema.safeParse(parsed);
          if (
            doc.success &&
            doc.data.event_id === packData.manifest.event_id &&
            doc.data.export_id === packData.manifest.export_id
          ) {
            nextBindings = { ...doc.data.bindings };
          }
        } catch {
          /* ficheiro inválido — inicia vazio */
        }
      }
      onWorkspaceChange(sel, nextBindings);
    } finally {
      setBinderBusy(false);
    }
  }, [onWorkspaceChange, packData.manifest.event_id, packData.manifest.export_id]);

  const gravarBindings = useCallback(
    async (root: string, next: Record<string, string>) => {
      const doc = createEmptyBindingsFile(
        packData.manifest.event_id,
        packData.manifest.export_id,
      );
      doc.bindings = next;
      const txt = serializeBindingsFile(doc);
      await invoke("save_media_bindings_file", {
        workspacePath: root,
        content: txt,
      });
    },
    [packData.manifest.event_id, packData.manifest.export_id],
  );

  const vincularFicheiro = useCallback(
    async (mediaId: string) => {
      if (!workspaceRoot) return;
      const sel = await open({
        directory: false,
        multiple: false,
        title: `Ficheiro para ${mediaId}`,
      });
      if (sel === null || Array.isArray(sel)) return;
      setBinderBusy(true);
      try {
        const rel = await invoke<string>("normalize_media_binding_relative", {
          workspacePath: workspaceRoot,
          absoluteFile: sel,
        });
        const next = { ...bindings, [mediaId]: rel };
        await gravarBindings(workspaceRoot, next);
        onBindingsChange(next);
        await refreshExistencia();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        window.alert(`Não foi possível vincular: ${msg}`);
      } finally {
        setBinderBusy(false);
      }
    },
    [workspaceRoot, bindings, onBindingsChange, gravarBindings, refreshExistencia],
  );

  const limparVinculo = useCallback(
    async (mediaId: string) => {
      if (!workspaceRoot) return;
      const next = { ...bindings };
      delete next[mediaId];
      await gravarBindings(workspaceRoot, next);
      onBindingsChange(next);
      await refreshExistencia();
    },
    [workspaceRoot, bindings, onBindingsChange, gravarBindings, refreshExistencia],
  );

  useEffect(() => {
    void refreshExistencia();
  }, [refreshExistencia]);

  const executarPreflight = useCallback(async () => {
    setPreflightBusy(true);
    try {
      const r = await runPreflightMvp({
        packData,
        workspaceRoot,
        bindings,
      });
      onPreflightComplete(r);
    } finally {
      setPreflightBusy(false);
    }
  }, [packData, workspaceRoot, bindings, onPreflightComplete]);

  const linhasMidia = packData.mediaManifest.requirements.map((req) => {
    const st = statusMidia(workspaceRoot, bindings, req.media_id, existeCache);
    return { req, st };
  });

  const podeCorrerPreflight = runtimeKind !== "executing";

  const execPrimary = runtimeKind === "executing";

  return (
    <div className={`pack-workspace${execPrimary ? " pack-workspace--executing" : ""}`}>
      <h2>Sessão com pack</h2>
      {execPrimary && (
        <section className="player-section player-section--exec-focus" aria-label="Runtime visual MVP">
          <ExecutingRuntimeView
            packData={packData}
            sceneIndex={sceneIndex}
            workspaceRoot={workspaceRoot}
            bindings={bindings}
            fileExistsCache={existeCache}
            onSceneIndexChange={onSceneIndexChange}
            onFinishExecution={onFinishExecution}
            onPlaybackLog={(entry) => onAppendExecutionLog?.(entry)}
          />
        </section>
      )}
      <dl className="player-summary">
        <div>
          <dt>Pasta do pack</dt>
          <dd>{resumo.rootPath}</dd>
        </div>
        <div>
          <dt>Evento</dt>
          <dd>{resumo.eventName}</dd>
        </div>
        <div>
          <dt>Licença</dt>
          <dd className="player-license-ok">válida (janela temporal e escopo MVP)</dd>
        </div>
        <div>
          <dt>export_id</dt>
          <dd>
            <code>{resumo.exportId}</code>
          </dd>
        </div>
        <div>
          <dt>Scenes (total no pack)</dt>
          <dd>{resumo.sceneCount}</dd>
        </div>
        <div>
          <dt>Requisitos de mídia</dt>
          <dd>{resumo.mediaRequirementCount}</dd>
        </div>
        <div>
          <dt>Estado operacional (FSM)</dt>
          <dd>
            <code>{runtimeKind}</code> — {describeOperationalKindPt(runtimeKind)}
          </dd>
        </div>
      </dl>

      <section className="player-section">
        <h3>Gate ready → execução (MVP)</h3>
        <p className="player-hint">
          O pre-flight sem bloqueantes coloca o estado em <code>ready</code>. Aí pode iniciar o
          roteiro (sem playback). Em <code>executing</code> use o painel <strong>Operação</strong>{" "}
          para navegar e concluir; volta a <code>ready</code> mantendo o último pre-flight válido.
        </p>
        {runtimeKind === "executing" ? (
          <p className="player-hint">Execução ativa — navegação e «Concluir execução» estão no painel lateral de operação.</p>
        ) : (
          <button type="button" disabled={runtimeKind !== "ready"} onClick={onStartExecution}>
            Iniciar roteiro (MVP)
          </button>
        )}
      </section>

      <section className="player-section">
        <h3>Workspace local</h3>
        <p className="player-hint">
          Escolha a pasta raiz onde estão (ou estarão) os ficheiros de mídia. Os bindings
          gravam-se em <code>.telaflow/media-bindings.json</code> com caminhos relativos a
          essa raiz. O registo de execução JSONL usa <code>.telaflow/execution-log.jsonl</code>{" "}
          (workspace se existir; senão pasta do pack).
        </p>
        <button type="button" disabled={binderBusy} onClick={escolherWorkspace}>
          {workspaceRoot ? "Alterar workspace…" : "Selecionar workspace…"}
        </button>
        {workspaceRoot && (
          <p className="player-workspace-path">
            <strong>Raiz:</strong> {workspaceRoot}
          </p>
        )}
        <button type="button" disabled={!workspaceRoot || binderBusy} onClick={refreshExistencia}>
          Atualizar estado dos ficheiros
        </button>
      </section>

      <section className="player-section">
        <h3>Vínculos de mídia</h3>
        <table className="player-table">
          <thead>
            <tr>
              <th>media_id</th>
              <th>Rótulo</th>
              <th>Obrigatório</th>
              <th>Caminho relativo</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {linhasMidia.map(({ req, st }) => (
              <tr key={req.media_id}>
                <td>
                  <code>{req.media_id}</code>
                </td>
                <td>{req.label}</td>
                <td>{req.required ? "sim" : "não"}</td>
                <td>
                  <code>{bindings[req.media_id] ?? "—"}</code>
                </td>
                <td>
                  <span className={`player-badge player-badge--${st}`}>{st}</span>
                </td>
                <td>
                  <button
                    type="button"
                    disabled={!workspaceRoot || binderBusy}
                    onClick={() => void vincularFicheiro(req.media_id)}
                  >
                    Escolher ficheiro…
                  </button>{" "}
                  <button
                    type="button"
                    disabled={!workspaceRoot || binderBusy || !bindings[req.media_id]}
                    onClick={() => void limparVinculo(req.media_id)}
                  >
                    Limpar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="player-section">
        <h3>Pre-flight</h3>
        <p className="player-hint">
          Com bloqueantes → estado <code>preflight_failed</code>. Sem bloqueantes →{" "}
          <code>ready</code>. Reexecute após alterar workspace ou vínculos.
        </p>
        <button
          type="button"
          disabled={preflightBusy || !podeCorrerPreflight}
          onClick={() => void executarPreflight()}
        >
          {preflightBusy ? "A executar…" : "Executar checagens"}
        </button>
        {lastPreflight && (
          <div className="player-preflight-report">
            <p>
              <strong>Última execução:</strong> {lastPreflight.runAt} — bloqueantes:{" "}
              {lastPreflight.blockingCount}, avisos: {lastPreflight.warningCount}, OK:{" "}
              {lastPreflight.okCount}
            </p>
            <ul className="player-preflight-list">
              {lastPreflight.items.map((it, i) => (
                <li
                  key={`${it.check_id}-${i}`}
                  className={`player-preflight-item player-preflight-item--${it.severity}`}
                >
                  <span className="player-preflight-meta">
                    [{it.group}] {it.code}
                  </span>{" "}
                  <span className="player-preflight-sev">({it.severity})</span> — {it.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="player-section">
        <h3>Registo de execução (MVP)</h3>
        {runtimeKind === "executing" ? (
          <details className="player-exec-details">
            <summary>Mostrar registo JSONL (sessão atual)</summary>
            <ExecutionLogPanel entries={executionLog} />
          </details>
        ) : (
          <p className="player-hint">
            O ficheiro <code>.telaflow/execution-log.jsonl</code> regista{" "}
            <code>execution_started</code>, <code>scene_activated</code> e{" "}
            <code>execution_finished</code> após iniciar o roteiro.
          </p>
        )}
      </section>
    </div>
  );
}
