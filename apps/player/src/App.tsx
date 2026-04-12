import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import { PackLoadedWorkspace } from "./components/PackLoadedWorkspace.js";
import {
  appendExecutionLog,
  EXECUTION_LOG_CODES,
  toJsonlLine,
  type ExecutionLogEntry,
  type ExecutionLogLevel,
} from "./execution/executionLog.js";
import { persistExecutionJsonl } from "./execution/persistExecutionLog.js";
import {
  evaluateLicense,
  formatLicenseBlockMessage,
} from "./license/licenseValidator.js";
import {
  isActiveSession,
  type PlayerActiveSession,
  type PlayerAppState,
} from "./pack/playerPackState.js";
import type { LoadedPackInvokePayload, PackLoaderSuccess } from "./pack/validateLoadedPack.js";
import { validateLoadedPackPayload } from "./pack/validateLoadedPack.js";
import type { PreflightResult } from "./preflight/types.js";
import { kindAfterPreflight } from "./runtime/operationalState.js";
import "./App.css";

function logBasePath(s: PlayerActiveSession): string {
  return (s.workspaceRoot && s.workspaceRoot.trim()) || s.packRoot;
}

function persistLine(s: PlayerActiveSession, entry: ExecutionLogEntry): void {
  void persistExecutionJsonl(logBasePath(s), toJsonlLine(entry));
}

function isPreflightRunnable(s: PlayerAppState): s is PlayerActiveSession {
  return (
    isActiveSession(s) &&
    (s.kind === "pack_loaded" || s.kind === "preflight_failed" || s.kind === "ready")
  );
}

