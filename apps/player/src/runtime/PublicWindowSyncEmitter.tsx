/**
 * Emite snapshot derivado do Runtime Session Store para a webview `public` (Tauri `emitTo`).
 * Só leitura — nunca altera o store.
 */

import { useEffect, useMemo, useRef } from "react";
import { useRuntimeSession } from "./RuntimeSessionContext.js";
import { derivarSnapshotJanelaPublica, emitirSnapshotJanelaPublica } from "./publicWindowBridge.js";

type Props = {
  fileExistsCache: Map<string, boolean>;
};

export function PublicWindowSyncEmitter({ fileExistsCache }: Props) {
  const { estado } = useRuntimeSession();

  const snapshot = useMemo(
    () => derivarSnapshotJanelaPublica(estado, fileExistsCache),
    [estado.appState, estado.drawRuntime, estado.operationalContext, fileExistsCache],
  );

  const serial = useRef(0);

  useEffect(() => {
    serial.current += 1;
    const n = serial.current;
    const enviar = () => {
      if (n !== serial.current) return;
      void emitirSnapshotJanelaPublica(snapshot);
    };
    /* Garante entrega após a webview pública registrar o listener (corrida na abertura). */
    enviar();
    const t = window.setTimeout(enviar, 120);
    return () => window.clearTimeout(t);
  }, [snapshot]);

  return null;
}
