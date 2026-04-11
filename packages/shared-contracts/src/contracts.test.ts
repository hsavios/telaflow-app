import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DrawConfigContractSchema,
  EventContractSchema,
  EventIdSchema,
  EventSnapshotSchema,
  EXPORT_READINESS_SCHEMA_VERSION,
  ExportReadinessV1Schema,
  MediaRequirementContractSchema,
  PACK_VERSION,
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
