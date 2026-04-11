export type CloudEvent = {
  event_id: string;
  organization_id: string;
  name: string;
};

export type ListEventsResponse = { events: CloudEvent[] };

export type CreateEventResponse = { ok: boolean; event: CloudEvent };

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
