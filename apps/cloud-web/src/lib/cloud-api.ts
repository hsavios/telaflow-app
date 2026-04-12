import {
  clearAuthSession,
  getAccessToken,
  getSessionOrganizationId,
} from "./auth-session";
import { PROVISIONAL_ORGANIZATION_ID } from "./default-organization";

export type CloudEvent = {
  event_id: string;
  organization_id: string;
  name: string;
};

export type ListEventsResponse = { events: CloudEvent[] };

export type CreateEventResponse = { ok: boolean; event: CloudEvent };

export type CloudScene = {
  scene_id: string;
  event_id: string;
  sort_order: number;
  type: string;
  name: string;
  enabled: boolean;
  /** Reservado — mídia principal (futuro). */
  media_id?: string | null;
  /** Sorteio vinculado (cena tipo draw). */
  draw_config_id?: string | null;
};

export type GetEventResponse = { event: CloudEvent };

export type ListScenesResponse = { scenes: CloudScene[] };

export type CreateSceneResponse = { ok: boolean; scene: CloudScene };

export type UpdateSceneResponse = { ok: boolean; scene: CloudScene };

export type DeleteSceneResponse = { ok: boolean; deleted_scene_id: string };

export type ReorderScenesResponse = { ok: boolean; scenes: CloudScene[] };

export function getCloudApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_CLOUD_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/** Cabeçalho multi-tenant — alinhado a `PROVISIONAL_ORGANIZATION_ID` na web. */
export function defaultTelaflowOrganizationId(): string {
  return PROVISIONAL_ORGANIZATION_ID;
}

/** Org efetiva: sessão pós-login ou env provisório. */
export function effectiveTelaflowOrganizationId(): string {
  const s = getSessionOrganizationId()?.trim();
  if (s) return s;
  return defaultTelaflowOrganizationId();
}

