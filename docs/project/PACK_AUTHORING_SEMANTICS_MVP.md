# Pack Authoring Semantics MVP

Objetivo: enriquecer o **pack exportado** com metadados operacionais **opcionais e mínimos**, para o **Player** precisar inferir menos comportamento em runtime. Esta fase **não** inclui editor visual livre nem dezenas de flags.

Contrato canónico: pacote **`@telaflow/shared-contracts`** (Zod) + JSON Schemas em `packages/shared-contracts/dist/schema/` (gerados pelo build do pacote).

## Scene (`event.json` → `scenes[]`)

| Campo | Tipo | Uso operacional |
|--------|------|------------------|
| `scene_behavior` | objeto opcional `{ "mode": … }` | Sugere fluxo no palco quando presente. |
| `mode` | `"standard"` \| `"draw_operator_confirm"` \| `"placard"` \| `"transition"` | `draw_operator_confirm` alinha-se ao MVP de sorteio com confirmação; `placard` a conteúdo mais estático; `transition` a pontes curtas. |

Se omitido ou `null`, o Player continua a poder inferir a partir de `type` e de `branding.scene_type_presets`.

## Draw config (`draw-configs.json`)

| Campo | Tipo | Uso operacional |
|--------|------|------------------|
| `public_copy` | objeto opcional | Textos voltados à **audiência** (telas públicas), sem obrigar pt-BR no schema. |
| `headline` | string ≤200, opcional | Título curto. |
| `audience_instructions` | string ≤500, opcional | Instrução antes/durante o sorteio. |
| `result_label` | string ≤120, opcional | Rótulo junto ao resultado (ex.: «Número sorteado»). |

## Media manifest (`media-manifest.json` → `requirements[]`)

| Campo | Tipo | Uso operacional |
|--------|------|------------------|
| `usage_role` | `"scene_primary"` \| `"supporting"` \| `"brand_mark"` \| `"ambient"` | Classifica o papel do arquivo no roteiro (menos inferência por `scene_id` só). |
| `presentation` | `"default"` \| `"fullscreen"` \| `"contain"` \| `"background"` | Sugestão de apresentação no palco. |

## Branding (`branding.json`)

| Campo | Tipo | Uso operacional |
|--------|------|------------------|
| `scene_type_presets` | objeto opcional | Uma chave opcional por `SceneType` (`opening`, `institutional`, …). |
| Cada valor | `{ "default_behavior_mode"? }` | Comportamento sugerido quando a scene **não** define `scene_behavior`. |

Na Cloud API MVP, o export inclui um **`scene_type_presets`** padrão alinhado ao produto (ex.: `draw` → `draw_operator_confirm`). Eventuais editores podem omitir ou substituir no futuro sem quebrar o contrato.

## Regras de evolução

- Campos novos são **opcionais** ou **nullish** no Zod para packs antigos continuarem válidos.
- Cada campo novo deve ter **utilidade clara** no Player antes de expandir o conjunto.
- Não há **editor visual** nesta fase; apenas API + contrato + export.

## Referências

- `apps/cloud-api/README.md` — rotas e export em disco.
- `apps/cloud-api/tests/test_pack_export_schema_compliance.py` — validação dos JSON gerados contra os schemas do pacote.
