import type { ExecutionLogEntry } from "./executionLog.js";

type Props = {
  entries: ExecutionLogEntry[];
};

export function ExecutionLogPanel({ entries }: Props) {
  if (entries.length === 0) {
    return <p className="player-hint">Sem entradas no registro ainda.</p>;
  }
  return (
    <div className="player-exec-log">
      <ol className="player-exec-log-list" reversed>
        {[...entries].reverse().map((e) => (
          <li key={e.id} className={`player-exec-log-item player-exec-log-item--${e.level}`}>
            <span className="player-exec-log-time">{e.at}</span>{" "}
            <span className="player-exec-log-code">
              <code>{e.code}</code>
            </span>{" "}
            <span className="player-exec-log-msg">{e.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
