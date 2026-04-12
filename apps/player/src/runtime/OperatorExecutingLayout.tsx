/**
 * Layout da visão do operador em execução: roteiro, palco (ScenePresenter) e centro de comando.
 * Controlo operacional via `RuntimeSessionStore` (ações explícitas).
 */

import type {
  DrawConfigContract,
  MediaRequirementContract,
  SceneContract,
} from "@telaflow/shared-contracts";
import { useMemo } from "react";
import type { PackLoaderSuccess } from "../pack/validateLoadedPack.js";
import { ScenePresenter } from "./ScenePresenter.js";
import { useRuntimeSession } from "./RuntimeSessionContext.js";
import { resolveSceneMediaState, type SceneMediaDerivedState } from "./sceneMediaResolution.js";
import { SceneMediaRenderer } from "./SceneMediaRenderer.js";
import {
  formatarHoraLogPt,
  midiaPainelRoteiro,
  midiaPainelRoteiroLegenda,
  resumoLogOperacionalPt,
  SCENE_TYPE_LABELS_PT,
  sorteioPainelRoteiro,
  sorteioPainelRoteiroLegenda,
} from "./sceneRuntimeUi.js";

type PlaybackLogPayload = {
  level: "info" | "warn" | "error";
  code: string;
  message: string;
};

type Props = {
  ordenadas: SceneContract[];
  sceneIndex: number;
  scene: SceneContract;
  mediaState: SceneMediaDerivedState;
  drawConfig: DrawConfigContract | null;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  mediaRequirement: MediaRequirementContract | null;
  packData: PackLoaderSuccess;
  fileExistsCache: Map<string, boolean>;
  onPlaybackLog: (entry: PlaybackLogPayload) => void;
};

function logNulo(_entry: PlaybackLogPayload) {
  /* Pré-visualização: sem registo no log de execução */
}

function drawConfigParaCena(pack: PackLoaderSuccess, sc: SceneContract): DrawConfigContract | null {
  const id = sc.draw_config_id?.trim();
  if (!id || sc.type !== "draw") return null;
  return pack.drawConfigs.draw_configs.find((d) => d.draw_config_id === id) ?? null;
}

function mediaReqParaCena(pack: PackLoaderSuccess, sc: SceneContract): MediaRequirementContract | null {
  const mid = sc.media_id?.trim();
  if (!mid) return null;
  return pack.mediaManifest.requirements.find((r) => r.media_id === mid) ?? null;
}

