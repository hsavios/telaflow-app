/**
 * Validação Zod (shared-contracts) + coerência mínima entre artefatos.
 * Não substitui pre-flight completo (PRE_FLIGHT_FEATURE_SPEC) — só loader MVP.
 */

import {
  BrandingExportMvpSchema,
  DrawConfigsPackFileSchema,
  EventExportFileSchema,
  LicenseExportMvpSchema,
  MediaManifestPackFileSchema,
  PackManifestMvpSchema,
} from "@telaflow/shared-contracts";

export type PackLoaderPhase =
  | "manifest"
  | "event"
  | "draw_configs"
  | "media_manifest"
  | "branding"
  | "license"
  | "coherence";

export type PackLoaderFailure = {
  ok: false;
  phase: PackLoaderPhase;
  message: string;
};

export type PackLoaderSuccess = {
  ok: true;
  manifest: ReturnType<typeof PackManifestMvpSchema.parse>;
  event: ReturnType<typeof EventExportFileSchema.parse>;
  drawConfigs: ReturnType<typeof DrawConfigsPackFileSchema.parse>;
  mediaManifest: ReturnType<typeof MediaManifestPackFileSchema.parse>;
  branding: ReturnType<typeof BrandingExportMvpSchema.parse>;
  license: ReturnType<typeof LicenseExportMvpSchema.parse>;
};

export type LoadedPackInvokePayload = {
  rootPath: string;
  manifest: unknown;
  event: unknown;
  drawConfigs: unknown;
  mediaManifest: unknown;
  branding: unknown;
  license: unknown;
};

function formatZodMessage(label: string, err: { message: string }): string {
  return `${label}: ${err.message}`;
}

/** Valida presença estrutural e ids cruzados mínimos entre artefatos do pack MVP. */
export function validateLoadedPackPayload(
  payload: LoadedPackInvokePayload,
): PackLoaderSuccess | PackLoaderFailure {
  const m = PackManifestMvpSchema.safeParse(payload.manifest);
  if (!m.success) {
    return {
      ok: false,
      phase: "manifest",
      message: formatZodMessage("manifest.json", m.error),
    };
  }

  const ev = EventExportFileSchema.safeParse(payload.event);
  if (!ev.success) {
    return {
      ok: false,
      phase: "event",
      message: formatZodMessage("event.json", ev.error),
    };
  }

  const dc = DrawConfigsPackFileSchema.safeParse(payload.drawConfigs);
  if (!dc.success) {
    return {
      ok: false,
      phase: "draw_configs",
      message: formatZodMessage("draw-configs.json", dc.error),
    };
  }

  const mm = MediaManifestPackFileSchema.safeParse(payload.mediaManifest);
  if (!mm.success) {
    return {
      ok: false,
      phase: "media_manifest",
      message: formatZodMessage("media-manifest.json", mm.error),
    };
  }

  const br = BrandingExportMvpSchema.safeParse(payload.branding);
  if (!br.success) {
    return {
      ok: false,
      phase: "branding",
      message: formatZodMessage("branding.json", br.error),
    };
  }

  const lic = LicenseExportMvpSchema.safeParse(payload.license);
  if (!lic.success) {
    return {
      ok: false,
      phase: "license",
      message: formatZodMessage("license.json", lic.error),
    };
  }

  const manifest = m.data;
  const event = ev.data;
  const drawConfigs = dc.data;
  const mediaManifest = mm.data;
  const branding = br.data;
  const license = lic.data;

  if (manifest.event_id !== event.event_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "manifest.event_id difere de event.json.event_id",
    };
  }
  if (manifest.organization_id !== event.organization_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "manifest.organization_id difere de event.json.organization_id",
    };
  }
  if (drawConfigs.event_id !== manifest.event_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "draw-configs.json.event_id inconsistente com o manifest",
    };
  }
  if (mediaManifest.event_id !== manifest.event_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "media-manifest.json.event_id inconsistente com o manifest",
    };
  }
  if (branding.event_id !== manifest.event_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "branding.json.event_id inconsistente com o manifest",
    };
  }
  if (license.event_id !== manifest.event_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "license.json.event_id inconsistente com o manifest",
    };
  }
  if (drawConfigs.export_id !== manifest.export_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "draw-configs.json.export_id inconsistente com o manifest",
    };
  }
  if (mediaManifest.export_id !== manifest.export_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "media-manifest.json.export_id inconsistente com o manifest",
    };
  }
  if (branding.export_id !== manifest.export_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "branding.json.export_id inconsistente com o manifest",
    };
  }
  if (license.export_id !== manifest.export_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "license.json.export_id inconsistente com o manifest",
    };
  }
  if (license.organization_id !== manifest.organization_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "license.json.organization_id inconsistente com o manifest",
    };
  }
  if (branding.organization_id !== manifest.organization_id) {
    return {
      ok: false,
      phase: "coherence",
      message: "branding.json.organization_id inconsistente com o manifest",
    };
  }

  return {
    ok: true,
    manifest,
    event,
    drawConfigs,
    mediaManifest,
    branding,
    license,
  };
}
