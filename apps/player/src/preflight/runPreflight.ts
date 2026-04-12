/**
 * Motor de pre-flight MVP (sem execução de cenas, sem playback).
 * Grupos parciais: G1 pack, G2 licença, G3 mídia+binding, G4 roteiro mínimo, G5 workspace.
 */

import { invoke } from "@tauri-apps/api/core";
import {
  evaluateLicense,
  type LicenseEvaluation,
} from "../license/licenseValidator.js";
import type { PackLoaderSuccess } from "../pack/validateLoadedPack.js";
import type { PreflightItem, PreflightResult } from "./types.js";

async function existeFicheiro(workspace: string, relativo: string): Promise<boolean> {
  try {
    return await invoke<boolean>("file_exists_under_workspace", {
      workspacePath: workspace,
      relative: relativo,
    });
  } catch {
    return false;
  }
}

function push(
  items: PreflightItem[],
  it: Omit<PreflightItem, "severity"> & { severity: PreflightItem["severity"] },
) {
  items.push(it);
}

export async function runPreflightMvp(input: {
  packData: PackLoaderSuccess;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  nowMs?: number;
}): Promise<PreflightResult> {
  const nowMs = input.nowMs ?? Date.now();
  const items: PreflightItem[] = [];
  const { packData } = input;
  const manifest = packData.manifest;
  const event = packData.event;
  const mediaManifest = packData.mediaManifest;
  const drawList = packData.drawConfigs.draw_configs;

  push(items, {
    check_id: "pack.loaded",
    group: "G1",
    severity: "ok",
    message: "Pack carregado e artefatos principais presentes.",
    code: "PACK_OK",
  });

  const lic: LicenseEvaluation = evaluateLicense(packData.license, {
    nowMs,
    expectedEventId: manifest.event_id,
    expectedExportId: manifest.export_id,
    expectedOrganizationId: manifest.organization_id,
  });
  if (lic.status !== "valid") {
    push(items, {
      check_id: "license.window",
      group: "G2",
      severity: "bloqueante",
      fatality: "fatal",
      message:
        lic.detail ??
        `Licença não válida para execução (${lic.status}). Corrija o pack ou o relógio do sistema.`,
      code: `LICENSE_${lic.status.toUpperCase()}`,
    });
  } else {
    push(items, {
      check_id: "license.window",
      group: "G2",
      severity: "ok",
      message: `Licença válida até ${lic.license?.valid_until ?? "(desconhecido)"}.`,
      code: "LICENSE_OK",
    });
  }

  const ws = input.workspaceRoot?.trim() || null;
  if (!ws && mediaManifest.requirements.some((r) => r.required)) {
    push(items, {
      check_id: "workspace.required_for_media",
      group: "G5",
      severity: "bloqueante",
      fatality: "recuperavel",
      message:
        "Defina uma pasta de workspace local para vincular mídia obrigatória antes do show.",
      code: "WORKSPACE_MISSING",
    });
  } else if (!ws) {
    push(items, {
      check_id: "workspace.optional",
      group: "G5",
      severity: "aviso",
      message:
        "Nenhum workspace selecionado — só é obrigatório se existirem requisitos de mídia marcados como obrigatórios.",
      code: "WORKSPACE_SKIPPED",
    });
  } else {
    push(items, {
      check_id: "workspace.selected",
      group: "G5",
      severity: "ok",
      message: `Workspace local: ${ws}`,
      code: "WORKSPACE_OK",
    });
  }

  const drawIds = new Set(drawList.map((d) => d.draw_config_id));

  for (const req of mediaManifest.requirements) {
    const rel = input.bindings[req.media_id];
    const label = req.label;
    if (!ws) {
      continue;
    }
    if (!rel || rel.trim() === "") {
      if (req.required) {
        push(items, {
          check_id: "media.required.bound",
          group: "G3",
          severity: "bloqueante",
          fatality: "recuperavel",
          message: `Mídia obrigatória «${label}» (${req.media_id}) não vinculada a um ficheiro.`,
          code: "MEDIA_REQUIRED_UNBOUND",
        });
      } else {
        push(items, {
          check_id: "media.optional.unbound",
          group: "G3",
          severity: "aviso",
          message: `Mídia opcional «${label}» (${req.media_id}) não vinculada.`,
          code: "MEDIA_OPTIONAL_UNBOUND",
        });
      }
      continue;
    }
    const okFile = await existeFicheiro(ws, rel);
    if (!okFile) {
      push(items, {
        check_id: "media.file.missing",
        group: "G3",
        severity: req.required ? "bloqueante" : "aviso",
        fatality: req.required ? "recuperavel" : null,
        message: `Ficheiro em falta para «${label}» (${req.media_id}): ${rel}`,
        code: "MEDIA_FILE_MISSING",
      });
    } else {
      push(items, {
        check_id: "media.file.present",
        group: "G3",
        severity: "ok",
        message: `Mídia «${label}» resolvida: ${rel}`,
        code: "MEDIA_FILE_OK",
      });
    }
  }

  const mediaIds = new Set(mediaManifest.requirements.map((m) => m.media_id));

  for (const scene of event.scenes) {
    if (!scene.enabled) continue;
    if (scene.type === "draw" && !(scene.draw_config_id ?? null)) {
      push(items, {
        check_id: "scene.draw.missing_config",
        group: "G4",
        severity: "bloqueante",
        fatality: "recuperavel",
        message: `Scene «${scene.name}» do tipo draw sem draw_config_id.`,
        code: "SCENE_DRAW_MISSING_CONFIG",
      });
    }
    const mid = scene.media_id ?? null;
    if (mid && !mediaIds.has(mid)) {
      push(items, {
        check_id: "scene.media_id.unknown",
        group: "G4",
        severity: "bloqueante",
        fatality: "recuperavel",
        message: `Scene «${scene.name}» referencia media_id ausente no manifesto: ${mid}`,
        code: "SCENE_MEDIA_UNKNOWN",
      });
    }
    const did = scene.draw_config_id ?? null;
    if (did && !drawIds.has(did)) {
      push(items, {
        check_id: "scene.draw_config.unknown",
        group: "G4",
        severity: "bloqueante",
        fatality: "recuperavel",
        message: `Scene «${scene.name}» referencia draw_config_id ausente no pack: ${did}`,
        code: "SCENE_DRAW_UNKNOWN",
      });
    }
  }

  const blockingCount = items.filter((i) => i.severity === "bloqueante").length;
  const warningCount = items.filter((i) => i.severity === "aviso").length;
  const okCount = items.filter((i) => i.severity === "ok").length;

  return {
    runAt: new Date(nowMs).toISOString(),
    items,
    blockingCount,
    warningCount,
    okCount,
  };
}
