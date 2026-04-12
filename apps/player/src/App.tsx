import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import { PackLoadedWorkspace } from "./components/PackLoadedWorkspace.js";
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

      setEstado({
        kind: "pack_loaded",
        packRoot: bruto.rootPath,
        packData: validado,
        workspaceRoot: null,
        bindings: {},
        lastPreflight: null,
        operationalPhase: "binding_pending",
        sceneIndex: 0,
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
      return {
        ...s,
        workspaceRoot: root,
        bindings: nextBindings,
        lastPreflight: null,
        operationalPhase: "binding_pending",
      };
    });
  }, []);

  const onBindingsChange = useCallback((next: Record<string, string>) => {
    setEstado((s) => {
      if (s.kind !== "pack_loaded") return s;
      return {
        ...s,
        bindings: next,
        lastPreflight: null,
        operationalPhase: "binding_pending",
      };
    });
  }, []);

  const onPreflightComplete = useCallback((r: PreflightResult) => {
    setEstado((s) => {
      if (s.kind !== "pack_loaded") return s;
      const phase = phaseAfterPreflight(r);
      return {
        ...s,
        lastPreflight: r,
        operationalPhase: phase,
      };
    });
  }, []);

  const onStartExecution = useCallback(() => {
    setEstado((s) => {
      if (s.kind !== "pack_loaded" || s.operationalPhase !== "ready") return s;
      return {
        ...s,
        operationalPhase: "executing",
        sceneIndex: 0,
      };
    });
  }, []);

  const onSceneIndexChange = useCallback((next: number) => {
    setEstado((s) => {
      if (s.kind !== "pack_loaded" || s.operationalPhase !== "executing") return s;
      return { ...s, sceneIndex: next };
    });
  }, []);

  return (
    <main className="player-shell">
      <header className="player-header">
        <h1>TelaFlow Player</h1>
        <p className="player-tagline">
          Pack, licença, vínculos, pre-flight e FSM operacional — sem Cloud em runtime e sem
          playback de mídia.
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
