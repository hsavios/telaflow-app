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
    /* Estado completo: evita telão defasado se só mudarem bindings, índice de cena ou IDs operacionais. */
    [estado, fileExistsCache],
  );

  const serial = useRef(0);

  useEffect(() => {
    serial.current += 1;
    const n = serial.current;
    const enviar = () => {
      if (n !== serial.current) return;
      void emitirSnapshotJanelaPublica(snapshot);
    };
    /* Reemissões curtas cobrem corrida ao abrir o telão e webview lenta. */
    enviar();
    const t1 = window.setTimeout(enviar, 120);
    const t2 = window.setTimeout(enviar, 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [snapshot]);

  return null;
}
