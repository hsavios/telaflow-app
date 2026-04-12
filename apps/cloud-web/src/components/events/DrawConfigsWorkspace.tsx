"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  createDrawConfig,
  createDrawRegistrationSession,
  deleteDrawConfig,
  summarizeTelaflowApiErrorBody,
  updateDrawConfig,
  type CloudDrawConfig,
} from "@/lib/cloud-api";

const PREFIX_VAL = "draw_config_validation:";

function errText(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.startsWith(PREFIX_VAL)) {
      return err.message.slice(PREFIX_VAL.length);
    }
    if (err.message === "draw_config_in_use") {
      return "Este sorteio ainda está vinculado a uma ou mais scenes. Remova o vínculo nas scenes antes de excluir.";
    }
    if (err.message === "draw_config_not_found") {
      return "Sorteio não encontrado.";
    }
    if (err.message.startsWith("draw_config_update_failed:")) {
      const fromCause =
        err.cause != null ? summarizeTelaflowApiErrorBody(err.cause) : null;
      return fromCause ?? "Não foi possível salvar o sorteio.";
    }
    if (err.message.startsWith("draw_config_create_failed:")) {
      const fromCause =
        err.cause != null ? summarizeTelaflowApiErrorBody(err.cause) : null;
      return fromCause ?? "Não foi possível criar o sorteio.";
    }
    if (err.message.startsWith("draw_config_delete_failed:")) {
      return "Não foi possível excluir o sorteio.";
    }
  }
  return "Algo deu errado. Tente de novo.";
}

type Props = {
  eventId: string;
  drawConfigs: CloudDrawConfig[];
  setDrawConfigs: (rows: CloudDrawConfig[]) => void;
  reloadDrawConfigs: () => Promise<void>;
  apiConfigured: boolean;
};

