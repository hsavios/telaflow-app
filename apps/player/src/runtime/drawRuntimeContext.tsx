/**
 * Estado do sorteio (MVP) compartilhado entre a visão do operador (DrawScenePanel) e a visão pública.
 * Preparação para dual-screen futuro: uma única fonte de verdade por cena/config ativa.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

/** Estados internos do painel de sorteio (FSM do draw, não o estado operacional do Player). */
export type DrawPanelState =
  | "idle"
  | "ready"
  | "drawing"
  | "result_generated"
  | "result_confirmed"
  | "error";

export type DrawRuntimeValue = {
  /** Chave estável para reset ao mudar de cena ou de draw_config_id. */
  resetKey: string;
  panelState: DrawPanelState;
  setPanelState: Dispatch<SetStateAction<DrawPanelState>>;
  winnerValue: number | null;
  setWinnerValue: Dispatch<SetStateAction<number | null>>;
  errorMessage: string | null;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
};

const DrawRuntimeContext = createContext<DrawRuntimeValue | null>(null);

type ProviderProps = {
  /** Tipicamente `${scene_id}:${draw_config_id ?? ""}`. */
  resetKey: string;
  children: ReactNode;
};

export function DrawRuntimeProvider({ resetKey, children }: ProviderProps) {
  const [panelState, setPanelState] = useState<DrawPanelState>("idle");
  const [winnerValue, setWinnerValue] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPanelState("idle");
    setWinnerValue(null);
    setErrorMessage(null);
  }, [resetKey]);

  const value = useMemo(
    (): DrawRuntimeValue => ({
      resetKey,
      panelState,
      setPanelState,
      winnerValue,
      setWinnerValue,
      errorMessage,
      setErrorMessage,
    }),
    [resetKey, panelState, winnerValue, errorMessage],
  );

  return <DrawRuntimeContext.Provider value={value}>{children}</DrawRuntimeContext.Provider>;
}

export function useDrawRuntime(): DrawRuntimeValue {
  const v = useContext(DrawRuntimeContext);
  if (!v) {
    throw new Error("useDrawRuntime: use dentro de DrawRuntimeProvider.");
  }
  return v;
}
