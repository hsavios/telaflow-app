/**
 * Entrada React da janela pública dedicada (Tauri webview `public`).
 * Recebe apenas snapshots por evento — sem store, sem transições, sem escrita.
 */

import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import { PublicSceneView } from "./runtime/PublicSceneView.js";
import {
  PUBLIC_WINDOW_STATE_EVENT,
  type PublicWindowOperatorSnapshot,
} from "./runtime/publicWindowBridge.js";

function PublicWindowRoot() {
  const [payload, setPayload] = useState<PublicWindowOperatorSnapshot | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<PublicWindowOperatorSnapshot>(PUBLIC_WINDOW_STATE_EVENT, (event) => {
      setPayload(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  if (!payload?.activeScene) {
    const fase = payload?.appState.kind ?? "idle";
    const aguardandoExecucao = fase !== "executing";
    return (
      <div className="public-window-root public-window-root--waiting">
        <p className="public-window-root__title">TelaFlow — Saída pública</p>
        <p className="public-window-root__hint">
          {aguardandoExecucao
            ? "Aguardando o operador iniciar ou retomar a execução do roteiro na janela principal…"
            : "Aguardando cena ativa no roteiro…"}
        </p>
        <p className="public-window-root__meta" aria-hidden="true">
          Estado: <code>{fase}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="public-window-root">
      {payload.eventName ? (
        <p className="public-window-root__event-name">{payload.eventName}</p>
      ) : null}
      <section className="player-exec-public-shell" aria-label="Conteúdo público da cena">
        <PublicSceneView
          scene={payload.activeScene}
          mediaState={payload.mediaState}
          drawConfig={payload.drawConfig}
          workspaceRoot={payload.workspaceRoot}
          bindings={payload.bindings}
          mediaRequirement={payload.mediaRequirement}
          drawMirrorMode="remote"
          remoteDrawSnapshot={payload.drawRuntime}
        />
      </section>
    </div>
  );
}

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(<PublicWindowRoot />);
}