async function telaflowFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== "undefined") {
    clearAuthSession();
    const rt = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?returnTo=${encodeURIComponent(rt)}`);
    throw new Error("telaflow_auth_redirect");
  }
  return res;
}

/** Cabeçalhos para rotas públicas (ex.: `/join/{token}`) — sem organização. */
export function publicApiHeaders(jsonBody?: boolean): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (jsonBody) h["Content-Type"] = "application/json";
  return h;
}

function cloudApiHeaders(
  extra?: Record<string, string>,
  organizationId?: string,
): Record<string, string> {
  const fallback = defaultTelaflowOrganizationId();
  const oid = (
    organizationId ??
    getSessionOrganizationId() ??
    fallback
  ).trim() || fallback;
  const h: Record<string, string> = {
    Accept: "application/json",
    "X-Telaflow-Organization-Id": oid,
    ...extra,
  };
  const token = getAccessToken()?.trim();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parseJsonOrText(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Extrai mensagem legível de respostas FastAPI/Pydantic (ex.: 422) para a UI.
 */
export function summarizeTelaflowApiErrorBody(body: unknown): string | null {
  if (body == null || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const detail = root.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return null;
      })
      .filter((x): x is string => Boolean(x));
    return parts.length ? parts.join("; ") : null;
  }
  if (detail && typeof detail === "object") {
    const d = detail as Record<string, unknown>;
    if (d.error === "validation_failed" && Array.isArray(d.issues)) {
      const parts = (d.issues as unknown[])
        .map((it) => {
          if (it && typeof it === "object" && "msg" in it) {
            return String((it as { msg: unknown }).msg);
          }
          if (it && typeof it === "object" && "type" in it) {
            return String((it as { type: unknown }).type);
          }
          return null;
        })
        .filter((x): x is string => Boolean(x));
      return parts.length ? parts.join(" · ") : "Falha de validação";
    }
    if (typeof d.message === "string") return d.message;
  }
  return null;
}

export type TelaflowLoginResponse = {
  ok: boolean;
  access_token: string;
  token_type: string;
  organization_id: string;
  user_id: string;
  email: string;
};

export async function loginTelaflowCloud(
  email: string,
  password: string,
): Promise<TelaflowLoginResponse> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: publicApiHeaders(true),
    body: JSON.stringify({ email, password }),
  });
  const body = await parseJsonOrText(res);
  if (res.status === 503) {
    throw new Error("jwt_not_configured", { cause: body });
  }
  if (!res.ok) {
    throw new Error(`login_failed:${res.status}`, { cause: body });
  }
  return body as TelaflowLoginResponse;
}

export async function fetchEvents(): Promise<CloudEvent[]> {
  const base = getCloudApiBase();
  if (!base) {
    throw new Error("missing_api_url");
  }
  const res = await telaflowFetch(`${base}/events`, {
    method: "GET",
    cache: "no-store",
    headers: cloudApiHeaders(),
  });
  if (!res.ok) {
    const body = await parseJsonOrText(res);
    throw new Error(`list_failed:${res.status}`, { cause: body });
  }
  const data = (await res.json()) as ListEventsResponse;
  return Array.isArray(data.events) ? data.events : [];
}

export async function createEvent(payload: {
  event_id: string;
  organization_id: string;
  name: string;
}): Promise<CreateEventResponse> {
  const base = getCloudApiBase();
  if (!base) {
    throw new Error("missing_api_url");
  }
  const res = await telaflowFetch(`${base}/events`, {
    method: "POST",
    headers: cloudApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const body = await parseJsonOrText(res);
  if (res.status === 409) {
    throw new Error("event_id_conflict", { cause: body });
  }
  if (!res.ok) {
    throw new Error(`create_failed:${res.status}`, { cause: body });
  }
  return body as CreateEventResponse;
}

function enc(s: string): string {
  return encodeURIComponent(s);
}

export async function fetchEvent(eventId: string): Promise<CloudEvent> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(`${base}/events/${enc(eventId)}`, {
    method: "GET",
    cache: "no-store",
    headers: cloudApiHeaders(),
  });
  if (res.ok) {
    const data = (await res.json()) as GetEventResponse;
    return data.event;
  }
  /**
   * Em produção, builds antigas da API respondem 404 em GET /events/{id}
   * (rota inexistente). Nesse caso ainda conseguimos resolver pelo GET /events.
   */
  if (res.status === 404) {
    try {
      const all = await fetchEvents();
      const found = all.find((e) => e.event_id === eventId);
      if (found) return found;
    } catch {
      /* ignora: sem lista não há fallback */
    }
    throw new Error("event_not_found");
  }
  const body = await parseJsonOrText(res);
  throw new Error(`event_failed:${res.status}`, { cause: body });
}

export async function fetchScenes(eventId: string): Promise<CloudScene[]> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(`${base}/events/${enc(eventId)}/scenes`, {
    method: "GET",
    cache: "no-store",
    headers: cloudApiHeaders(),
  });
  if (res.ok) {
    const data = (await res.json()) as ListScenesResponse;
    return Array.isArray(data.scenes) ? data.scenes : [];
  }
  /** API sem rota de scenes ainda: 404 genérico — lista vazia em vez de quebrar a página. */
  if (res.status === 404) {
    return [];
  }
  const body = await parseJsonOrText(res);
  throw new Error(`scenes_list_failed:${res.status}`, { cause: body });
}

/** Textos opcionais para o telão / público (Player). */
export type CloudDrawPublicCopy = {
  headline?: string | null;
  audience_instructions?: string | null;
  result_label?: string | null;
};

export type CloudDrawPresentation = {
  sound_enabled?: boolean | null;
  visual_profile?: "premium" | "classic" | "pulsing" | null;
};

export type CloudDrawRegistration = {
  join_url_template?: string | null;
  public_token?: string | null;
};

export type CloudDrawConfig = {
  draw_config_id: string;
  event_id: string;
  name: string;
  max_winners: number;
  notes: string | null;
  enabled: boolean;
  draw_type?: "number_range" | "attendee_pool";
  number_range?: { min: number; max: number } | null;
  pool_mode?: "full_range" | "subset";
  eligible_numbers?: number[] | null;
  remove_winner_from_pool?: boolean;
  prizes?: string[] | null;
  public_copy?: CloudDrawPublicCopy | null;
  draw_presentation?: CloudDrawPresentation | null;
  registration?: CloudDrawRegistration | null;
};

export type CloudMediaRequirement = {
  media_id: string;
  event_id: string;
  label: string;
  media_type: "video" | "image" | "audio" | "other";
  required: boolean;
  scene_id: string | null;
  allowed_extensions_hint: string | null;
  /** URL pública opcional (futuro) para pré-visualização na Cloud. */
  preview_url?: string | null;
};

export type ExportReadinessBlocking = {
  severity?: "blocking" | "warning";
  code: string;
  message?: string;
  scene_id?: string;
  media_id?: string;
  draw_config_id?: string;
  label?: string;
  name?: string;
};

export type SceneReadinessEvaluation = {
  scene_id: string;
  sort_order: number;
  lifecycle: "draft" | "blocked" | "warning" | "ready";
  blocking_codes: string[];
  warning_codes: string[];
};

export type ExportReadinessBody = {
  schema_version?: string;
  ready: boolean;
  sort_order_ok?: boolean;
  blocking: ExportReadinessBlocking[];
  warnings: ExportReadinessBlocking[];
  lifecycle_counts?: {
    draft: number;
    blocked: number;
    warning: number;
    ready: number;
  };
  scene_evaluations?: SceneReadinessEvaluation[];
  scene_count: number;
  draw_config_count: number;
  media_requirement_count: number;
};

export type ExportReadinessResponse = {
  ok: boolean;
  export_readiness: ExportReadinessBody;
};

export async function createScene(
  eventId: string,
  payload: {
    sort_order: number;
    type: string;
    name: string;
    enabled: boolean;
    media_id?: string | null;
    draw_config_id?: string | null;
  },
): Promise<CreateSceneResponse> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(`${base}/events/${enc(eventId)}/scenes`, {
    method: "POST",
    headers: cloudApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (res.status === 404) {
    throw new Error("event_not_found");
  }
  const body = await parseJsonOrText(res);
  if (res.status === 409) {
    const err =
      typeof body === "object" &&
      body !== null &&
      (body as { detail?: { error?: string } }).detail?.error ===
        "sort_order_conflict"
        ? "sort_order_conflict"
        : "scene_create_conflict";
    throw new Error(err, { cause: body });
  }
  if (res.status === 400) {
    const code = (body as { detail?: { error?: string } })?.detail?.error;
    if (code === "media_id_not_found") {
      throw new Error("media_id_not_found", { cause: body });
    }
    if (code === "draw_config_not_found") {
      throw new Error("draw_config_not_found", { cause: body });
    }
    throw new Error(`scene_create_failed:400`, { cause: body });
  }
  if (res.status === 422) {
    const code = (body as { detail?: { error?: string } })?.detail?.error;
    if (code === "draw_scene_requires_draw_config") {
      throw new Error("draw_scene_requires_draw_config", { cause: body });
    }
    throw new Error(`scene_create_failed:422`, { cause: body });
  }
  if (!res.ok) {
    throw new Error(`scene_create_failed:${res.status}`, { cause: body });
  }
  return body as CreateSceneResponse;
}

export async function reorderScenes(
  eventId: string,
  sceneIds: string[],
): Promise<CloudScene[]> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(`${base}/events/${enc(eventId)}/scenes/reorder`, {
    method: "POST",
    headers: cloudApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ scene_ids: sceneIds }),
  });
  if (res.status === 404) {
    throw new Error("event_not_found");
  }
  const body = await parseJsonOrText(res);
  if (!res.ok) {
    throw new Error(`scene_reorder_failed:${res.status}`, { cause: body });
  }
  const data = body as ReorderScenesResponse;
  return Array.isArray(data.scenes) ? data.scenes : [];
}

export async function updateScene(
  eventId: string,
  sceneId: string,
  payload: Partial<{
    sort_order: number;
    type: string;
    name: string;
    enabled: boolean;
    media_id: string | null;
    draw_config_id: string | null;
  }>,
): Promise<UpdateSceneResponse> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/scenes/${enc(sceneId)}`,
    {
      method: "PATCH",
      headers: cloudApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );
  if (res.status === 404) {
    throw new Error("scene_not_found");
  }
  const body = await parseJsonOrText(res);
  if (res.status === 409) {
    throw new Error("sort_order_conflict", { cause: body });
  }
  if (res.status === 400) {
    const code = (body as { detail?: { error?: string } })?.detail?.error;
    if (code === "media_id_not_found") {
      throw new Error("media_id_not_found", { cause: body });
    }
    if (code === "draw_config_not_found") {
      throw new Error("draw_config_not_found", { cause: body });
    }
    throw new Error(`scene_update_failed:400`, { cause: body });
  }
  if (res.status === 422) {
    const code = (body as { detail?: { error?: string } })?.detail?.error;
    if (code === "draw_scene_requires_draw_config") {
      throw new Error("draw_scene_requires_draw_config", { cause: body });
    }
    throw new Error(`scene_update_failed:422`, { cause: body });
  }
  if (!res.ok) {
    throw new Error(`scene_update_failed:${res.status}`, { cause: body });
  }
  return body as UpdateSceneResponse;
}

