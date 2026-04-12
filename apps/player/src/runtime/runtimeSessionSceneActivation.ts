import type { PackLoaderSuccess } from "../pack/validateLoadedPack.js";

/** Mensagem de log alinhada ao comportamento anterior (`App.tsx`). */
export function mensagemAtivacaoCena(pack: PackLoaderSuccess, indice: number): string {
  const ordenadas = [...pack.event.scenes]
    .filter((sc) => sc.enabled)
    .sort((a, b) => {
      const o = a.sort_order - b.sort_order;
      return o !== 0 ? o : a.scene_id.localeCompare(b.scene_id);
    });
  const sc = ordenadas[indice];
  if (!sc) return `scene_index=${indice} (sem cena)`;
  return `scene_index=${indice}; scene_id=${sc.scene_id}; name=${sc.name}; type=${sc.type}`;
}
