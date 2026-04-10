/**
 * Zod → JSON Schema (build artefact). Run after `tsc` so `dist/index.js` exists.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  EventContractSchema,
  EventSnapshotSchema,
  OrganizationIdSchema,
  PackMetadataSchema,
  SceneContractSchema,
  SceneTypeSchema,
} from "../dist/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "../dist/schema");
mkdirSync(outDir, { recursive: true });

const baseOpts = { $refStrategy: "none" as const };

function writeSchema(filename: string, schema: Parameters<typeof zodToJsonSchema>[0], name: string) {
  const json = zodToJsonSchema(schema, { ...baseOpts, name });
  writeFileSync(join(outDir, `${filename}.json`), JSON.stringify(json, null, 2) + "\n", "utf8");
}

writeSchema("event-contract", EventContractSchema, "EventContract");
writeSchema("scene-contract", SceneContractSchema, "SceneContract");
writeSchema("pack-metadata", PackMetadataSchema, "PackMetadata");
writeSchema("event-snapshot", EventSnapshotSchema, "EventSnapshot");
writeSchema("opaque-id", OrganizationIdSchema, "OrganizationId");
writeSchema("scene-type", SceneTypeSchema, "SceneType");
