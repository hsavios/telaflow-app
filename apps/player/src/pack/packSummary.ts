import type { PackLoaderSuccess } from "./validateLoadedPack.js";

/** Resumo legível para o operador (sem executar cenas nem pre-flight completo). */
export function buildPackSummary(
  rootPath: string,
  data: PackLoaderSuccess,
): {
  rootPath: string;
  eventName: string;
  exportId: string;
  generatedAt: string;
  sceneCount: number;
  drawConfigCount: number;
  mediaRequirementCount: number;
  packFormat: string;
} {
  return {
    rootPath,
    eventName: data.event.name,
    exportId: data.manifest.export_id,
    generatedAt: data.manifest.generated_at,
    sceneCount: data.event.scenes.length,
    drawConfigCount: data.drawConfigs.draw_configs.length,
    mediaRequirementCount: data.mediaManifest.requirements.length,
    packFormat: data.manifest.pack_format,
  };
}
