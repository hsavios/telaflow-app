/** Gera `event_id` opaco compatível com a Cloud API (mín. 12 chars, [a-zA-Z0-9_-]). */
export function generateEventId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 12);
  return `evt_${t}_${r}`;
}
