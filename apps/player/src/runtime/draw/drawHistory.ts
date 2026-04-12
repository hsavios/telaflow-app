/**
 * Histórico local dos últimos sorteios (operador) — não faz parte do Runtime Session Store.
 */

const STORAGE_KEY = "telaflow.player.drawHistory.v1";
const MAX_ENTRIES = 10;

export type DrawHistoryEntry = {
  at: string;
  resetKey: string;
  drawName: string;
  value: number;
};

function readRaw(): DrawHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is DrawHistoryEntry =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as DrawHistoryEntry).at === "string" &&
        typeof (x as DrawHistoryEntry).resetKey === "string" &&
        typeof (x as DrawHistoryEntry).drawName === "string" &&
        typeof (x as DrawHistoryEntry).value === "number",
    );
  } catch {
    return [];
  }
}

function write(entries: DrawHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* quota / privado */
  }
}

export function readDrawHistory(): DrawHistoryEntry[] {
  return readRaw();
}

export function appendDrawHistoryEntry(entry: {
  resetKey: string;
  drawName: string;
  value: number;
}): void {
  const row: DrawHistoryEntry = {
    at: new Date().toISOString(),
    resetKey: entry.resetKey,
    drawName: entry.drawName,
    value: entry.value,
  };
  const prev = readRaw().filter(
    (e) => !(e.resetKey === row.resetKey && e.value === row.value && e.at === row.at),
  );
  write([row, ...prev]);
}
