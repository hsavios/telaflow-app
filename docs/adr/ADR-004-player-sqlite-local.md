# ADR-004 — SQLite local no TelaFlow Player

**Estado:** aceito  
**Data:** 2026-04-12  
**Contexto:** A [ARCHITECTURE_SPEC.md](../specs/ARCHITECTURE_SPEC.md) §15.2 previa JSON no MVP e §15.5 define quando SQLite faz sentido. O plano de finalização exige SQLite no Player para transações locais fiáveis.

## Decisão

Adotar **SQLite** embutido no Player (via `tauri-plugin-sql` + driver SQLite) para:

1. **Estado operacional do sorteio** — pool elegível, números já sorteados, contagem de tentativas e flags (`remove_after_draw`), associados a `(export_id, scene_id, draw_config_id)`.
2. **Espelho opcional de logs de execução** — append transacional complementar ao JSONL existente (o JSONL mantém-se para interoperabilidade e cópia manual).

Os **vínculos de mídia** podem migrar de `.telaflow/media-bindings.json` para a mesma base numa fase posterior; a primeira migração foca em `draw_runtime` e logs.

## Consequências

- **ADR obrigatório** satisfeito antes de expandir uso de SQLite (conforme arquitetura).
- Migrações versionadas no código Rust/Player (`migrations/` em `src-tauri`).
- O núcleo **offline** do show não depende da Cloud; o ficheiro SQLite vive junto ao workspace ou pasta do pack (definido na implementação).
- Testes: validar migração em arranque e idempotência de `db_init`.

## Alternativas rejeitadas

- **Só JSON** — insuficiente para exclusão de pool e retomada sem corrupção sob escrita concorrente.
- **LevelDB / sled** — menos familiar à equipa e às ferramentas de inspeção (DB Browser).
