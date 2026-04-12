import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { MediaKind, MediaRequirementContract, SceneContract } from "@telaflow/shared-contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { EXECUTION_LOG_CODES } from "../execution/executionLog.js";
import type { ExecutionLogLevel } from "../execution/executionLog.js";
import {
  describeSceneMediaDerivedStatePt,
  type SceneMediaDerivedState,
} from "./sceneMediaResolution.js";

type PlaybackLogPayload = {
  level: ExecutionLogLevel;
  code: string;
  message: string;
};

type Props = {
  scene: SceneContract;
  mediaState: SceneMediaDerivedState;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  /** Linha do manifest para `scene.media_id`, se existir. */
  mediaRequirement: MediaRequirementContract | null;
  onPlaybackLog: (entry: PlaybackLogPayload) => void;
  /**
   * `public`: textos neutros para audiência (sem códigos técnicos) e sem eventos no callback de log.
   * `operator`: comportamento MVP completo para o painel do operador.
   */
  presentation?: "operator" | "public";
};

function logMedia(
  onPlaybackLog: (entry: PlaybackLogPayload) => void,
  code: string,
  message: string,
  level: ExecutionLogLevel = "info",
) {
  onPlaybackLog({ level, code, message });
}

export function SceneMediaRenderer({
  scene,
  mediaState,
  workspaceRoot,
  bindings,
  mediaRequirement,
  onPlaybackLog,
  presentation = "operator",
}: Props) {
  const isPublic = presentation === "public";
  const mediaId = scene.media_id ?? null;
  const mediaKind: MediaKind | null = mediaRequirement?.media_type ?? null;

  const [assetSrc, setAssetSrc] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState(false);
  const stateFailKey = `${scene.scene_id}:${mediaState}`;
  const loggedStateFail = useRef<string | null>(null);
  const loggedUnsupported = useRef<string | null>(null);
  const loggedStartedForSrc = useRef<string | null>(null);
  const loggedDecodeFailForSrc = useRef<string | null>(null);

  useEffect(() => {
    loggedStartedForSrc.current = null;
    loggedDecodeFailForSrc.current = null;
  }, [assetSrc]);

  useEffect(() => {
    if (isPublic) return;
    if (mediaState !== "media_missing_binding" && mediaState !== "media_file_missing") {
      return;
    }
    if (loggedStateFail.current === stateFailKey) return;
    loggedStateFail.current = stateFailKey;
    logMedia(
      onPlaybackLog,
      EXECUTION_LOG_CODES.MEDIA_FAILED,
      `media_id=${mediaId ?? "—"}; estado=${mediaState}; ${describeSceneMediaDerivedStatePt(mediaState)}`,
      "warn",
    );
  }, [isPublic, mediaState, mediaId, onPlaybackLog, stateFailKey]);

  useEffect(() => {
    let cancelled = false;
    setAssetSrc(null);
    setResolveError(false);

    if (mediaState !== "media_bound" || !workspaceRoot || !mediaId) {
      return () => {
        cancelled = true;
      };
    }
    if (mediaKind !== "image" && mediaKind !== "video") {
      const key = `${scene.scene_id}:unsupported:${mediaKind ?? "none"}`;
      if (loggedUnsupported.current !== key) {
        loggedUnsupported.current = key;
        if (!isPublic) {
          const msg =
            mediaKind == null
              ? `media_id=${mediaId}; sem entrada no media-manifest — não é possível playback tipado`
              : `media_id=${mediaId}; tipo=${mediaKind} — playback MVP só suporta image e video`;
          logMedia(onPlaybackLog, EXECUTION_LOG_CODES.MEDIA_FAILED, msg, "warn");
        }
      }
      return () => {
        cancelled = true;
      };
    }

    const rel = bindings[mediaId];
    if (!rel) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const abs = await invoke<string>("resolve_workspace_file_path", {
          workspacePath: workspaceRoot,
          relative: rel,
        });
        if (cancelled) return;
        setAssetSrc(convertFileSrc(abs));
      } catch {
        if (!cancelled) {
          setResolveError(true);
          if (!isPublic) {
            logMedia(
              onPlaybackLog,
              EXECUTION_LOG_CODES.MEDIA_FAILED,
              `media_id=${mediaId}; falha ao resolver caminho para playback`,
              "error",
            );
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bindings, isPublic, mediaId, mediaKind, mediaState, onPlaybackLog, scene.scene_id, workspaceRoot]);

  const onMediaStarted = useCallback(
    (kind: "image" | "video", srcKey: string) => {
      if (isPublic) return;
      if (loggedStartedForSrc.current === srcKey) return;
      loggedStartedForSrc.current = srcKey;
      logMedia(
        onPlaybackLog,
        EXECUTION_LOG_CODES.MEDIA_STARTED,
        `scene_id=${scene.scene_id}; media_id=${mediaId}; kind=${kind}`,
        "info",
      );
    },
    [isPublic, mediaId, onPlaybackLog, scene.scene_id],
  );

  const onMediaDecodeFailed = useCallback(
    (srcKey: string) => {
      if (isPublic) return;
      if (loggedDecodeFailForSrc.current === srcKey) return;
      loggedDecodeFailForSrc.current = srcKey;
      logMedia(
        onPlaybackLog,
        EXECUTION_LOG_CODES.MEDIA_FAILED,
        `scene_id=${scene.scene_id}; media_id=${mediaId}; erro ao carregar recurso (decode/rede)`,
        "error",
      );
    },
    [isPublic, mediaId, onPlaybackLog, scene.scene_id],
  );

  const pubClass = isPublic ? " scene-media--public" : "";

  if (mediaState === "no_media_required") {
    return (
      <section
        className={`scene-media scene-media--placeholder${pubClass}`}
        aria-label="Mídia da cena"
      >
        <p className="scene-media__placeholder-text">
          {isPublic
            ? "Nesta fase não há vídeo ou imagem para exibir."
            : describeSceneMediaDerivedStatePt(mediaState)}
        </p>
      </section>
    );
  }

  if (mediaState === "media_missing_binding" || mediaState === "media_file_missing") {
    return (
      <section
        className={`scene-media scene-media--fallback scene-media--${mediaState}${pubClass}`}
        aria-label="Mídia da cena"
      >
        <div className="scene-media__fallback-card">
          <strong>Mídia indisponível</strong>
          <p>
            {isPublic
              ? "O conteúdo de mídia não está disponível no momento."
              : describeSceneMediaDerivedStatePt(mediaState)}
          </p>
          {!isPublic && mediaId ? (
            <p className="scene-media__mono">
              <code>{mediaId}</code>
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  if (mediaState === "media_bound" && resolveError) {
    return (
      <section
        className={`scene-media scene-media--fallback scene-media--resolve-error${pubClass}`}
        aria-label="Mídia da cena"
      >
        <div className="scene-media__fallback-card">
          <strong>{isPublic ? "Conteúdo indisponível" : "Arquivo inacessível"}</strong>
          <p>
            {isPublic
              ? "Não foi possível carregar o conteúdo desta fase."
              : "Não foi possível preparar o caminho para reprodução."}
          </p>
        </div>
      </section>
    );
  }

  if (mediaState === "media_bound" && mediaId && mediaKind == null) {
    return (
      <section className={`scene-media scene-media--placeholder${pubClass}`} aria-label="Mídia da cena">
        <p className="scene-media__placeholder-text">
          {isPublic
            ? "Conteúdo em preparação."
            : "O media_id desta cena não consta no media-manifest deste export."}
        </p>
      </section>
    );
  }

  if (mediaState === "media_bound" && mediaKind && mediaKind !== "image" && mediaKind !== "video") {
    return (
      <section className={`scene-media scene-media--placeholder${pubClass}`} aria-label="Mídia da cena">
        <p className="scene-media__placeholder-text">
          {isPublic
            ? "Este formato de mídia não é suportado nesta versão do player."
            : `Tipo ${mediaKind} — playback MVP limitado a image e video.`}
        </p>
      </section>
    );
  }

  if (mediaState === "media_bound" && mediaKind === "image" && assetSrc) {
    return (
      <section className={`scene-media scene-media--playback${pubClass}`} aria-label="Mídia da cena">
        <img
          src={assetSrc}
          alt={mediaRequirement?.label ?? scene.name}
          className="scene-media__img"
          onLoad={() => onMediaStarted("image", assetSrc)}
          onError={() => onMediaDecodeFailed(assetSrc)}
        />
      </section>
    );
  }

  if (mediaState === "media_bound" && mediaKind === "video" && assetSrc) {
    return (
      <section className={`scene-media scene-media--playback${pubClass}`} aria-label="Mídia da cena">
        <video
          className="scene-media__video"
          src={assetSrc}
          controls
          muted
          autoPlay
          playsInline
          onLoadedData={() => onMediaStarted("video", assetSrc)}
          onError={() => onMediaDecodeFailed(assetSrc)}
        />
      </section>
    );
  }

  if (mediaState === "media_bound" && (mediaKind === "image" || mediaKind === "video") && !assetSrc) {
    return (
      <section className={`scene-media scene-media--placeholder${pubClass}`} aria-label="Mídia da cena">
        <p className="scene-media__placeholder-text">
          {isPublic ? "Carregando conteúdo..." : "Preparando mídia…"}
        </p>
      </section>
    );
  }

  return (
    <section className={`scene-media scene-media--placeholder${pubClass}`} aria-label="Mídia da cena">
      <p className="scene-media__placeholder-text">
        {isPublic ? "Conteúdo indisponível." : describeSceneMediaDerivedStatePt(mediaState)}
      </p>
    </section>
  );
}
