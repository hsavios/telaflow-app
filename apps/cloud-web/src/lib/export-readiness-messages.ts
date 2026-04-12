import type { ExportReadinessBlocking } from "@/lib/cloud-api";

export function blockingLine(b: ExportReadinessBlocking): string {
  switch (b.code) {
    case "no_scenes":
      return b.message ?? "Nenhuma scene no evento.";
    case "sort_order_invalid":
      return b.message ?? "Ordem inválida: use 0..n-1 sem buracos.";
    case "all_scenes_disabled":
      return b.message ?? "Todas as scenes estão desabilitadas.";
    case "scene_name_empty":
      return `Scene sem nome válido (${b.scene_id ?? "?"})`;
    case "scene_type_missing":
      return `Scene sem tipo (${b.scene_id ?? "?"})`;
    case "scene_media_unknown":
      return `Scene referencia media_id inexistente (${b.media_id ?? "?"})`;
    case "scene_draw_unknown":
      return `Scene referencia sorteio inexistente (${b.draw_config_id ?? "?"})`;
    case "draw_scene_missing_trigger":
      return `Scene de sorteio sem DrawConfig vinculado (${b.scene_id ?? "?"})`;
    default:
      return b.message ?? b.code;
  }
}

export function warningLine(w: ExportReadinessBlocking): string {
  switch (w.code) {
    case "required_media_not_linked":
      return `Mídia obrigatória ainda não usada em nenhuma scene: ${w.label ?? w.media_id ?? "?"}`;
    case "draw_config_unused":
      return `Sorteio cadastrado mas não referenciado no roteiro: ${w.name ?? w.draw_config_id ?? "?"}`;
    case "sponsor_scene_no_primary_media":
      return `Scene patrocinador sem mídia principal (${w.scene_id ?? "?"})`;
    case "draw_config_disabled_referenced":
      return `Scene referencia sorteio desabilitado (${w.scene_id ?? "?"})`;
    case "media_requirement_scene_hint_mismatch":
      return `Slot de mídia sugere outra scene que a que referencia o media_id (${w.scene_id ?? "?"})`;
    default:
      return w.message ?? w.code;
  }
}
