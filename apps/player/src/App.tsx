import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import { PackLoadedWorkspace } from "./components/PackLoadedWorkspace.js";
import { appendExecutionLog } from "./execution/executionLog.js";
import {
  evaluateLicense,
  formatLicenseBlockMessage,
} from "./license/licenseValidator.js";
import type { PlayerAppState } from "./pack/playerPackState.js";
import type { LoadedPackInvokePayload } from "./pack/validateLoadedPack.js";
import { validateLoadedPackPayload } from "./pack/validateLoadedPack.js";
import { phaseAfterPreflight } from "./runtime/operationalState.js";
import type { PreflightResult } from "./preflight/types.js";
import "./App.css";

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

      const log0 = appendExecutionLog([], {
        level: "info",
        code: "PACK_SESSION_START",
        message: `Pack carregado (${validado.manifest.export_id}).`,
      });
      setEstado({
        kind: "pack_loaded",
        packRoot: bruto.rootPath,
        packData: validado,
        workspaceRoot: null,
        bindings: {},
        lastPreflight: null,
        operationalPhase: "binding_pending",
        sceneIndex: 0,
        executionLog: log0,
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
    setEstado({ kind: "idle" });
  }, []);

  const onWorkspaceChange = useCallback((root: string | null, nextBindings: Record<string, string>) => {
    setEstado((s) => {
      if (s.kind !== "pack_loaded") return s;
      const log = appendExecutionLog(s.executionLog, {
        level: "info",
        code: "WORKSPACE_CHANGE",
        message: root ? `Workspace: ${root}` : "Workspace limpo.",
      });
      return {
        ...s,
        workspaceRoot: root,
        bindings: nextBindings,
        lastPreflight: null,
        operationalPhase: "binding_pending",
        executionLog: log,
      };
    });
  }, []);

  const onBindingsChange = useCallback((next: Record<string, string>) => {
    setEstado((s) => {
      if (s.kind !== "pack_loaded") return s;
      const log = appendExecutionLog(s.executionLog, {
        level: "info",
        code: "BINDINGS_UPDATE",
        message: "Bindings de mídia atualizados.",
      });
      return {
        ...s,
        bindings: next,
        lastPreflight: null,
        operationalPhase: "binding_pending",
        executionLog: log,
      };
    });
  }, []);

  const onPreflightComplete = useCallback((r: PreflightResult) => {
    setEstado((s) => {
      if (s.kind !== "pack_loaded") return s;
      const phase = phaseAfterPreflight(r);
      const log = appendExecutionLog(s.executionLog, {
        level: r.blockingCount > 0 ? "warn" : "info",
        code: "PREFLIGHT_RUN",
        message: `Pre-flight: ${r.blockingCount} bloqueante(s), ${r.warningCount} aviso(s). Fase → ${phase}.`,
      });
      return {
        ...s,
        lastPreflight: r,
        operationalPhase: phase,
        executionLog: log,
      };
    });
  }, []);

  const onStartExecution = useCallback(() => {
    setEstado((s) => {
      if (s.kind !== "pack_loaded" || s.operationalPhase !== "ready") return s;
      const log = appendExecutionLog(s.executionLog, {
        level: "info",
        code: "RUNTIME_ENTER_EXECUTING",
        message: "Gate ready: entrada em execução (MVP sem playback).",
      });
      return {
        ...s,
        operationalPhase: "executing",
        sceneIndex: 0,
        executionLog: log,
      };
    });
  }, []);

  const onSceneIndexChange = useCallback((next: number) => {
    setEstado((s) => {
      if (s.kind !== "pack_loaded" || s.operationalPhase !== "executing") return s;
      const log = appendExecutionLog(s.executionLog, {
        level: "info",
        code: "SCENE_INDEX",
        message: `Índice de cena: ${next}.`,
      });
      return { ...s, sceneIndex: next, executionLog: log };
    });
  }, []);

  return (
    <main className="player-shell">
      <header className="player-header">
        <h1>TelaFlow Player</h1>
        <p className="player-tagline">
          Pack, licença, vínculos, pre-flight, FSM, navegação de cenas e registo de execução — sem
          Cloud em runtime e sem playback de mídia.
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
        {estado.kind === "pack_loaded" && (
          <PackLoadedWorkspace
            packRoot={estado.packRoot}
            packData={estado.packData}
            workspaceRoot={estado.workspaceRoot}
            bindings={estado.bindings}
            operationalPhase={estado.operationalPhase}
            sceneIndex={estado.sceneIndex}
            executionLog={estado.executionLog}
            onWorkspaceChange={onWorkspaceChange}
            onBindingsChange={onBindingsChange}
            lastPreflight={estado.lastPreflight}
            onPreflightComplete={onPreflightComplete}
            onStartExecution={onStartExecution}
            onSceneIndexChange={onSceneIndexChange}
          />
        )}
        {estado.kind === "idle" && !carregando && (
          <p className="player-hint">
            Exporte um pack na TelaFlow Cloud e selecione a pasta do export (subpasta
            nomeada pelo <code>export_id</code>) que contém os seis ficheiros JSON.
          </p>
        )}
      </section>
    </main>
  );
}