export function OperatorExecutingLayout({
  ordenadas,
  sceneIndex,
  scene,
  mediaState,
  drawConfig,
  workspaceRoot,
  bindings,
  mediaRequirement,
  packData,
  fileExistsCache,
  onPlaybackLog,
}: Props) {
  const { comandos, seletores } = useRuntimeSession();
  const cmd = seletores.comandos;
  const n = ordenadas.length;
  const idx = sceneIndex;

  const proxima = idx + 1 < n ? ordenadas[idx + 1]! : null;
  const seguinte = idx + 2 < n ? ordenadas[idx + 2]! : null;

  const proximaMediaEstado = useMemo(
    () => (proxima ? resolveSceneMediaState(proxima, workspaceRoot, bindings, fileExistsCache) : null),
    [proxima, workspaceRoot, bindings, fileExistsCache],
  );
  const proximaMediaReq = useMemo(
    () => (proxima ? mediaReqParaCena(packData, proxima) : null),
    [packData, proxima],
  );

  const avisosPalco = useMemo(() => {
    const linhas: string[] = [];
    if (mediaState === "media_missing_binding") {
      linhas.push("Mídia desta cena: falta vínculo a um arquivo na pasta do evento.");
    } else if (mediaState === "media_file_missing") {
      linhas.push("Mídia desta cena: arquivo ausente ou pasta do evento indisponível.");
    }
    const s = sorteioPainelRoteiro(scene, drawConfig);
    const leg = sorteioPainelRoteiroLegenda(s);
    if (leg) linhas.push(`Sorteio: ${leg.toLowerCase()}.`);
    return linhas;
  }, [mediaState, scene, drawConfig]);

  const acoesRecentes = useMemo(() => {
    const log = seletores.executionStatus.executionLog;
    if (log.length === 0) return [];
    return log.slice(-8).reverse();
  }, [seletores.executionStatus.executionLog]);

  const prev = () => comandos.cena_anterior();
  const next = () => comandos.cena_seguinte();

  return (
    <div className="player-exec-layout player-exec-layout--operator player-exec-layout--premium">
      <aside className="player-exec-sidebar" aria-label="Roteiro do evento">
        <h3 className="player-exec-sidebar__title">Roteiro</h3>
        <p className="player-exec-sidebar__intro">Ordem do palco. A cena no ar está em destaque; as duas seguintes estão assinaladas.</p>
        <ol className="player-exec-script">
          {ordenadas.map((sc, i) => {
            const mEst = resolveSceneMediaState(sc, workspaceRoot, bindings, fileExistsCache);
            const mBadge = midiaPainelRoteiro(mEst);
            const dCfg = drawConfigParaCena(packData, sc);
            const sDraw = sorteioPainelRoteiro(sc, dCfg);
            const sDrawLeg = sorteioPainelRoteiroLegenda(sDraw);
            const btnClass = [
              "player-exec-script__btn",
              i === idx ? "is-current" : "",
              i === idx + 1 ? "is-next" : "",
              i === idx + 2 ? "is-after-next" : "",
              i < idx ? "is-past" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const pillM = `player-exec-script__pill player-exec-script__pill--${mBadge}`;
            return (
              <li key={sc.scene_id}>
                <button type="button" className={btnClass} onClick={() => comandos.ativar_cena_por_indice(i)}>
                  <span className="player-exec-script__row-top">
                    <span className="player-exec-script__name">{sc.name}</span>
                    {i === idx ? <span className="player-exec-script__live">No ar</span> : null}
                    {i === idx + 1 ? <span className="player-exec-script__cue">Próxima</span> : null}
                    {i === idx + 2 ? <span className="player-exec-script__cue player-exec-script__cue--soft">Depois</span> : null}
                  </span>
                  <span className="player-exec-script__meta">
                    <span>{SCENE_TYPE_LABELS_PT[sc.type] ?? sc.type}</span>
                    {sc.media_id?.trim() ? (
                      <span className="player-exec-script__binding" title="Identificador de mídia no pack">
                        Mídia: <code>{sc.media_id}</code>
                      </span>
                    ) : (
                      <span className="player-exec-script__binding player-exec-script__binding--muted">Sem mídia ligada</span>
                    )}
                  </span>
                  <span className="player-exec-script__pills">
                    <span className={pillM}>{midiaPainelRoteiroLegenda(mBadge)}</span>
                    {sDrawLeg ? <span className="player-exec-script__pill player-exec-script__pill--warn">{sDrawLeg}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="player-exec-sidebar__legend" aria-hidden="true">
          <span>
            <i className="player-exec-legend-dot player-exec-legend-dot--pronta" /> Pronta
          </span>
          <span>
            <i className="player-exec-legend-dot player-exec-legend-dot--pendente" /> Pendente
          </span>
          <span>
            <i className="player-exec-legend-dot player-exec-legend-dot--ausente" /> Ausente
          </span>
          <span>
            <i className="player-exec-legend-dot player-exec-legend-dot--sem" /> Sem mídia
          </span>
        </div>
      </aside>

      <div className="player-exec-stage player-exec-stage--premium">
        {avisosPalco.length > 0 ? (
          <div className="player-exec-warnings" role="status">
            <strong className="player-exec-warnings__title">Atenção no palco</strong>
            <ul className="player-exec-warnings__list">
              {avisosPalco.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ScenePresenter
          scene={scene}
          sceneOrdinal={idx + 1}
          sceneTotal={n}
          mediaState={mediaState}
          drawConfig={drawConfig}
          workspaceRoot={workspaceRoot}
          bindings={bindings}
          mediaRequirement={mediaRequirement}
          mediaPlaybackId={seletores.operationalContext.mediaPlaybackId}
          onPlaybackLog={onPlaybackLog}
        />
      </div>

      <aside className="player-exec-ops player-exec-ops--premium" aria-label="Centro de comando do evento">
        <h3 className="player-exec-ops__title">Comando</h3>

        <div className="player-exec-ops-hero">
          <p className="player-exec-ops-hero__label">Cena no ar</p>
          <p className="player-exec-ops-hero__name">{scene.name}</p>
          <p className="player-exec-ops-hero__meta">
            {SCENE_TYPE_LABELS_PT[scene.type] ?? scene.type} · {idx + 1} de {n}
          </p>
        </div>

        {proxima ? (
          <div className="player-exec-ops-next">
            <p className="player-exec-ops-next__label">Próxima cena</p>
            <p className="player-exec-ops-next__name">{proxima.name}</p>
            <p className="player-exec-ops-next__meta">{SCENE_TYPE_LABELS_PT[proxima.type] ?? proxima.type}</p>
            {seguinte ? (
              <p className="player-exec-ops-next__chain">
                Depois: <strong>{seguinte.name}</strong>
              </p>
            ) : null}
            <div className="player-exec-next-peek" aria-label="Pré-visualização discreta da próxima cena">
              <SceneMediaRenderer
                scene={proxima}
                mediaState={proximaMediaEstado ?? "no_media_required"}
                workspaceRoot={workspaceRoot}
                bindings={bindings}
                mediaRequirement={proximaMediaReq}
                onPlaybackLog={logNulo}
                visualVariant="peek"
              />
            </div>
          </div>
        ) : (
          <p className="player-exec-ops-next__empty">Última cena do roteiro.</p>
        )}

        <div className="player-exec-ops-actions">
          <button
            type="button"
            className="player-exec-ops-actions__btn player-exec-ops-actions__btn--secondary"
            disabled={!cmd.cenaAnterior.permitido}
            title={cmd.cenaAnterior.motivo ?? "Volta para a cena anterior do roteiro"}
            onClick={prev}
          >
            Voltar cena
          </button>
          <button
            type="button"
            className="player-exec-ops-actions__btn player-exec-ops-actions__btn--primary"
            disabled={!cmd.cenaSeguinte.permitido}
            title={cmd.cenaSeguinte.motivo ?? "Avança para a próxima cena do roteiro"}
            onClick={next}
          >
            Próxima cena
          </button>
        </div>

        <button
          type="button"
          className="player-exec-ops__finish"
          disabled={!cmd.concluirExecucao.permitido}
          title={cmd.concluirExecucao.motivo ?? "Encerra o roteiro e conclui a execução no player"}
          onClick={() => comandos.concluir_execucao()}
        >
          Concluir bloco
        </button>

        {acoesRecentes.length > 0 ? (
          <div className="player-exec-ops-feed">
            <h4 className="player-exec-ops-feed__title">Ações recentes</h4>
            <ul className="player-exec-ops-feed__list">
              {acoesRecentes.map((e) => (
                <li key={e.id} className={`player-exec-ops-feed__item player-exec-ops-feed__item--${e.level}`}>
                  <span className="player-exec-ops-feed__time">{formatarHoraLogPt(e.at)}</span>
                  <span className="player-exec-ops-feed__text">{resumoLogOperacionalPt(e)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
