/**
 * Quando o manifest não traz `media_type`, infere image/video pelo sufixo do caminho
 * (export real: mp4, jpg, png, …) — só para playback no Player.
 */

export function inferPlaybackKindFromRelativePath(relativePath: string): "image" | "video" | null {
  const base = relativePath.split(/[\\/]/).pop() ?? relativePath;
  const q = base.split("?")[0]?.toLowerCase() ?? "";
  if (/\.(mp4|webm|mov|m4v|ogv)$/.test(q)) return "video";
  if (/\.(jpg|jpeg|png|gif|webp|avif|bmp)$/.test(q)) return "image";
  return null;
}