export async function deleteScene(
  eventId: string,
  sceneId: string,
): Promise<void> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/scenes/${enc(sceneId)}`,
    {
      method: "DELETE",
      headers: cloudApiHeaders(),
    },
  );
  if (res.status === 404) {
    throw new Error("scene_not_found");
  }
  if (!res.ok) {
    const body = await parseJsonOrText(res);
    throw new Error(`scene_delete_failed:${res.status}`, { cause: body });
  }
}

export async function fetchDrawConfigs(
  eventId: string,
): Promise<CloudDrawConfig[]> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(`${base}/events/${enc(eventId)}/draw-configs`, {
    method: "GET",
    cache: "no-store",
    headers: cloudApiHeaders(),
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const body = await parseJsonOrText(res);
    throw new Error(`draw_configs_failed:${res.status}`, { cause: body });
  }
  const data = (await res.json()) as { draw_configs?: CloudDrawConfig[] };
  return Array.isArray(data.draw_configs) ? data.draw_configs : [];
}

export async function createDrawConfig(
  eventId: string,
  payload: {
    name: string;
    max_winners?: number;
    notes?: string | null;
    enabled?: boolean;
    draw_type?: "number_range" | "attendee_pool";
    number_range?: { min: number; max: number } | null;
    pool_mode?: "full_range" | "subset";
    eligible_numbers?: number[] | null;
    remove_winner_from_pool?: boolean;
    prizes?: string[] | null;
    public_copy?: CloudDrawPublicCopy | null;
    draw_presentation?: CloudDrawPresentation | null;
    registration?: CloudDrawRegistration | null;
  },
): Promise<{ ok: boolean; draw_config: CloudDrawConfig }> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(`${base}/events/${enc(eventId)}/draw-configs`, {
    method: "POST",
    headers: cloudApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (res.status === 404) throw new Error("event_not_found");
  const body = await parseJsonOrText(res);
  if (!res.ok) {
    if (res.status === 422) {
      const human = summarizeTelaflowApiErrorBody(body);
      throw new Error(
        `draw_config_validation:${human ?? "Corrija os dados do sorteio e tente de novo."}`,
      );
    }
    throw new Error(`draw_config_create_failed:${res.status}`, { cause: body });
  }
  return body as { ok: boolean; draw_config: CloudDrawConfig };
}

export async function updateDrawConfig(
  eventId: string,
  drawConfigId: string,
  payload: Partial<{
    name: string;
    max_winners: number;
    notes: string | null;
    enabled: boolean;
    draw_type: "number_range" | "attendee_pool";
    number_range: { min: number; max: number } | null;
    pool_mode: "full_range" | "subset";
    eligible_numbers: number[] | null;
    remove_winner_from_pool: boolean;
    prizes: string[] | null;
    public_copy: CloudDrawPublicCopy | null;
    draw_presentation: CloudDrawPresentation | null;
    registration: CloudDrawRegistration | null;
  }>,
): Promise<{ ok: boolean; draw_config: CloudDrawConfig }> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/draw-configs/${enc(drawConfigId)}`,
    {
      method: "PATCH",
      headers: cloudApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );
  if (res.status === 404) throw new Error("draw_config_not_found");
  const body = await parseJsonOrText(res);
  if (!res.ok) {
    if (res.status === 422) {
      const human = summarizeTelaflowApiErrorBody(body);
      throw new Error(
        `draw_config_validation:${human ?? "Corrija intervalo ou textos e tente de novo."}`,
      );
    }
    throw new Error(`draw_config_update_failed:${res.status}`, { cause: body });
  }
  return body as { ok: boolean; draw_config: CloudDrawConfig };
}

