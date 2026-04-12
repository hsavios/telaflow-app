import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import { buildPackSummary } from "./pack/packSummary.js";
import type { PlayerPackUiState } from "./pack/playerPackState.js";
import type { LoadedPackInvokePayload } from "./pack/validateLoadedPack.js";
import { validateLoadedPackPayload } from "./pack/validateLoadedPack.js";
import "./App.css";

export default function App() {
  const [estado, setEstado] = useState<PlayerPackUiState>({ kind: "idle" });
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
      const resumo = buildPackSummary(bruto.rootPath, validado);
      setEstado({
        kind: "pack_loaded",
        rootPath: resumo.rootPath,
        eventName: resumo.eventName,
        exportId: resumo.exportId,
        generatedAt: resumo.generatedAt,
        sceneCount: resumo.sceneCount,
        drawConfigCount: resumo.drawConfigCount,
        mediaRequirementCount: resumo.mediaRequirementCount,
        packFormat: resumo.packFormat,
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

  return (
    <main className="player-shell">
      <header className="player-header">
        <h1>TelaFlow Player</h1>
        <p className="player-tagline">
          Loader de pack (MVP) — sem Cloud em runtime, sem execução de cenas, sem
          pre-flight completo.
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
          <dl className="player-summary">
            <div>
              <dt>Pasta</dt>
              <dd>{estado.rootPath}</dd>
            </div>
            <div>
              <dt>Evento</dt>
              <dd>{estado.eventName}</dd>
            </div>
            <div>
              <dt>export_id</dt>
              <dd>
                <code>{estado.exportId}</code>
              </dd>
            </div>
            <div>
              <dt>generated_at</dt>
              <dd>
                <code>{estado.generatedAt}</code>
              </dd>
            </div>
            <div>
              <dt>pack_format</dt>
              <dd>
                <code>{estado.packFormat}</code>
              </dd>
            </div>
            <div>
              <dt>Scenes</dt>
              <dd>{estado.sceneCount}</dd>
            </div>
            <div>
              <dt>Draw configs (no pack)</dt>
              <dd>{estado.drawConfigCount}</dd>
            </div>
            <div>
              <dt>Requisitos de mídia</dt>
              <dd>{estado.mediaRequirementCount}</dd>
            </div>
          </dl>
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
