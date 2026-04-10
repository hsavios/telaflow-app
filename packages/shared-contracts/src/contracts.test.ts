import { describe, expect, it } from "vitest";
import {
  EventContractSchema,
  EventIdSchema,
  EventSnapshotSchema,
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
