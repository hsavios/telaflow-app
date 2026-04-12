import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import { PackLoadedWorkspace } from "./components/PackLoadedWorkspace.js";
import {
  evaluateLicense,
  formatLicenseBlockMessage,
} from "./license/licenseValidator.js";
import { isActiveSession } from "./pack/playerPackState.js";
import type { LoadedPackInvokePayload } from "./pack/validateLoadedPack.js";
import { validateLoadedPackPayload } from "./pack/validateLoadedPack.js";
import { RuntimeSessionProvider, useRuntimeSession } from "./runtime/RuntimeSessionContext.js";
import "./App.css";

function AppShell() {
  const { estado, acoes } = useRuntimeSession();
  const appState = estado.appState;
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
        acoes.sessaoDescarregar();
        return;
      }
      if (Array.isArray(selecionado)) {
        acoes.bloquearPack("Seleção inválida: esperada uma única pasta.");
        return;
      }

      const bruto = await invoke<LoadedPackInvokePayload>("load_pack_from_directory", {
        path: selecionado,
      });
      const validado = validateLoadedPackPayload(bruto);
      if (!validado.ok) {
        acoes.bloquearPack(`[${validado.phase}] ${validado.message}`);
        return;
      }

      const lic = evaluateLicense(validado.license, {
        nowMs: Date.now(),
        expectedEventId: validado.manifest.event_id,
        expectedExportId: validado.manifest.export_id,
        expectedOrganizationId: validado.manifest.organization_id,
      });
      if (lic.status !== "valid") {
        acoes.bloquearPack(`Licença: ${formatLicenseBlockMessage(lic)}`);
        return;
      }

      acoes.carregarPackValido(bruto.rootPath, validado);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      acoes.bloquearPack(`Falha ao carregar pack: ${msg}`);
    } finally {
      setCarregando(false);
    }
  }, [acoes]);

  const descarregar = useCallback(() => {
    acoes.sessaoDescarregar();
  }, [acoes]);

  const wideShell = appState.kind === "executing";

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
        {appState.kind !== "idle" && (
          <button type="button" disabled={carregando} onClick={descarregar}>
            Descarregar
          </button>
        )}
      </section>

      <section className="player-status" aria-live="polite">
        <h2>Estado</h2>
        <p>
          <strong>{appState.kind}</strong>
        </p>
        {appState.kind === "blocked" && <pre className="player-error">{appState.message}</pre>}
        {isActiveSession(appState) && <PackLoadedWorkspace />}
        {appState.kind === "idle" && !carregando && (
          <p className="player-hint">
            Exporte um pack na TelaFlow Cloud e selecione a pasta do export (subpasta
            nomeada pelo <code>export_id</code>) que contém os seis arquivos JSON.
          </p>
        )}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <RuntimeSessionProvider>
      <AppShell />
    </RuntimeSessionProvider>
  );
}
