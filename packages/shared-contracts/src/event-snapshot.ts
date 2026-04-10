import { z } from "zod";
import { SNAPSHOT_VERSION } from "./constants.js";
import { EventContractSchema } from "./event.js";
import { SceneContractSchema } from "./scene.js";

/**
 * Aggregate mínimo: evento + cenas — base natural para export mínimo e APIs de leitura.
 */
export const EventSnapshotSchema = z.object({
  snapshot_version: z.literal(SNAPSHOT_VERSION),
  event: EventContractSchema,
  scenes: z.array(SceneContractSchema),
});

export type EventSnapshot = z.infer<typeof EventSnapshotSchema>;