export function DrawConfigsWorkspace({
  eventId,
  drawConfigs,
  setDrawConfigs,
  reloadDrawConfigs,
  apiConfigured,
}: Props) {
  const modalTitleId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftMaxWinners, setDraftMaxWinners] = useState(1);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [useFixedRange, setUseFixedRange] = useState(false);
  const [draftRangeMin, setDraftRangeMin] = useState(1);
  const [draftRangeMax, setDraftRangeMax] = useState(1000);
  const [draftHeadline, setDraftHeadline] = useState("");
  const [draftAudience, setDraftAudience] = useState("");
  const [draftResultLabel, setDraftResultLabel] = useState("");
  const [panelSaving, setPanelSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [draftTelSound, setDraftTelSound] = useState(true);
  const [draftDrawType, setDraftDrawType] = useState<"number_range" | "attendee_pool">("number_range");
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMaxWinners, setNewMaxWinners] = useState(1);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const selected = drawConfigs.find((d) => d.draw_config_id === selectedId) ?? null;

  const telaoPreview = useMemo(() => {
    const title = draftName.trim() || "Nome do sorteio";
    const rangeLabel = useFixedRange
      ? `${draftRangeMin}–${draftRangeMax}`
      : "1–1000 (padrão no Player)";
    const span =
      useFixedRange && draftRangeMax >= draftRangeMin
        ? draftRangeMax - draftRangeMin + 1
        : null;
    const headline = draftHeadline.trim();
    const audience = draftAudience.trim();
    const resultLabel = draftResultLabel.trim() || "Número sorteado";
    return {
      title,
      rangeLabel,
      span,
      headline,
      audience,
      resultLabel,
    };
  }, [
    draftName,
    useFixedRange,
    draftRangeMin,
    draftRangeMax,
    draftHeadline,
    draftAudience,
    draftResultLabel,
  ]);

  useEffect(() => {
    if (!selected) {
      setDraftName("");
      return;
    }
    setDraftName(selected.name);
    setDraftMaxWinners(selected.max_winners);
    setDraftNotes(selected.notes ?? "");
    setDraftEnabled(selected.enabled);
    const nr = selected.number_range;
    setUseFixedRange(nr != null && typeof nr.min === "number" && typeof nr.max === "number");
    setDraftRangeMin(nr?.min ?? 1);
    setDraftRangeMax(nr?.max ?? 1000);
    const pc = selected.public_copy;
    setDraftHeadline(pc?.headline?.trim() ?? "");
    setDraftAudience(pc?.audience_instructions?.trim() ?? "");
    setDraftResultLabel(pc?.result_label?.trim() ?? "");
    setDraftTelSound(selected.draw_presentation?.sound_enabled !== false);
    setDraftDrawType(selected.draw_type === "attendee_pool" ? "attendee_pool" : "number_range");
    setRegistrationUrl(null);
    setPanelError(null);
  }, [selected]);

  useEffect(() => {
    if (!drawConfigs.some((d) => d.draw_config_id === selectedId)) {
      setSelectedId(null);
    }
  }, [drawConfigs, selectedId]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [banner]);

  const openModal = useCallback(() => {
    setModalError(null);
    setNewName("");
    setNewMaxWinners(1);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [modalOpen]);

  const submitNew = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 1) {
      setModalError("Informe o nome do sorteio.");
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await createDrawConfig(eventId, {
        name: trimmed,
        max_winners: newMaxWinners,
        notes: null,
        enabled: true,
      });
      setModalOpen(false);
      setBanner("Sorteio criado.");
      await reloadDrawConfigs();
    } catch (err) {
      setModalError(errText(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const savePanel = async () => {
    if (!selected) return;
    const trimmed = draftName.trim();
    if (trimmed.length < 1) {
      setPanelError("Nome obrigatório.");
      return;
    }
    if (useFixedRange) {
      if (draftRangeMin > draftRangeMax) {
        setPanelError("No intervalo, o mínimo não pode ser maior que o máximo.");
        return;
      }
      const span = draftRangeMax - draftRangeMin + 1;
      if (span > 500_000) {
        setPanelError(
          "Intervalo muito grande (acima de 500 mil números). Reduza a diferença entre mínimo e máximo.",
        );
        return;
      }
    }
    setPanelSaving(true);
    setPanelError(null);
    try {
      const number_range = useFixedRange
        ? { min: draftRangeMin, max: draftRangeMax }
        : null;
      const hasPublic =
        draftHeadline.trim().length > 0 ||
        draftAudience.trim().length > 0 ||
        draftResultLabel.trim().length > 0;
      const public_copy = hasPublic
        ? {
            headline: draftHeadline.trim() || null,
            audience_instructions: draftAudience.trim() || null,
            result_label: draftResultLabel.trim() || null,
          }
        : null;
      const out = await updateDrawConfig(eventId, selected.draw_config_id, {
        name: trimmed,
        max_winners: draftMaxWinners,
        notes: draftNotes.trim() || null,
        enabled: draftEnabled,
        draw_type: draftDrawType,
        number_range,
        public_copy,
        draw_presentation: { sound_enabled: draftTelSound },
      });
      setDrawConfigs(
        drawConfigs.map((d) =>
          d.draw_config_id === out.draw_config.draw_config_id ? out.draw_config : d,
        ),
      );
      setBanner("Sorteio salvo.");
      await reloadDrawConfigs();
    } catch (err) {
      setPanelError(errText(err));
    } finally {
      setPanelSaving(false);
    }
  };

  const criarSessaoInscricao = async () => {
    if (!selected || !apiConfigured) return;
    setRegistrationBusy(true);
    setPanelError(null);
    try {
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : null;
      const res = await createDrawRegistrationSession(eventId, selected.draw_config_id, {
        join_base_url: origin,
        opens_at: null,
        closes_at: null,
      });
      setRegistrationUrl(res.join_url);
      setBanner("Sessão de inscrição criada — reexporte o pack para o Player ver o QR.");
      await reloadDrawConfigs();
    } catch (err) {
      setPanelError(errText(err));
    } finally {
      setRegistrationBusy(false);
    }
  };

  const removeSelected = async () => {
    if (!selected) return;
    if (
      !window.confirm(
        `Excluir o sorteio «${selected.name}»? Scenes não são alteradas; se alguma referenciar este id, a exclusão será bloqueada.`,
      )
    ) {
      return;
    }
    setPanelSaving(true);
    setPanelError(null);
    try {
      await deleteDrawConfig(eventId, selected.draw_config_id);
      setSelectedId(null);
      setBanner("Sorteio excluído.");
      await reloadDrawConfigs();
    } catch (err) {
      setPanelError(errText(err));
    } finally {
      setPanelSaving(false);
    }
  };

  return (
    <div className="mt-8 min-w-0 space-y-6">
      {banner ? (
        <p
          className="rounded-tf border border-tf-teal/30 bg-tf-teal-soft/30 px-4 py-3 text-sm text-tf-fg"
          role="status"
        >
          {banner}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-tf-subtle">
          Sorteios pertencem ao evento. A scene do tipo sorteio só escolhe um
          destes registros — intervalo numérico, textos do telão e limite de
          ganhadores ficam aqui; a scene apenas liga a este sorteio.
        </p>
        <button
          type="button"
          onClick={openModal}
          className="shrink-0 rounded-tf bg-tf-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={!apiConfigured}
        >
          Novo sorteio
        </button>
      </div>

      {drawConfigs.length === 0 ? (
        <div className="rounded-tf-lg border border-tf-border bg-tf-mid/35 px-6 py-10 text-center">
          <h3 className="font-display text-lg font-semibold text-tf-fg">
            Nenhum sorteio cadastrado
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm text-tf-muted">
            Crie pelo menos um DrawConfig antes de vincular uma scene do tipo
            sorteio.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-6 rounded-tf border border-tf-border bg-tf-mid/60 px-5 py-2.5 text-sm font-semibold text-tf-fg disabled:opacity-50"
            disabled={!apiConfigured}
          >
            Criar primeiro sorteio
          </button>
        </div>
      ) : (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tf-subtle">
              Lista
            </h3>
            <ul className="flex flex-col gap-2" role="list">
              {drawConfigs.map((d) => (
                <li key={d.draw_config_id} role="listitem">
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.draw_config_id)}
                    className={`w-full rounded-tf border px-3 py-3 text-left text-sm transition-colors ${
                      selectedId === d.draw_config_id
                        ? "border-tf-accent/40 bg-tf-mid/50 ring-1 ring-tf-accent/25"
                        : "border-tf-border bg-tf-mid/40 hover:border-tf-border hover:bg-tf-mid/55"
                    }`}
                  >
                    <div className="font-medium text-tf-fg">{d.name}</div>
                    <div className="mt-1 break-all font-mono text-xs text-tf-faint">
                      {d.draw_config_id}
                    </div>
                    {d.number_range ? (
                      <div className="mt-1 text-xs text-tf-muted">
                        Intervalo {d.number_range.min}–{d.number_range.max}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-tf-muted">
                        Intervalo padrão no Player (1–1000) se não fixar aqui
                      </div>
                    )}
                    {d.public_copy &&
                    (d.public_copy.headline ||
                      d.public_copy.audience_instructions ||
                      d.public_copy.result_label) ? (
                      <div className="mt-0.5 text-xs text-tf-teal/90">
                        Textos para o telão definidos
                      </div>
                    ) : null}
                    {!d.enabled ? (
                      <span className="mt-1 inline-block text-xs text-tf-faint">
                        Desabilitado
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="min-w-0 rounded-tf-lg border border-tf-border bg-tf-mid/30 p-4 sm:p-5 lg:min-h-[18rem]">
            {!selected ? (
              <p className="text-sm text-tf-muted">
                Selecione um sorteio na lista para editar nome, ganhadores, intervalo
                numérico, textos do telão e notas internas.
              </p>
            ) : (
              <div className="space-y-5">
                <h3 className="font-display text-base font-semibold text-tf-fg">
                  Editar sorteio
                </h3>

                <label className="block text-sm font-medium text-tf-muted">
                  Nome
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    maxLength={256}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none focus:border-tf-accent/50 focus:ring-2 focus:ring-tf-accent/30"
                  />
                </label>

                <label className="block text-sm font-medium text-tf-muted">
                  Máximo de ganhadores
                  <input
                    type="number"
                    min={1}
                    max={999}
                    step={1}
                    value={draftMaxWinners}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setDraftMaxWinners(Number.isNaN(v) ? 1 : Math.min(999, Math.max(1, v)));
                    }}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
                  />
                </label>

                <label className="block text-sm font-medium text-tf-muted">
                  Notas (equipe)
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg outline-none focus:border-tf-accent/50"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-3 text-sm text-tf-muted">
                  <input
                    type="checkbox"
                    checked={draftEnabled}
                    onChange={(e) => setDraftEnabled(e.target.checked)}
                    className="size-4 rounded border-tf-border bg-tf-bg text-tf-accent"
                  />
                  Habilitado
                </label>

                <div className="border-t border-tf-border/60 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-tf-subtle">
                    Motor e intervalo
                  </h4>
                  <p className="mt-2 text-xs text-tf-muted">
                    Tipos no pack: intervalo (<code className="text-tf-faint">number_range</code>) ou
                    inscritos (<code className="text-tf-faint">attendee_pool</code> + export com inscrições).
                  </p>
                  <label className="mt-3 block text-sm font-medium text-tf-muted">
                    Tipo de sorteio
                    <select
                      value={draftDrawType}
                      onChange={(e) =>
                        setDraftDrawType(
                          e.target.value === "attendee_pool" ? "attendee_pool" : "number_range",
                        )
                      }
                      className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg"
                    >
                      <option value="number_range">Intervalo numérico</option>
                      <option value="attendee_pool">Lista de inscritos (export)</option>
                    </select>
                  </label>
                  <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-tf-muted">
                    <input
                      type="checkbox"
                      checked={draftTelSound}
                      onChange={(e) => setDraftTelSound(e.target.checked)}
                      className="size-4 rounded border-tf-border bg-tf-bg text-tf-accent"
                    />
                    Som no telão (sorteio)
                  </label>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-tf-muted">
                    <input
                      type="checkbox"
                      checked={useFixedRange}
                      onChange={(e) => setUseFixedRange(e.target.checked)}
                      className="mt-0.5 size-4 shrink-0 rounded border-tf-border bg-tf-bg text-tf-accent"
                    />
                    <span>
                      <span className="font-medium text-tf-fg">
                        Fixar intervalo no pack
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-tf-muted">
                        Se desmarcado, o Player usa 1–1000 até existir outra política no produto.
                        Equivale ao «número inicial / final» do sorteador legado.
                      </span>
                    </span>
                  </label>
                  {useFixedRange ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-tf-muted">
                        Mínimo (inclusivo)
                        <input
                          type="number"
                          step={1}
                          value={draftRangeMin}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setDraftRangeMin(Number.isNaN(v) ? 0 : v);
                          }}
                          className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
                        />
                      </label>
                      <label className="block text-sm font-medium text-tf-muted">
                        Máximo (inclusivo)
                        <input
                          type="number"
                          step={1}
                          value={draftRangeMax}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setDraftRangeMax(Number.isNaN(v) ? 0 : v);
                          }}
                          className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
                        />
                      </label>
                    </div>
                  ) : null}
                  {useFixedRange && draftRangeMax >= draftRangeMin ? (
                    <p className="mt-2 text-xs text-tf-muted">
                      {(() => {
                        const n = draftRangeMax - draftRangeMin + 1;
                        return `${n.toLocaleString("pt-BR")} ${n === 1 ? "número possível" : "números possíveis"} neste intervalo.`;
                      })()}
                    </p>
                  ) : null}
                  {useFixedRange &&
                  draftRangeMax >= draftRangeMin &&
                  draftRangeMax - draftRangeMin + 1 > 10_000 ? (
                    <p className="mt-1 text-xs text-amber-200/90">
                      Intervalo grande: o Player suporta, mas eventos muito amplos exigem mais
                      atenção do operador no vivo.
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-tf-border/60 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-tf-subtle">
                    Textos para o telão (público)
                  </h4>
                  <p className="mt-2 text-xs text-tf-muted">
                    Opcional. Aparecem na janela do telão do TelaFlow Player quando esta cena de
                    sorteio está no ar. Campos vazios não são enviados ao pack.
                  </p>
                  <label className="mt-3 block text-sm font-medium text-tf-muted">
                    Título / manchete (máx. 200)
                    <input
                      type="text"
                      value={draftHeadline}
                      onChange={(e) => setDraftHeadline(e.target.value)}
                      maxLength={200}
                      placeholder="Ex.: Sorteio do brinde ouro"
                      className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg outline-none focus:border-tf-accent/50"
                    />
                  </label>
                  <label className="mt-3 block text-sm font-medium text-tf-muted">
                    Instruções ao público (máx. 500)
                    <textarea
                      value={draftAudience}
                      onChange={(e) => setDraftAudience(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="Ex.: Aguardem o número no telão…"
                      className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg outline-none focus:border-tf-accent/50"
                    />
                  </label>
                  <label className="mt-3 block text-sm font-medium text-tf-muted">
                    Rótulo do resultado (máx. 120)
                    <input
                      type="text"
                      value={draftResultLabel}
                      onChange={(e) => setDraftResultLabel(e.target.value)}
                      maxLength={120}
                      placeholder="Ex.: Número sorteado"
                      className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-sm text-tf-fg outline-none focus:border-tf-accent/50"
                    />
                  </label>
                </div>

                <div className="border-t border-tf-border/60 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-tf-subtle">
                    Pré-visualização do telão (aproximada)
                  </h4>
                  <p className="mt-2 text-xs text-tf-muted">
                    Intenção visual apenas — o layout final depende do tema no pack e do
                    TelaFlow Player no equipamento do evento.
                  </p>
                  <div
                    className="mt-3 max-w-full overflow-hidden break-words rounded-tf border border-slate-600/50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-4 text-slate-100 shadow-inner sm:px-5 sm:py-5"
                    aria-label="Pré-visualização interpretativa do telão"
                  >
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
                      Sorteio
                    </p>
                    <h4 className="mt-1 font-display text-lg font-bold leading-tight text-white">
                      {telaoPreview.title}
                    </h4>
                    {telaoPreview.headline ? (
                      <p className="mt-2 text-sm font-medium text-amber-100/95">
                        {telaoPreview.headline}
                      </p>
                    ) : null}
                    {telaoPreview.audience ? (
                      <p className="mt-2 text-sm leading-snug text-slate-300">
                        {telaoPreview.audience}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs text-slate-500">
                      Intervalo no pack:{" "}
                      <span className="font-mono text-slate-400">{telaoPreview.rangeLabel}</span>
                      {telaoPreview.span != null && telaoPreview.span > 0 ? (
                        <span className="text-slate-500">
                          {" "}
                          · {telaoPreview.span.toLocaleString("pt-BR")} possibilidades
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-4 rounded-lg border border-slate-600/40 bg-slate-950/60 px-4 py-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {telaoPreview.resultLabel}
                      </p>
                      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
                        —
                      </p>
                      <p className="mt-2 text-[0.7rem] text-slate-500">
                        O número aparece aqui após o sorteio no Player.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-tf-border/60 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-tf-subtle">
                    Inscrições (QR)
                  </h4>
                  <p className="mt-2 text-xs text-tf-muted">
                    Cria um token público. Após exportar de novo, o pack inclui a URL no sorteio para o
                    telão mostrar o QR (estado «pronto»).
                  </p>
                  <button
                    type="button"
                    disabled={registrationBusy || !apiConfigured}
                    onClick={() => void criarSessaoInscricao()}
                    className="mt-3 rounded-tf border border-tf-accent/40 bg-tf-accent-soft/20 px-4 py-2 text-sm font-semibold text-tf-accent hover:bg-tf-accent-soft/30 disabled:opacity-50"
                  >
                    {registrationBusy ? "A criar…" : "Criar / renovar sessão de inscrição"}
                  </button>
                  {registrationUrl ? (
                    <p className="mt-2 break-all font-mono text-[11px] text-tf-fg">{registrationUrl}</p>
                  ) : selected?.registration?.public_token ? (
                    <p className="mt-2 break-all font-mono text-[11px] text-tf-muted">
                      Sessão existente — token: {selected.registration.public_token}. Reexporte para atualizar o
                      pack.
                    </p>
                  ) : null}
                </div>

                {panelError ? (
                  <p className="text-sm text-red-300/90" role="alert">
                    {panelError}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void savePanel()}
                    disabled={panelSaving}
                    className="rounded-tf bg-tf-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {panelSaving ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSelected()}
                    disabled={panelSaving}
                    className="rounded-tf border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200/90 hover:bg-red-950/30 disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !modalSubmitting) {
              setModalOpen(false);
              setModalError(null);
            }
          }}
        >
          <div
            className="max-h-[min(90dvh,28rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-tf-lg border border-tf-border bg-tf-mid p-5 shadow-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
          >
            <h2
              id={modalTitleId}
              className="font-display text-lg font-semibold text-tf-fg"
            >
              Novo sorteio
            </h2>
            <label className="mt-5 block text-sm font-medium text-tf-muted">
              Nome
              <input
                ref={nameInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={256}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
                placeholder="Ex.: Sorteio brinde ouro"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-tf-muted">
              Máximo de ganhadores
              <input
                type="number"
                min={1}
                max={999}
                value={newMaxWinners}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setNewMaxWinners(Number.isNaN(v) ? 1 : Math.min(999, Math.max(1, v)));
                }}
                className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg"
              />
            </label>
            {modalError ? (
              <p className="mt-4 text-sm text-red-300/90" role="alert">
                {modalError}
              </p>
            ) : null}
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!modalSubmitting) {
                    setModalOpen(false);
                    setModalError(null);
                  }
                }}
                className="rounded-tf border border-tf-border px-4 py-2 text-sm text-tf-muted"
                disabled={modalSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitNew()}
                disabled={modalSubmitting}
                className="rounded-tf bg-tf-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {modalSubmitting ? "Salvando…" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
