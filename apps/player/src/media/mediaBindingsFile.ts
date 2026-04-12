/**
 * Persistência local de bindings mídia → arquivo (caminhos relativos ao workspace).
 */

import { z } from "zod";

export const MEDIA_BINDINGS_FILE_VERSION = "telaflow_player_media_bindings.v1" as const;

/** Relativo à raiz do workspace: `.telaflow/media-bindings.json` */
export const MEDIA_BINDINGS_RELATIVE_PATH = ".telaflow/media-bindings.json";

export const MediaBindingsFileSchema = z.object({
  schema_version: z.literal(MEDIA_BINDINGS_FILE_VERSION),
  event_id: z.string().min(12),
  export_id: z.string().min(12),
  /** media_id → caminho relativo POSIX (sem `..`, sem absolutos). */
  bindings: z.record(z.string(), z.string()),
});

export type MediaBindingsFile = z.infer<typeof MediaBindingsFileSchema>;

export function createEmptyBindingsFile(
  eventId: string,
  exportId: string,
): MediaBindingsFile {
  return {
    schema_version: MEDIA_BINDINGS_FILE_VERSION,
    event_id: eventId,
    export_id: exportId,
    bindings: {},
  };
}

export function serializeBindingsFile(doc: MediaBindingsFile): string {
  const bindingsOrdenados = Object.fromEntries(
    Object.keys(doc.bindings)
      .sort()
      .map((k) => [k, doc.bindings[k]]),
  );
  const ordered: MediaBindingsFile = {
    schema_version: doc.schema_version,
    event_id: doc.event_id,
    export_id: doc.export_id,
    bindings: bindingsOrdenados,
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}