export async function deleteDrawConfig(
  eventId: string,
  drawConfigId: string,
): Promise<void> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/draw-configs/${enc(drawConfigId)}`,
    {
      method: "DELETE",
      headers: cloudApiHeaders(),
    },
  );
  if (res.status === 404) throw new Error("draw_config_not_found");
  if (res.status === 409) {
    throw new Error("draw_config_in_use", { cause: await parseJsonOrText(res) });
  }
  if (!res.ok) {
    const body = await parseJsonOrText(res);
    throw new Error(`draw_config_delete_failed:${res.status}`, { cause: body });
  }
}

export async function fetchMediaRequirements(
  eventId: string,
): Promise<CloudMediaRequirement[]> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/media-requirements`,
    {
      method: "GET",
      cache: "no-store",
      headers: cloudApiHeaders(),
    },
  );
  if (res.status === 404) return [];
  if (!res.ok) {
    const body = await parseJsonOrText(res);
    throw new Error(`media_requirements_failed:${res.status}`, { cause: body });
  }
  const data = (await res.json()) as {
    media_requirements?: CloudMediaRequirement[];
  };
  return Array.isArray(data.media_requirements) ? data.media_requirements : [];
}

export async function createMediaRequirement(
  eventId: string,
  payload: {
    label: string;
    media_type: CloudMediaRequirement["media_type"];
    required?: boolean;
    scene_id?: string | null;
    allowed_extensions_hint?: string | null;
  },
): Promise<{ ok: boolean; media_requirement: CloudMediaRequirement }> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/media-requirements`,
    {
      method: "POST",
      headers: cloudApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );
  if (res.status === 404) throw new Error("event_not_found");
  const body = await parseJsonOrText(res);
  if (!res.ok) {
    throw new Error(`media_requirement_create_failed:${res.status}`, {
      cause: body,
    });
  }
  return body as { ok: boolean; media_requirement: CloudMediaRequirement };
}

export async function updateMediaRequirement(
  eventId: string,
  mediaId: string,
  payload: Partial<{
    label: string;
    media_type: CloudMediaRequirement["media_type"];
    required: boolean;
    scene_id: string | null;
    allowed_extensions_hint: string | null;
  }>,
): Promise<{ ok: boolean; media_requirement: CloudMediaRequirement }> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/media-requirements/${enc(mediaId)}`,
    {
      method: "PATCH",
      headers: cloudApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );
  if (res.status === 404) throw new Error("media_requirement_not_found");
  const body = await parseJsonOrText(res);
  if (!res.ok) {
    throw new Error(`media_requirement_update_failed:${res.status}`, {
      cause: body,
    });
  }
  return body as { ok: boolean; media_requirement: CloudMediaRequirement };
}

