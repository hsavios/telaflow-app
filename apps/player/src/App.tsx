import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import { PackLoadedWorkspace } from "./components/PackLoadedWorkspace.js";
import {
  evaluateLicense,
  formatLicenseBlockMessage,
} from "./license/licenseValidator.js";
import { isActiveSession, type PlayerAppState } from "./pack/playerPackState.js";
import type { LoadedPackInvokePayload } from "./pack/validateLoadedPack.js";
import { validateLoadedPackPayload } from "./pack/validateLoadedPack.js";
import { describeOperationalKindPt } from "./runtime/operationalState.js";
import { RuntimeSessionProvider, useRuntimeSession } from "./runtime/RuntimeSessionContext.js";
import "./App.css";

function legendaEstadoApp(appState: PlayerAppState): string {
  switch (appState.kind) {
    case "idle":
      return "Aguardando pasta do export";
    case "blocked":
      return "Não foi possível carregar ou continuar";
    case "pack_loaded":
    case "preflight_failed":
    case "ready":
    case "executing":
      return describeOperationalKindPt(appState.kind);
  }
}

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
        title: "Selecionar pasta do pack exportado",
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
          Abra seu evento, vincule os arquivos e apresente: painel do operador e telão para o público.
        </p>
      </header>

      <section className="player-actions">
        <button type="button" disabled={carregando} onClick={abrirPastaPack}>
          {carregando ? "Abrindo…" : "Abrir evento"}
        </button>
        {appState.kind !== "idle" && (
          <button type="button" disabled={carregando} onClick={descarregar}>
            Descarregar
          </button>
        )}
      </section>

      <section className="player-status" aria-live="polite">
        <h2>Andamento</h2>
        <p>
          <strong>{legendaEstadoApp(appState)}</strong>
        </p>
        {appState.kind === "blocked" && <pre className="player-error">{appState.message}</pre>}
        {isActiveSession(appState) && <PackLoadedWorkspace />}
        {appState.kind === "idle" && !carregando && (
          <p className="player-hint">
            Na TelaFlow Cloud, exporte o evento e escolha aqui a pasta gerada pelo export (com os
            arquivos JSON do roteiro e o manifesto).
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
