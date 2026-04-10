import {
  EventContractSchema,
  PACK_VERSION,
  PackMetadataSchema,
  SCHEMA_VERSION,
  SceneTypeSchema,
} from "@telaflow/shared-contracts";

/**
 * Página de status — skeleton Fase 1 (sem UI de produto).
 * Stub: validação Zod em build-time / runtime leve.
 */
export default function Home() {
  const packStub = PackMetadataSchema.safeParse({
    pack_version: PACK_VERSION,
    schema_version: SCHEMA_VERSION,
    app_min_player: "0.1.0",
    pack_id: "pack_stub0001",
    export_id: "exp_stub0001",
    event_id: "evt_stub0001",
    organization_id: "org_stub0001",
    generated_at: new Date().toISOString(),
  });

  const eventStub = EventContractSchema.safeParse({
    event_id: "evt_stub0001",
    organization_id: "org_stub0001",
    name: "Evento de desenvolvimento",
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">TelaFlow Cloud</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Skeleton — Fase 1 (contratos centrais). Sem autoria nem export real.
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-medium text-neutral-500">shared-contracts</dt>
          <dd>Scene types: {SceneTypeSchema.options.join(", ")}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-500">PackMetadata (stub)</dt>
          <dd>
            {packStub.success ? "válido" : JSON.stringify(packStub.error.format())}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-500">Event (stub)</dt>
          <dd>
            {eventStub.success ? "válido" : JSON.stringify(eventStub.error.format())}
          </dd>
        </div>
      </dl>
    </main>
  );
}
