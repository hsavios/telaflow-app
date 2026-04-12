"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { getCloudApiBase, joinDrawPublic, summarizeTelaflowApiErrorBody } from "@/lib/cloud-api";

export default function JoinDrawPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ assigned: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!token.trim()) {
      setError("Token de inscrição inválido.");
      return;
    }
    if (!getCloudApiBase()) {
      setError("NEXT_PUBLIC_CLOUD_API_URL não está configurado neste site.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await joinDrawPublic(token, {
        display_name: name.trim() || null,
      });
      setDone({ assigned: res.assigned_number });
    } catch (e) {
      const cause = e instanceof Error ? e.cause : null;
      const human =
        cause != null ? summarizeTelaflowApiErrorBody(cause) : e instanceof Error ? e.message : null;
      setError(human ?? "Não foi possível concluir a inscrição.");
    } finally {
      setBusy(false);
    }
  }, [name, token]);

  if (!getCloudApiBase()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-100">Inscrição indisponível</h1>
        <p className="mt-2 text-sm text-slate-400">Configure a API pública (NEXT_PUBLIC_CLOUD_API_URL).</p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-emerald-200">Inscrição registada</h1>
        <p className="mt-3 text-sm text-slate-300">
          O seu número atribuído é <strong className="text-white">{done.assigned}</strong>. Guarde este ecrã
          até ao sorteio.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50">Inscrição no sorteio</h1>
      <p className="mt-2 text-sm text-slate-400">
        Opcional: indique o seu nome. O número será atribuído automaticamente.
      </p>
      <label className="mt-6 block text-left text-xs font-medium uppercase tracking-wide text-slate-500">
        Nome (opcional)
        <input
          type="text"
          maxLength={256}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-500/40 focus:ring-2"
          placeholder="Ex.: Maria"
        />
      </label>
      {error ? (
        <p className="mt-4 text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-6 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy ? "A enviar…" : "Confirmar inscrição"}
      </button>
    </main>
  );
}