export default function App() {
  const [estado, setEstado] = useState<PlayerAppState>({ kind: "idle" });
  const [carregando, setCarregando] = useState(false);

  const abrirPastaPack = useCallback(async () => {
    setCarregando(true);
    try {
      const selecionado = await open({
        directory: true,
        multiple: false,
        title: "Selecionar pasta do pack (export direto MVP)",
      });
      if (selecionado === null) {
        setEstado({ kind: "idle" });
        return;
      }
      if (Array.isArray(selecionado)) {
        setEstado({
          kind: "blocked",
          message: "Seleção inválida: esperada uma única pasta.",
        });
        return;
      }

      const bruto = await invoke<LoadedPackInvokePayload>("load_pack_from_directory", {
        path: selecionado,
      });
      const validado = validateLoadedPackPayload(bruto);
      if (!validado.ok) {
        setEstado({
          kind: "blocked",
          message: `[${validado.phase}] ${validado.message}`,
        });
        return;
      }

      const lic = evaluateLicense(validado.license, {
        nowMs: Date.now(),
        expectedEventId: validado.manifest.event_id,
        expectedExportId: validado.manifest.export_id,
        expectedOrganizationId: validado.manifest.organization_id,
      });
      if (lic.status !== "valid") {
        setEstado({
          kind: "blocked",
          message: `Licença: ${formatLicenseBlockMessage(lic)}`,
        });
        return;
      }

      setEstado({
        kind: "pack_loaded",
        packRoot: bruto.rootPath,
        packData: validado,
        workspaceRoot: null,
        bindings: {},
        lastPreflight: null,
        sceneIndex: 0,
        executionLog: [],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setEstado({
        kind: "blocked",
        message: `Falha ao carregar pack: ${msg}`,
      });
    } finally {
      setCarregando(false);
    }
  }, []);

  const descarregar = useCallback(() => {
    setEstado((prev) => {
      if (prev.kind === "executing" && prev.executionLog.length > 0) {
        const next = appendExecutionLog(prev.executionLog, {
          level: "info",
          code: EXECUTION_LOG_CODES.EXECUTION_FINISHED,
          message: "Sessão descarregada (operador).",
        });
        const last = next[next.length - 1];
        persistLine(prev, last);
      }
      return { kind: "idle" };
    });
  }, []);

  const onWorkspaceChange = useCallback((root: string | null, nextBindings: Record<string, string>) => {
    setEstado((s) => {
      if (!isActiveSession(s)) return s;
      if (s.kind === "executing") {
        const next = appendExecutionLog(s.executionLog, {
          level: "info",
          code: EXECUTION_LOG_CODES.EXECUTION_FINISHED,
          message: "Workspace alterado durante execução — sessão reposta.",
        });
        persistLine(s, next[next.length - 1]);
      }
      return {
        kind: "pack_loaded",
        packRoot: s.packRoot,
        packData: s.packData,
        workspaceRoot: root,
        bindings: nextBindings,
        lastPreflight: null,
        sceneIndex: 0,
        executionLog: [],
      };
    });
  }, []);

  const onBindingsChange = useCallback((next: Record<string, string>) => {
    setEstado((s) => {
      if (!isActiveSession(s)) return s;
      if (s.kind === "executing") {
        const nlog = appendExecutionLog(s.executionLog, {
          level: "info",
          code: EXECUTION_LOG_CODES.EXECUTION_FINISHED,
          message: "Bindings alterados durante execução — sessão reposta.",
        });
        persistLine(s, nlog[nlog.length - 1]);
      }
      return {
        kind: "pack_loaded",
        packRoot: s.packRoot,
        packData: s.packData,
        workspaceRoot: s.workspaceRoot,
        bindings: next,
        lastPreflight: null,
        sceneIndex: 0,
        executionLog: [],
      };
    });
  }, []);

  const onPreflightComplete = useCallback((r: PreflightResult) => {
    setEstado((s) => {
      if (!isPreflightRunnable(s)) return s;
      const gate = kindAfterPreflight(r);
      if (gate === "ready") {
        return {
          kind: "ready",
          packRoot: s.packRoot,
          packData: s.packData,
          workspaceRoot: s.workspaceRoot,
          bindings: s.bindings,
          lastPreflight: r,
          sceneIndex: 0,
          executionLog: [],
        };
      }
      return {
        kind: "preflight_failed",
        packRoot: s.packRoot,
        packData: s.packData,
        workspaceRoot: s.workspaceRoot,
        bindings: s.bindings,
        lastPreflight: r,
        sceneIndex: 0,
        executionLog: [],
      };
    });
  }, []);

  const onStartExecution = useCallback(() => {
    setEstado((prev) => {
      if (prev.kind !== "ready") return prev;
      const started = appendExecutionLog([], {
        level: "info",
        code: EXECUTION_LOG_CODES.EXECUTION_STARTED,
        message: `Execução iniciada (export ${prev.packData.manifest.export_id}).`,
      });
      const firstSceneMsg = sceneActivationMessage(prev.packData, 0);
      const withScene = appendExecutionLog(started, {
        level: "info",
        code: EXECUTION_LOG_CODES.SCENE_ACTIVATED,
        message: firstSceneMsg,
      });
      persistLine(prev, started[0]);
      persistLine(prev, withScene[withScene.length - 1]);
      return {
        kind: "executing",
        packRoot: prev.packRoot,
        packData: prev.packData,
        workspaceRoot: prev.workspaceRoot,
        bindings: prev.bindings,
        lastPreflight: prev.lastPreflight,
        sceneIndex: 0,
        executionLog: withScene,
      };
    });
  }, []);

  const onSceneIndexChange = useCallback((next: number) => {
    setEstado((prev) => {
      if (prev.kind !== "executing") return prev;
      const row = appendExecutionLog(prev.executionLog, {
        level: "info",
        code: EXECUTION_LOG_CODES.SCENE_ACTIVATED,
        message: sceneActivationMessage(prev.packData, next),
      });
      const last = row[row.length - 1];
      persistLine(prev, last);
      return { ...prev, sceneIndex: next, executionLog: row };
    });
  }, []);

  const onAppendExecutionPlaybackLog = useCallback(
    (entry: { level: ExecutionLogLevel; code: string; message: string }) => {
      setEstado((prev) => {
        if (prev.kind !== "executing") return prev;
        const row = appendExecutionLog(prev.executionLog, entry);
        persistLine(prev, row[row.length - 1]);
        return { ...prev, executionLog: row };
      });
    },
    [],
  );

  const onFinishExecution = useCallback(() => {
    setEstado((prev) => {
      if (prev.kind !== "executing") return prev;
      const row = appendExecutionLog(prev.executionLog, {
        level: "info",
        code: EXECUTION_LOG_CODES.EXECUTION_FINISHED,
        message: "Execução concluída pelo operador (MVP).",
      });
      persistLine(prev, row[row.length - 1]);
      return {
        kind: "ready",
        packRoot: prev.packRoot,
        packData: prev.packData,
        workspaceRoot: prev.workspaceRoot,
        bindings: prev.bindings,
        lastPreflight: prev.lastPreflight,
        sceneIndex: 0,
        executionLog: [],
      };
    });
  }, []);

  const wideShell = estado.kind === "executing";

  return (
    <main className={wideShell ? "player-shell player-shell--executing" : "player-shell"}>
      <header className="player-header">
        <h1>TelaFlow Player</h1>
        <p className="player-tagline">
          FSM operacional, pre-flight, runtime visual, playback MVP (imagem/vídeo via bindings) e
          registro JSONL — sem Cloud em runtime, sem sorteio visual real e sem multi-monitor.
        </p>
      </header>

      <section className="player-actions">
        <button type="button" disabled={carregando} onClick={abrirPastaPack}>
          {carregando ? "Abrindo…" : "Abrir pasta do pack"}
        </button>
        {estado.kind !== "idle" && (
          <button type="button" disabled={carregando} onClick={descarregar}>
            Descarregar
          </button>
        )}
      </section>

      <section className="player-status" aria-live="polite">
        <h2>Estado</h2>
        <p>
          <strong>{estado.kind}</strong>
        </p>
        {estado.kind === "blocked" && (
          <pre className="player-error">{estado.message}</pre>
        )}
        {isActiveSession(estado) && (
          <PackLoadedWorkspace
            runtimeKind={estado.kind}
            packRoot={estado.packRoot}
            packData={estado.packData}
            workspaceRoot={estado.workspaceRoot}
            bindings={estado.bindings}
            lastPreflight={estado.lastPreflight}
            sceneIndex={estado.sceneIndex}
            executionLog={estado.executionLog}
            onWorkspaceChange={onWorkspaceChange}
            onBindingsChange={onBindingsChange}
            onPreflightComplete={onPreflightComplete}
            onStartExecution={onStartExecution}
            onSceneIndexChange={onSceneIndexChange}
            onFinishExecution={onFinishExecution}
            onAppendExecutionLog={onAppendExecutionPlaybackLog}
          />
        )}
        {estado.kind === "idle" && !carregando && (
          <p className="player-hint">
            Exporte um pack na TelaFlow Cloud e selecione a pasta do export (subpasta
            nomeada pelo <code>export_id</code>) que contém os seis arquivos JSON.
          </p>
        )}
      </section>
    </main>
  );
}

function sceneActivationMessage(pack: PackLoaderSuccess, index: number): string {
  const ordenadas = [...pack.event.scenes]
    .filter((sc) => sc.enabled)
    .sort((a, b) => {
      const o = a.sort_order - b.sort_order;
      return o !== 0 ? o : a.scene_id.localeCompare(b.scene_id);
    });
  const sc = ordenadas[index];
  if (!sc) return `scene_index=${index} (sem cena)`;
  return `scene_index=${index}; scene_id=${sc.scene_id}; name=${sc.name}; type=${sc.type}`;
}
