"use client";

import { useId, useRef } from "react";
import type { CloudMediaRequirement } from "@/lib/cloud-api";

const TIPO: Record<CloudMediaRequirement["media_type"], string> = {
  video: "Vídeo",
  image: "Imagem",
  audio: "Áudio",
  other: "Mídia",
};

function acceptAttr(t: CloudMediaRequirement["media_type"]): string {
  switch (t) {
    case "image":
      return "image/*";
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    default:
      return "image/*,video/*,audio/*";
  }
}

type Props = {
  requirement: CloudMediaRequirement | null;
  /** URL `blob:` local, `https?` da API (`preview_url`) ou vazio. */
  resolvedSrc: string | null;
  onPickLocalMediaFile?: (mediaId: string, file: File) => void;
  onClearLocalMediaFile?: (mediaId: string) => void;
  /** Se existe arquivo local (blob) para este slot — mostra ação «Remover». */
  hasLocalBlob: boolean;
};

export function PreviewMediaBlock({
  requirement,
  resolvedSrc,
  onPickLocalMediaFile,
  onClearLocalMediaFile,
  hasLocalBlob,
}: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!requirement) {
    return (
      <div className="preview-stage-media preview-stage-media--empty">
        <p className="preview-stage-media__title">Sem slot de mídia nesta cena</p>
        <p className="preview-stage-media__hint">
          No Player, o telão segue o que estiver vinculado no workspace. Aqui só vemos o
          roteiro da Cloud.
        </p>
      </div>
    );
  }

  const tipo = TIPO[requirement.media_type] ?? requirement.media_type;
  const showReal = Boolean(resolvedSrc?.trim());

  return (
    <div className="preview-stage-media">
      <div className="preview-stage-media__viewport">
        {showReal && requirement.media_type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- URLs blob ou API externas
          <img
            className="preview-stage-media__real preview-stage-media__real--image"
            src={resolvedSrc!}
            alt={requirement.label}
          />
        ) : null}
        {showReal && requirement.media_type === "video" ? (
          <video
            className="preview-stage-media__real preview-stage-media__real--video"
            src={resolvedSrc!}
            controls
            playsInline
            preload="metadata"
          />
        ) : null}
        {showReal && requirement.media_type === "audio" ? (
          <div className="preview-stage-media__audio-wrap">
            <audio className="preview-stage-media__real--audio" src={resolvedSrc!} controls preload="metadata" />
          </div>
        ) : null}
        {showReal && requirement.media_type === "other" ? (
          resolvedSrc!.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="preview-stage-media__real preview-stage-media__real--image"
              src={resolvedSrc!}
              alt={requirement.label}
            />
          ) : (
            <video
              className="preview-stage-media__real preview-stage-media__real--video"
              src={resolvedSrc!}
              controls
              playsInline
              preload="metadata"
            />
          )
        ) : null}

        {!showReal ? (
          <div className="preview-stage-media__placeholder" aria-hidden="true">
            {requirement.media_type === "video" ? (
              <span className="preview-stage-media__glyph">▶</span>
            ) : requirement.media_type === "image" ? (
              <span className="preview-stage-media__glyph">▣</span>
            ) : requirement.media_type === "audio" ? (
              <span className="preview-stage-media__glyph">♪</span>
            ) : (
              <span className="preview-stage-media__glyph">◆</span>
            )}
          </div>
        ) : null}
      </div>

      <div className="preview-stage-media__meta">
        <p className="preview-stage-media__title">{requirement.label}</p>
        <p className="preview-stage-media__sub">
          {tipo}
          {requirement.required ? " · obrigatório no pack" : ""}
        </p>
      </div>

      <div className="preview-stage-media__actions">
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept={acceptAttr(requirement.media_type)}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && onPickLocalMediaFile) onPickLocalMediaFile(requirement.media_id, f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="preview-stage-media__btn"
          onClick={() => fileRef.current?.click()}
        >
          {showReal ? "Trocar arquivo local" : "Carregar arquivo local"}
        </button>
        {hasLocalBlob && onClearLocalMediaFile ? (
          <button
            type="button"
            className="preview-stage-media__btn preview-stage-media__btn--ghost"
            onClick={() => onClearLocalMediaFile(requirement.media_id)}
          >
            Remover arquivo local
          </button>
        ) : null}
      </div>

      <p className="preview-stage-media__hint">
        {showReal
          ? "Arquivo ou URL só neste navegador — a Cloud MVP ainda não hospeda mídia."
          : "Para ver imagem ou vídeo aqui, carregue um arquivo local (só neste navegador) ou aguarde URL de prévia na API."}
      </p>
    </div>
  );
}
