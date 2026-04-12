const STORAGE_KEY = "telaflow.cloud.recentExports.v1";
const MAX = 40;

export type RecentExportEntry = {
  exportId: string;
  eventId: string;
  eventName: string;
  at: string;
};

function readRaw(): RecentExportEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is RecentExportEntry =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as RecentExportEntry).exportId === "string" &&
        typeof (x as RecentExportEntry).eventId === "string" &&
        typeof (x as RecentExportEntry).eventName === "string" &&
        typeof (x as RecentExportEntry).at === "string",
    );
  } catch {
    return [];
  }
}

function writeRaw(entries: RecentExportEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

export function readRecentExports(): RecentExportEntry[] {
  return readRaw();
}

export function recordPackExport(entry: {
  exportId: string;
  eventId: string;
  eventName: string;
}): void {
  const at = new Date().toISOString();
  const next: RecentExportEntry = {
    exportId: entry.exportId,
    eventId: entry.eventId,
    eventName: entry.eventName,
    at,
  };
  const prev = readRaw().filter((e) => e.exportId !== entry.exportId);
  writeRaw([next, ...prev]);
}

export function countExportsSince(sinceMs: number): number {
  return readRaw().filter((e) => {
    const t = Date.parse(e.at);
    return !Number.isNaN(t) && t >= sinceMs;
  }).length;
}

export function lastExportForEvent(eventId: string): RecentExportEntry | null {
  for (const e of readRaw()) {
    if (e.eventId === eventId) return e;
  }
  return null;
}
