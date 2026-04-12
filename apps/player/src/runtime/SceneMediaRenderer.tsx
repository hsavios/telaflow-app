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
}: Props) {
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
  }, [mediaState, mediaId, onPlaybackLog, stateFailKey]);

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
        const msg =
          mediaKind == null
            ? `media_id=${mediaId}; sem entrada no media-manifest — não é possível playback tipado`
            : `media_id=${mediaId}; tipo=${mediaKind} — playback MVP só suporta image e video`;
        logMedia(onPlaybackLog, EXECUTION_LOG_CODES.MEDIA_FAILED, msg, "warn");
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
          logMedia(
            onPlaybackLog,
            EXECUTION_LOG_CODES.MEDIA_FAILED,
            `media_id=${mediaId}; falha ao resolver caminho para playback`,
            "error",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bindings, mediaId, mediaKind, mediaState, onPlaybackLog, scene.scene_id, workspaceRoot]);

  const onMediaStarted = useCallback(
    (kind: "image" | "video", srcKey: string) => {
      if (loggedStartedForSrc.current === srcKey) return;
      loggedStartedForSrc.current = srcKey;
      logMedia(
        onPlaybackLog,
        EXECUTION_LOG_CODES.MEDIA_STARTED,
        `scene_id=${scene.scene_id}; media_id=${mediaId}; kind=${kind}`,
        "info",
      );
    },
    [mediaId, onPlaybackLog, scene.scene_id],
  );

  const onMediaDecodeFailed = useCallback(
    (srcKey: string) => {
      if (loggedDecodeFailForSrc.current === srcKey) return;
      loggedDecodeFailForSrc.current = srcKey;
      logMedia(
        onPlaybackLog,
        EXECUTION_LOG_CODES.MEDIA_FAILED,
        `scene_id=${scene.scene_id}; media_id=${mediaId}; erro ao carregar recurso (decode/rede)`,
        "error",
      );
    },
    [mediaId, onPlaybackLog, scene.scene_id],
  );

  if (mediaState === "no_media_required") {
    return (
      <section className="scene-media scene-media--placeholder" aria-label="Mídia da cena">
        <p className="scene-media__placeholder-text">{describeSceneMediaDerivedStatePt(mediaState)}</p>
      </section>
    );
  }

  if (mediaState === "media_missing_binding" || mediaState === "media_file_missing") {
    return (
      <section
        className={`scene-media scene-media--fallback scene-media--${mediaState}`}
        aria-label="Mídia da cena"
      >
        <div className="scene-media__fallback-card">
          <strong>Mídia indisponível</strong>
          <p>{describeSceneMediaDerivedStatePt(mediaState)}</p>
          {mediaId ? (
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
      <section className="scene-media scene-media--fallback scene-media--resolve-error" aria-label="Mídia da cena">
        <div className="scene-media__fallback-card">
          <strong>Ficheiro inacessível</strong>
          <p>Não foi possível preparar o caminho para reprodução.</p>
        </div>
      </section>
    );
  }

  if (mediaState === "media_bound" && mediaId && mediaKind == null) {
    return (
      <section className="scene-media scene-media--placeholder" aria-label="Mídia da cena">
        <p className="scene-media__placeholder-text">
          O <code>media_id</code> desta cena não consta no <code>media-manifest</code> deste export.
        </p>
      </section>
    );
  }

  if (mediaState === "media_bound" && mediaKind && mediaKind !== "image" && mediaKind !== "video") {
    return (
      <section className="scene-media scene-media--placeholder" aria-label="Mídia da cena">
        <p className="scene-media__placeholder-text">
          Tipo <code>{mediaKind}</code> — playback MVP limitado a <strong>image</strong> e{" "}
          <strong>video</strong>.
        </p>
      </section>
    );
  }

  if (mediaState === "media_bound" && mediaKind === "image" && assetSrc) {
    return (
      <section className="scene-media scene-media--playback" aria-label="Mídia da cena">
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
      <section className="scene-media scene-media--playback" aria-label="Mídia da cena">
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
      <section className="scene-media scene-media--placeholder" aria-label="Mídia da cena">
        <p className="scene-media__placeholder-text">A preparar mídia…</p>
      </section>
    );
  }

  return (
    <section className="scene-media scene-media--placeholder" aria-label="Mídia da cena">
      <p className="scene-media__placeholder-text">{describeSceneMediaDerivedStatePt(mediaState)}</p>
    </section>
  );
}