export async function deleteMediaRequirement(
  eventId: string,
  mediaId: string,
): Promise<void> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/media-requirements/${enc(mediaId)}`,
    {
      method: "DELETE",
      headers: cloudApiHeaders(),
    },
  );
  if (res.status === 404) throw new Error("media_requirement_not_found");
  if (res.status === 409) {
    throw new Error("media_requirement_in_use", {
      cause: await parseJsonOrText(res),
    });
  }
  if (!res.ok) {
    const body = await parseJsonOrText(res);
    throw new Error(`media_requirement_delete_failed:${res.status}`, {
      cause: body,
    });
  }
}

export async function fetchExportReadiness(
  eventId: string,
): Promise<ExportReadinessBody> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/export-readiness`,
    {
      method: "GET",
      cache: "no-store",
      headers: cloudApiHeaders(),
    },
  );
  if (res.status === 404) throw new Error("event_not_found");
  if (!res.ok) {
    const body = await parseJsonOrText(res);
    throw new Error(`export_readiness_failed:${res.status}`, { cause: body });
  }
  const data = (await res.json()) as ExportReadinessResponse;
  return data.export_readiness;
}

export type RunPackExportResponse = {
  ok: boolean;
  export_id: string;
  generated_at?: string;
  export_directory: string;
  files_written: string[];
  artifacts?: unknown;
  zip_path?: string | null;
  zip_checksum_sha256?: string | null;
};

