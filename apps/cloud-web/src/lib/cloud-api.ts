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
};

export type GetEventResponse = { event: CloudEvent };

export type ListScenesResponse = { scenes: CloudScene[] };

export type CreateSceneResponse = { ok: boolean; scene: CloudScene };

export function getCloudApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_CLOUD_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
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

export async function fetchEvents(): Promise<CloudEvent[]> {
  const base = getCloudApiBase();
  if (!base) {
    throw new Error("missing_api_url");
  }
  const res = await fetch(`${base}/events`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
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
  const res = await fetch(`${base}/events`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
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
  const res = await fetch(`${base}/events/${enc(eventId)}`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
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
  const res = await fetch(`${base}/events/${enc(eventId)}/scenes`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
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

export async function createScene(
  eventId: string,
  payload: {
    sort_order: number;
    type: string;
    name: string;
    enabled: boolean;
  },
): Promise<CreateSceneResponse> {
  const base = getCloudApiBase();
  if (!base) throw new Error("missing_api_url");
  const res = await fetch(`${base}/events/${enc(eventId)}/scenes`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 404) {
    throw new Error("event_not_found");
  }
  const body = await parseJsonOrText(res);
  if (!res.ok) {
    throw new Error(`scene_create_failed:${res.status}`, { cause: body });
  }
  return body as CreateSceneResponse;
}
