import type { CloudMediaRequirement } from "@/lib/cloud-api";

const TIPO: Record<CloudMediaRequirement["media_type"], string> = {
  video: "Vídeo",
  image: "Imagem",
  audio: "Áudio",
  other: "Mídia",
};

type Props = {
  requirement: CloudMediaRequirement | null;
};

export function PreviewMediaBlock({ requirement }: Props) {
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

  return (
    <div className="preview-stage-media">
      <div className="preview-stage-media__frame" aria-hidden="true">
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
      <div className="preview-stage-media__meta">
        <p className="preview-stage-media__title">{requirement.label}</p>
        <p className="preview-stage-media__sub">
          {tipo}
          {requirement.required ? " · obrigatório no pack" : ""}
        </p>
        <p className="preview-stage-media__id">{requirement.media_id}</p>
      </div>
      <p className="preview-stage-media__hint">
        Pré-visualização: o ficheiro real liga-se no TelaFlow Player após o export.
      </p>
    </div>
  );
}
