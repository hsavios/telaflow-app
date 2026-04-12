const LAST_EVENT_KEY = "telaflow.cloud.lastEventId";

export function rememberLastOpenedEvent(eventId: string): void {
  try {
    localStorage.setItem(LAST_EVENT_KEY, eventId);
  } catch {
    /* quota ou modo privado */
  }
}

export function getLastOpenedEventId(): string | null {
  try {
    return localStorage.getItem(LAST_EVENT_KEY);
  } catch {
    return null;
  }
}