export async function runPackExport(
  eventId: string,
  options?: { archiveZip?: boolean },
): Promise<RunPackExportResponse> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const q = options?.archiveZip ? "?archive=zip" : "";
  const res = await telaflowFetch(`${base}/events/${enc(eventId)}/export${q}`, {
    method: "POST",
    cache: "no-store",
    headers: cloudApiHeaders(),
  });
  const body = await parseJsonOrText(res);
  if (res.status === 404) throw new Error("event_not_found");
  if (res.status === 409) {
    throw new Error("export_not_ready", { cause: body });
  }
  if (!res.ok) {
    throw new Error(`export_failed:${res.status}`, { cause: body });
  }
  return body as RunPackExportResponse;
}

export type CreateDrawRegistrationSessionResponse = {
  ok: boolean;
  session_id: string;
  public_token: string;
  join_url: string;
};

export async function createDrawRegistrationSession(
  eventId: string,
  drawConfigId: string,
  body: { join_base_url?: string | null; opens_at?: string | null; closes_at?: string | null },
): Promise<CreateDrawRegistrationSessionResponse> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await telaflowFetch(
    `${base}/events/${enc(eventId)}/draw-configs/${enc(drawConfigId)}/registration-sessions`,
    {
      method: "POST",
      headers: cloudApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
  );
  const parsed = await parseJsonOrText(res);
  if (!res.ok) {
    throw new Error(`registration_session_failed:${res.status}`, { cause: parsed });
  }
  return parsed as CreateDrawRegistrationSessionResponse;
}

export type JoinDrawResponse = {
  ok: boolean;
  registration_id: string;
  assigned_number: number;
  draw_config_id: string;
  event_id: string;
};

export async function joinDrawPublic(
  publicToken: string,
  body: { display_name?: string | null },
): Promise<JoinDrawResponse> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await fetch(`${base}/join/${encodeURIComponent(publicToken)}`, {
    method: "POST",
    headers: publicApiHeaders(true),
    body: JSON.stringify(body),
  });
  const parsed = await parseJsonOrText(res);
  if (!res.ok) {
    throw new Error(`join_draw_failed:${res.status}`, { cause: parsed });
  }
  return parsed as JoinDrawResponse;
}
