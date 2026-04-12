"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import {
  createEvent,
  fetchEvents,
  getCloudApiBase,
  type CloudEvent,
} from "@/lib/cloud-api";
import { PROVISIONAL_ORGANIZATION_ID } from "@/lib/default-organization";
import { generateEventId } from "@/lib/event-id";
import { SHOWCASE_EVENT_ID } from "@/lib/showcase-event";

type LoadState = "idle" | "loading" | "ok" | "error";

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "missing_api_url") {
      return "A URL da Cloud API não está configurada (NEXT_PUBLIC_CLOUD_API_URL).";
    }
    if (err.message.startsWith("list_failed:")) {
      return "Falha ao carregar eventos. Verifique se a API está no ar.";
    }
    if (err.message.startsWith("create_failed:")) {
      return "Não foi possível criar o evento. Tente de novo.";
    }
    if (err.message === "event_id_conflict") {
      return "Conflito de ID — tente criar de novo.";
    }
  }
  return "Algo deu errado. Tente de novo.";
}

export default function EventsPage() {
  const dialogTitleId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const apiConfigured = getCloudApiBase() !== null;
  const [loadState, setLoadState] = useState<LoadState>(() =>
    apiConfigured ? "loading" : "error",
  );
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [listError, setListError] = useState<string | null>(() =>
    apiConfigured
      ? null
      : "Configure NEXT_PUBLIC_CLOUD_API_URL apontando para a Cloud API.",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hasApiUrl = apiConfigured;

  const loadList = useCallback(async () => {
    if (!getCloudApiBase()) {
      setLoadState("error");
      setListError(
        "Configure NEXT_PUBLIC_CLOUD_API_URL apontando para a Cloud API.",
      );
      return;
    }
    setLoadState("loading");
    setListError(null);
    try {
      const rows = await fetchEvents();
      setEvents(rows);
      setLoadState("ok");
    } catch (e) {
      setLoadState("error");
      setListError(formatErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!modalOpen) return;
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [modalOpen]);

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  const openModal = () => {
    setFormError(null);
    setName("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setFormError(null);
  };

  const submitCreate = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setFormError("Informe o nome do evento.");
      return;
    }
    if (!hasApiUrl) return;

    setSubmitting(true);
    setFormError(null);

    let lastErr: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      const event_id = generateEventId();
      try {
        await createEvent({
          event_id,
          organization_id: PROVISIONAL_ORGANIZATION_ID,
          name: trimmed,
        });
        setModalOpen(false);
        setName("");
        setSuccessMsg("Evento criado.");
        await loadList();
        setSubmitting(false);
        return;
      } catch (e) {
        lastErr = e;
        if (e instanceof Error && e.message === "event_id_conflict") {
          continue;
        }
        break;
      }
    }
    setFormError(formatErrorMessage(lastErr));
    setSubmitting(false);
  };

  const empty = loadState === "ok" && events.length === 0;

  const hasShowcaseEvent = useMemo(
    () => events.some((e) => e.event_id === SHOWCASE_EVENT_ID),
    [events],
  );

  return (
    <div className="min-h-screen text-tf-muted">
      <AppHeader />

      <main
        id="conteudo-principal"
        className="mx-auto min-w-0 max-w-content px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-10"
      >
        {successMsg ? (
          <p
            className="mb-6 rounded-tf border border-tf-teal/30 bg-tf-teal-soft/30 px-4 py-3 text-sm text-tf-fg"
            role="status"
          >
            {successMsg}
          </p>
        ) : null}

        {loadState === "ok" && hasShowcaseEvent ? (
          <div className="mb-8 rounded-tf-lg border border-violet-500/35 bg-gradient-to-br from-violet-950/50 via-slate-900/60 to-slate-950/80 px-4 py-4 sm:px-5">
            <p className="text-sm font-bold text-violet-100">Showcase — fluxo completo</p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-tf-muted">
              A Cloud API inclui o evento de demonstração com roteiro Abertura, Institucional,
              Patrocínio, Sorteio e Encerramento. Use para simular na web, exportar o pack e
              executar no TelaFlow Player.
            </p>
            <Link
              href={`/events/${encodeURIComponent(SHOWCASE_EVENT_ID)}`}
              className="mt-3 inline-flex rounded-tf bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-violet-950/40 transition-opacity hover:opacity-95"
            >
              Abrir evento demo
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-tf-fg md:text-4xl">
              Eventos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-tf-muted md:text-base">
              Unidade inicial de trabalho na Cloud: cada evento agrupa cenas e
              exportações até o pack no Player.
            </p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="shrink-0 rounded-tf bg-tf-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            disabled={!hasApiUrl || loadState === "loading"}
          >
            Criar evento
          </button>
        </div>

        {loadState === "loading" ? (
          <p className="mt-12 text-sm text-tf-subtle" aria-live="polite">
            Carregando…
          </p>
        ) : null}

        {loadState === "error" && listError ? (
          <div
            className="mt-10 rounded-tf-lg border border-red-500/25 bg-red-950/20 px-5 py-4 text-sm text-red-100/90"
            role="alert"
          >
            <p className="font-medium text-red-100">Falha ao carregar</p>
            <p className="mt-1 text-red-100/80">{listError}</p>
            {hasApiUrl ? (
              <button
                type="button"
                onClick={() => void loadList()}
                className="mt-4 text-sm font-medium text-tf-fg underline-offset-2 hover:underline"
              >
                Tentar de novo
              </button>
            ) : null}
          </div>
        ) : null}

        {loadState === "ok" && empty ? (
          <div className="mt-14 rounded-tf-lg border border-tf-border bg-tf-mid/35 px-8 py-12 text-center md:px-12">
            <h2 className="font-display text-lg font-semibold text-tf-fg">
              Nenhum evento ainda
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-tf-muted">
              Quando você criar o primeiro evento, ele aparece aqui e pode ser
              usado pela API e pelos próximos fluxos de export.
            </p>
            <button
              type="button"
              onClick={openModal}
              className="mt-8 rounded-tf border border-tf-border bg-tf-mid/60 px-5 py-2.5 text-sm font-semibold text-tf-fg transition-colors hover:border-tf-accent/35 hover:bg-tf-mid disabled:opacity-50"
              disabled={!hasApiUrl}
            >
              Criar primeiro evento
            </button>
          </div>
        ) : null}

        {loadState === "ok" && events.length > 0 ? (
          <div className="tf-scroll-touch mt-10 overflow-x-auto rounded-tf-lg border border-tf-border">
            <table className="w-full min-w-[20rem] text-left text-sm sm:min-w-0">
              <thead className="border-b border-tf-border bg-tf-mid/80 text-tf-subtle">
                <tr>
                  <th className="px-3 py-3 font-medium sm:px-4">Nome</th>
                  <th className="hidden px-3 py-3 font-medium sm:table-cell sm:px-4">
                    event_id
                  </th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell sm:px-4">
                    organization_id
                  </th>
                  <th className="px-3 py-3 font-medium text-right sm:px-4">
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tf-border bg-tf-mid/25">
                {events.map((ev) => (
                  <tr key={ev.event_id} className="hover:bg-tf-mid/40">
                    <td className="max-w-[10rem] px-3 py-3 align-top font-medium text-tf-fg sm:max-w-none sm:px-4 sm:py-3.5">
                      <span className="break-words">{ev.name}</span>
                      <span className="mt-1.5 block font-mono text-[10px] leading-snug text-tf-muted sm:hidden">
                        {ev.event_id}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 align-top font-mono text-xs text-tf-muted break-all sm:table-cell sm:px-4 sm:py-3.5">
                      {ev.event_id}
                    </td>
                    <td className="hidden px-3 py-3 align-top font-mono text-xs text-tf-muted break-all md:table-cell sm:px-4 sm:py-3.5">
                      {ev.organization_id}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top text-right sm:px-4 sm:py-3.5">
                      <Link
                        href={`/events/${encodeURIComponent(ev.event_id)}`}
                        className="text-sm font-medium text-tf-accent transition-colors hover:text-blue-300"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>

      <AppFooter />

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="max-h-[min(90dvh,32rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-tf-lg border border-tf-border bg-tf-mid p-5 shadow-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
          >
            <h2
              id={dialogTitleId}
              className="font-display text-lg font-semibold text-tf-fg"
            >
              Novo evento
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-tf-subtle">
              Sem login nesta fase: todos os eventos usam o mesmo{" "}
              <span className="font-mono text-tf-muted">organization_id</span>{" "}
              provisório até existir tenant real.
            </p>

            <label className="mt-6 block text-sm font-medium text-tf-muted">
              Nome do evento
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={512}
                autoComplete="off"
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none ring-tf-accent/40 placeholder:text-tf-faint focus:border-tf-accent/50 focus:ring-2"
                placeholder="Ex.: Show Arena Sul 2026"
              />
            </label>

            <div className="mt-4 rounded-tf border border-tf-border bg-tf-bg/80 px-3 py-2 text-xs text-tf-subtle">
              <span className="text-tf-faint">organization_id · </span>
              <span className="font-mono text-tf-muted">
                {PROVISIONAL_ORGANIZATION_ID}
              </span>
            </div>

            {formError ? (
              <p className="mt-4 text-sm text-red-300/90" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-tf border border-tf-border px-4 py-2 text-sm font-medium text-tf-muted transition-colors hover:border-tf-border hover:text-tf-fg"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={submitting}
                className="rounded-tf bg-tf-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
