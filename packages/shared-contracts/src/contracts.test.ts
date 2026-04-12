import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BrandingExportMvpSchema,
  DrawConfigContractSchema,
  EventContractSchema,
  EventExportFileSchema,
  EventIdSchema,
  EventSnapshotSchema,
  EXPORT_READINESS_SCHEMA_VERSION,
  ExportReadinessV1Schema,
  LicenseExportMvpSchema,
  MediaRequirementContractSchema,
  PACK_VERSION,
  PackManifestMvpSchema,
  PackMetadataSchema,
  SCHEMA_VERSION,
  SNAPSHOT_VERSION,
  SceneContractSchema,
} from "./index.js";

const iso = () => new Date().toISOString();

const validOrg = "org_sample001";
const validEvt = "evt_sample001";
const validPack = "pack_sample001";
const validExp = "exp_sample001";
const validScn = "scn_sample001";
const validMed = "med_sample0001";
const validDcf = "dcf_sample0001";
const validExp2 = "exp_sample0002";

const __contractsDir = dirname(fileURLToPath(import.meta.url));

function parseFixtureJson(raw: string): unknown {
  return JSON.parse(raw.replace(/^\uFEFF/, "").trimStart()) as unknown;
}

describe("opaque ids", () => {
  it("accepts valid id", () => {
    expect(EventIdSchema.safeParse(validEvt).success).toBe(true);
  });

  it("rejects too short", () => {
    expect(EventIdSchema.safeParse("short").success).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(EventIdSchema.safeParse("x".repeat(12) + " ").success).toBe(false);
    expect(EventIdSchema.safeParse("invalid id!!").success).toBe(false);
  });

  it("rejects overlong id", () => {
    expect(EventIdSchema.safeParse("a".repeat(65)).success).toBe(false);
  });
});

describe("EventContractSchema", () => {
  const valid = {
    event_id: validEvt,
    organization_id: validOrg,
    name: "Conference",
  };

  it("parses valid event", () => {
    const r = EventContractSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(
      EventContractSchema.safeParse({ ...valid, name: "" }).success,
    ).toBe(false);
  });
});

describe("SceneContractSchema", () => {
  const base = {
    scene_id: validScn,
    event_id: validEvt,
    sort_order: 0,
    type: "opening" as const,
    name: "Intro",
  };

  it("parses valid scene with default enabled", () => {
    const r = SceneContractSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.enabled).toBe(true);
  });

  it("parses explicit enabled false", () => {
    const r = SceneContractSchema.safeParse({ ...base, enabled: false });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.enabled).toBe(false);
  });

  it("rejects invalid scene type", () => {
    expect(
      SceneContractSchema.safeParse({ ...base, type: "abertura" }).success,
    ).toBe(false);
  });

  it("parses optional media_id and draw_config_id", () => {
    const r = SceneContractSchema.safeParse({
      ...base,
      media_id: validMed,
      draw_config_id: validDcf,
    });
    expect(r.success).toBe(true);
  });

  it("rejects too-short media_id", () => {
    expect(
      SceneContractSchema.safeParse({ ...base, media_id: "short" }).success,
    ).toBe(false);
  });

  it("parses optional scene_behavior", () => {
    const r = SceneContractSchema.safeParse({
      ...base,
      scene_behavior: { mode: "draw_operator_confirm" },
    });
    expect(r.success).toBe(true);
  });
});

describe("DrawConfigContractSchema", () => {
  it("parses valid draw config", () => {
    const r = DrawConfigContractSchema.safeParse({
      draw_config_id: validDcf,
      event_id: validEvt,
      name: "Sorteio principal",
      max_winners: 3,
      enabled: true,
    });
    expect(r.success).toBe(true);
  });

  it("parses draw config with number_range", () => {
    const r = DrawConfigContractSchema.safeParse({
      draw_config_id: validDcf,
      event_id: validEvt,
      name: "Rifa",
      max_winners: 1,
      enabled: true,
      draw_type: "number_range",
      number_range: { min: 1, max: 500 },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.number_range).toEqual({ min: 1, max: 500 });
    }
  });

  it("rejects number_range when max < min", () => {
    const r = DrawConfigContractSchema.safeParse({
      draw_config_id: validDcf,
      event_id: validEvt,
      name: "X",
      number_range: { min: 10, max: 2 },
    });
    expect(r.success).toBe(false);
  });

  it("parses optional public_copy", () => {
    const r = DrawConfigContractSchema.safeParse({
      draw_config_id: validDcf,
      event_id: validEvt,
      name: "Sorteio",
      public_copy: {
        headline: "Prêmios",
        audience_instructions: "Aguarde o sorteio.",
        result_label: "Número sorteado",
      },
    });
    expect(r.success).toBe(true);
  });
});

describe("MediaRequirementContractSchema", () => {
  it("parses valid media requirement", () => {
    const r = MediaRequirementContractSchema.safeParse({
      media_id: validMed,
      event_id: validEvt,
      label: "Vinheta",
      media_type: "video",
      required: true,
    });
    expect(r.success).toBe(true);
  });

  it("parses usage_role and presentation", () => {
    const r = MediaRequirementContractSchema.safeParse({
      media_id: validMed,
      event_id: validEvt,
      label: "Logo",
      media_type: "image",
      usage_role: "brand_mark",
      presentation: "contain",
    });
    expect(r.success).toBe(true);
  });
});

