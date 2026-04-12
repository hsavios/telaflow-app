import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { MediaKind, MediaRequirementContract, SceneContract } from "@telaflow/shared-contracts";
import { useEffect, useState } from "react";
import {
  describeSceneMediaDerivedStatePt,
  type SceneMediaDerivedState,
} from "./sceneMediaResolution.js";

type Props = {
  scene: SceneContract;
  mediaState: SceneMediaDerivedState;
  workspaceRoot: string | null;
  bindings: Record<string, string>;
  /** Linha do manifest para `scene.media_id`, se existir. */
  mediaRequirement: MediaRequirementContract | null;
};

export function SceneMediaRenderer({
  scene,
  mediaState,
  workspaceRoot,
  bindings,
  mediaRequirement,
}: Props) {
  const mediaId = scene.media_id ?? null;
  const mediaKind: MediaKind | null = mediaRequirement?.media_type ?? null;

  const [assetSrc, setAssetSrc] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState(false);

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
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bindings, mediaId, mediaKind, mediaState, scene.scene_id, workspaceRoot]);

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
