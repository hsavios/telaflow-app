import type { SceneContract } from "@telaflow/shared-contracts";
import { isActiveSession } from "../pack/playerPackState.js";
import type { PackLoaderSuccess } from "../pack/validateLoadedPack.js";
import type { PreflightResult } from "../preflight/types.js";
import { enabledScenesSorted } from "./sceneOrder.js";
import { seletoresComandosUi, type SeletoresComandosUi } from "./commands/commandPolicy.js";
import type {
  DrawRuntimeSlice,
  ExecutionStatusModel,
  OperationalContextIds,
  RuntimeSessionState,
} from "./runtimeSessionTypes.js";

export type RuntimeSessionSelectors = {
  loadedPack: PackLoaderSuccess | null;
  activeSceneId: string | null;
  cenaAtiva: SceneContract | null;
  workspaceRoot: string | null;
  mediaBindings: Record<string, string>;
  lastPreflight: PreflightResult | null;
  executionStatus: ExecutionStatusModel;
  drawRuntime: DrawRuntimeSlice;
  operationalContext: OperationalContextIds;
  comandos: SeletoresComandosUi;
};

function indiceCenaSeguro(ordenadas: SceneContract[], sceneIndex: number): number {
  const n = ordenadas.length;
  if (n === 0) return 0;
  return Math.min(Math.max(0, sceneIndex), n - 1);
}

export function seletoresSessaoRuntime(estado: RuntimeSessionState): RuntimeSessionSelectors {
  const { appState, drawRuntime } = estado;

  if (!isActiveSession(appState)) {
    return {
      loadedPack: null,
      activeSceneId: null,
      cenaAtiva: null,
      workspaceRoot: null,
      mediaBindings: {},
      lastPreflight: null,
      executionStatus: {
        fase: appState.kind,
        emExecucao: false,
        executionLog: [],
        sceneIndex: 0,
      },
      drawRuntime,
      operationalContext: estado.operationalContext,
      comandos: seletoresComandosUi(estado),
    };
  }

  const ordenadas = enabledScenesSorted(appState.packData.event.scenes);
  const idx = indiceCenaSeguro(ordenadas, appState.sceneIndex);
  const cenaAtiva = ordenadas.length > 0 ? ordenadas[idx]! : null;

  return {
    loadedPack: appState.packData,
    activeSceneId: cenaAtiva?.scene_id ?? null,
    cenaAtiva,
    workspaceRoot: appState.workspaceRoot,
    mediaBindings: appState.bindings,
    lastPreflight: appState.lastPreflight,
    executionStatus: {
      fase: appState.kind,
      emExecucao: appState.kind === "executing",
      executionLog: appState.executionLog,
      sceneIndex: appState.sceneIndex,
    },
    drawRuntime,
    operationalContext: estado.operationalContext,
    comandos: seletoresComandosUi(estado),
  };
}