describe("ExportReadinessV1Schema", () => {
  it("parses minimal readiness payload", () => {
    const r = ExportReadinessV1Schema.safeParse({
      schema_version: EXPORT_READINESS_SCHEMA_VERSION,
      ready: false,
      sort_order_ok: true,
      blocking: [
        { severity: "blocking", code: "no_scenes", message: "…" },
      ],
      warnings: [],
      lifecycle_counts: { draft: 0, blocked: 0, warning: 0, ready: 0 },
      scene_evaluations: [],
      scene_count: 0,
      draw_config_count: 0,
      media_requirement_count: 0,
    });
    expect(r.success).toBe(true);
  });
});

describe("ExportReadinessV1Schema — fixtures (espelho Cloud API)", () => {
  it("aceita fixture ready (GET …/export-readiness)", () => {
    const raw = readFileSync(
      join(__contractsDir, "fixtures/export-readiness-v1.ready.json"),
      "utf8",
    );
    const data = parseFixtureJson(raw);
    const r = ExportReadinessV1Schema.safeParse(data);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.schema_version).toBe(EXPORT_READINESS_SCHEMA_VERSION);
      expect(r.data.ready).toBe(true);
      expect(r.data.sort_order_ok).toBe(true);
    }
  });

  it("aceita fixture com bloqueantes e avisos", () => {
    const raw = readFileSync(
      join(__contractsDir, "fixtures/export-readiness-v1.blocked.json"),
      "utf8",
    );
    const data = parseFixtureJson(raw);
    const r = ExportReadinessV1Schema.safeParse(data);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ready).toBe(false);
      expect(r.data.sort_order_ok).toBe(false);
      expect(r.data.blocking.some((b) => b.code === "sort_order_invalid")).toBe(
        true,
      );
      expect(
        r.data.warnings.some((w) => w.code === "required_media_not_linked"),
      ).toBe(true);
      expect(r.data.scene_evaluations).toHaveLength(4);
    }
  });
});

describe("Pack MVP artifact schemas", () => {
  const iso = "2026-04-10T12:00:00Z";

  it("parses pack manifest MVP", () => {
    const r = PackManifestMvpSchema.safeParse({
      schema_version: "pack_manifest.v1",
      pack_format: "telaflow_direct_export_mvp",
      export_id: validExp2,
      generated_at: iso,
      event_id: validEvt,
      organization_id: validOrg,
      artifacts: [
        { path: "event.json", role: "event_snapshot" },
        { path: "draw-configs.json", role: "draw_configs" },
        { path: "media-manifest.json", role: "media_manifest" },
        { path: "branding.json", role: "branding" },
        { path: "license.json", role: "license" },
      ],
      gate: { export_readiness_schema: "export_readiness.v1" },
    });
    expect(r.success).toBe(true);
  });

  it("parses event export file", () => {
    const r = EventExportFileSchema.safeParse({
      schema_version: "event_export.v1",
      event_id: validEvt,
      organization_id: validOrg,
      name: "Show",
      scenes: [
        {
          scene_id: validScn,
          event_id: validEvt,
          sort_order: 0,
          type: "opening",
          name: "Abertura",
          enabled: true,
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("parses license export MVP", () => {
    const r = LicenseExportMvpSchema.safeParse({
      schema_version: "license_export.v1",
      organization_id: validOrg,
      event_id: validEvt,
      export_id: validExp2,
      issued_at: iso,
      valid_from: iso,
      valid_until: "2026-05-10T12:00:00Z",
      scope: "event_player_binding_mvp",
    });
    expect(r.success).toBe(true);
  });

  it("parses branding export with scene_type_presets", () => {
    const r = BrandingExportMvpSchema.safeParse({
      schema_version: "branding_export.v1",
      event_id: validEvt,
      organization_id: validOrg,
      export_id: validExp2,
      resolved_at: iso,
      source: "default_mvp",
      tokens: {
        primary_color: "#000",
        accent_color: "#0ff",
        font_family_sans: "system-ui",
      },
      scene_type_presets: {
        draw: { default_behavior_mode: "draw_operator_confirm" },
        opening: { default_behavior_mode: "standard" },
      },
    });
    expect(r.success).toBe(true);
  });
});

describe("PackMetadataSchema", () => {
  const valid = {
    pack_version: PACK_VERSION,
    schema_version: SCHEMA_VERSION,
    app_min_player: "0.1.0",
    pack_id: validPack,
    export_id: validExp,
    event_id: validEvt,
    organization_id: validOrg,
    generated_at: iso(),
  };

  it("parses valid pack metadata", () => {
    expect(PackMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing pack_id", () => {
    const { pack_id: _, ...rest } = valid;
    expect(PackMetadataSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects wrong pack_version literal", () => {
    expect(
      PackMetadataSchema.safeParse({ ...valid, pack_version: "0.0.1" }).success,
    ).toBe(false);
  });
});

describe("EventSnapshotSchema", () => {
  const valid = {
    snapshot_version: SNAPSHOT_VERSION,
    event: {
      event_id: validEvt,
      organization_id: validOrg,
      name: "E",
    },
    scenes: [
      {
        scene_id: validScn,
        event_id: validEvt,
        sort_order: 0,
        type: "opening" as const,
        name: "S",
      },
    ],
  };

  it("parses valid snapshot", () => {
    expect(EventSnapshotSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects wrong snapshot_version", () => {
    expect(
      EventSnapshotSchema.safeParse({
        ...valid,
        snapshot_version: "2.0.0",
      }).success,
    ).toBe(false);
  });
});
