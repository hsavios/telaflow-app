# TelaFlow — Especificação de Execução da Fase 1 do MVP (PHASE_1_EXECUTION_SPEC)

**Versão:** 1.0.1  
**Status:** Documento normativo — referência para **implementação** da **Fase 1** (contratos centrais) do [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md)  
**Última revisão:** 2026-04-10  

**Hierarquia normativa:** Este documento é **derivado e subordinado** a, **nesta ordem**: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md), [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md), [DEPLOYMENT_MODEL_SPEC.md](./DEPLOYMENT_MODEL_SPEC.md), [UI_SPEC.md](./UI_SPEC.md), [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md), [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md), [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md), [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md), [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md), [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md). Em caso de ambiguidade ou conflito aparente, **prevalece** o documento mais acima na lista; desvios exigem **ADR** e revisão das specs tocadas.

**Escopo:** **execução** da Fase 1 — estrutura de repositório, contratos partilhados, modelos mínimos, persistência mínima, endpoints mínimos e primeira vertical. **Sem código**, **sem DDL literal**; nomes de tabelas e campos são **conceituais** e devem refletir o domínio abaixo.

**Âncora:** [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) §4 (FASE 1 — Contratos centrais); [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §21, §9.6, §21.3–21.4.

---

## Prefácio

A Fase 1 **não** é sprint de “telas bonitas”. É a **fundação** que impede o Player e a Cloud de divergirem em silêncio: **ids estáveis**, **schemas canónicos** do Pack, **persistência mínima** que já fala o idioma do [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) e **export** que já **materializa** [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) num **Pack mínimo** auditável em traço ([AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md)). Sem isto, a Fase 2 vira **CRUD genérico** e a Fase 3 vira **zip ad hoc** — exatamente os anti-padrões que [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §1.4 e §19 nomeiam.

Este documento **obriga** a ordem: **contrato antes de UI rica**; **shared-contracts antes de lógica espalhada**; **vertical mínima** (§14) antes de declarar a fase fechada ([MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) §14.1).

---

# 1. Papel da Fase 1

## 1.1 Por que esta fase estabiliza tudo

Toda decisão posterior — editor, pre-flight, runtime, licenciamento — **assume** que **Event**, **Scene** e **Pack** têm **ids imutáveis no domínio**, **schemas versionados** e **fronteira Pack/API** claras ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §21.3). Se a Fase 1 falha, **binding** no Player, **suporte** com `export_id` e **assinatura** do export **nunca** fecham de forma **reprodutível** ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §2.1 determinismo).

## 1.2 Por que não começar pela UI

A [UI_SPEC.md](./UI_SPEC.md) define **como** o produto **parece** e **comunica**; **não** define a **verdade serializada** do evento. Começar pela UI **arrasta** campos inventados no frontend, **ORM** espelhando telas e **Pack** como reflexo tardio — **inverte** [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §5 (**Cloud → Pack → Player**). A Fase 1 **pode** usar UI **mínima** ou ferramentas de API **apenas** para exercitar a vertical (§14); **não** exige **polish** nem fluxo comercial completo ([MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) §4.3).

---

# 2. Entregável real da Fase 1

Ao **fecho** da Fase 1, **deve existir**:

1. **Monorepo** (ou estrutura **equivalente** documentada) com `apps/` e `packages/` conforme §3.  
2. **`packages/shared-contracts`** com **Zod como fonte primária**, **JSON Schema gerado** e **semver próprio** do pacote (§3.1–§3.2) — Pack mínimo e artefatos alinhados a [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) e [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.6.  
3. **OpenAPI** (ou fonte gerada a partir do FastAPI) **espelhando** os endpoints mínimos §11 — **não** substitui o schema do Pack ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §21.3).  
4. **`cloud-api`** com **PostgreSQL** §10 e **endpoints** §11.  
5. **`cloud-web`** capaz de **disparar** a vertical §14 (pode ser UI **espartana**).  
6. **`player`** com **stub** que **lê** `pack.json` e **valida** `pack_version` / presença de ficheiros esperados **sem** runtime completo ([MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) §4.3).  
7. **Primeira vertical** §14 **demonstrável** e critérios §13 **cumpridos**.

---

# 3. Estrutura inicial oficial do repositório

Visão **normativa mínima**, alinhada a [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §21.2 — **sem** proliferar pacotes vazios nem “enterprise monorepo”.

```
apps/
  cloud-web/          # Next.js (App Router) — autoria mínima + chamadas à API
  cloud-api/          # FastAPI + domínio persistido + pipeline export mínimo
  player/             # Tauri 2 + React (Vite) — stub de leitura de Pack
packages/
  shared-contracts/   # Zod (fonte) + JSON Schema gerado + semver do pacote — ver §3.1–§3.2
  shared-constants/   # Opcional na Fase 1: pack_version inicial, constantes de formato — apenas se reduzir duplicação; senão pode viver em shared-contracts
```

**Nomenclatura:** a pasta **`packages/shared-contracts`** é o **nome canónico** na arquitetura. **Não** introduzir em paralelo **`packages/contracts`** e **`packages/schemas`** com **schemas duplicados** — se a equipa preferir outro **nome de pasta**, **um** pacote apenas, com **ADR** que aponte equivalência a `shared-contracts`.

**Limite:** **não** criar dezenas de `packages/*` na Fase 1; **domínio pesado** fica em `cloud-api` ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §21.4).

## 3.1 Stack técnica de contrato: Zod primário, JSON Schema derivado

**Decisão normativa (Fase 1):** a **fonte única** de verdade dos contratos **JSON** partilhados entre `cloud-web`, `cloud-api` e `player` é **Zod** (TypeScript). A partir dela **gera-se** **JSON Schema** (ficheiros `.json` ou pipeline CI) para:

- validação no **FastAPI** / tooling Python **contra o mesmo significado** que o TypeScript;  
- cumprimento do papel da [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §21.3 — o **artefato** “JSON Schema versionado” **existe** no repositório ou é **reproduzível** por build, **sem** ser escrito à mão em duplicado.

**Regras:**

- **Proibido** manter **Zod** e **JSON Schema** como **duas árvores** editadas separadamente — uma **sempre** deriva da outra (geração automática no build ou hook de CI).  
- **Não** “JSON Schema first” na Fase 1 — evita drift entre stacks e **falta de tipagem** no `cloud-web` e `player`.  
- Se no futuro a equipa **inverter** a fonte (JSON Schema first), exige **ADR** e migração explícita — **fora** do âmbito da Fase 1.

## 3.2 Versionamento semver de `packages/shared-contracts`

O pacote **`shared-contracts`** tem **versão semântica própria** no `package.json` (ou equivalente), **independente** da versão da app — ex.: começar em **`0.1.0`**.

**Função:** disciplinar **breaking changes** em contratos (`pack_version` do produto **acompanha** decisões de produto; o **semver do pacote** acompanha **evolução do código de schemas** e da geração Zod → JSON Schema). Qualquer **major** em `shared-contracts` **deve** estar **ligada** a revisão de `pack_version` / ADR quando aplicável ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.6).

---

# 4. Shared contracts obrigatórios

Conteúdo **mínimo** de `shared-contracts` (conceitual):

| Contrato | Função |
|----------|--------|
| **Ids centrais** | Formato e **opacidade** de `event_id`, `scene_id`, `organization_id`, `export_id`, `license_id`, `media_id` (quando já existirem no modelo mínimo) — alinhados a §5 e a [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §6.4. |
| **Event (snapshot / persistido)** | Estrutura **mínima** coerente com §7 e com [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) (evento como unidade central). |
| **Scene** | Objeto **tipado** com `scene_id`, `sort_order`, `type` (enum de tipos MVP — [MASTER_CONTEXT.md](../context/MASTER_CONTEXT.md) §6 ou EVENT_EDITOR §6), referências **opcionais** a `media_id` / `draw_config_id` **só se** já existirem no schema mínimo. |
| **Pack metadata (`pack.json`)** | Campos conceituais de [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §7.2: `pack_version`, `schema_version`, `export_id`, `event_id`, `organization_id`, `generated_at`, `app_min_player` (ou equivalente). |
| **Artefatos satélite mínimos** | Pelo menos **esqueleto** validável para `event.json`, `media-manifest.json`, `branding.json` conforme [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) — conteúdo **mínimo** permitido pelo schema, **sem** obrigar sorteio ou branding rico na Fase 1. |

**OpenAPI** da API Cloud: **rotas** §11; **não** duplicar o Pack como “JSON genérico” sem schema.

---

# 5. Política oficial de ids

| Id | Geração | Imutabilidade |
|----|---------|----------------|
| **`organization_id`** | Cloud, na criação do tenant (Fase 1 pode usar **organização única** seed para dev — [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) Fase 2 completa multi-tenant auth). | **Estável**; copiado para Pack. |
| **`event_id`** | Cloud, ao **criar** evento. | **Imutável** no ciclo de vida do evento; **reexport** preserva o mesmo id ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §6.4). |
| **`scene_id`** | Cloud, ao **criar** cena. | **Imutável**; **proibido** “renumerar” no export. |
| **`export_id`** | Cloud, **a cada** operação de export **bem-sucedida** — **sempre novo**. | **Opaco**; correlaciona auditoria e licença futura ([AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §10). |
| **`license_id`** | Reservado: **pode** ser `null` / ausente no Pack mínimo da Fase 1 **se** schema e ADR técnico permitirem; caso contrário **placeholder** estrutural **sem** motor completo ([LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md) — implementação **completa** fora da Fase 1, §12). | Quando existir, **estável** por emissão. |

**Regra:** ids de domínio são **copiados** para o Pack **sem** regeneração no pipeline ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §6.4). **`export_id`** é a **única** exceção de “novo por operação” entre reexports do **mesmo** estado lógico.

## 5.1 Naming técnico no domínio persistido e na API

**Objetivo:** evitar que `event_id` vire **`id`** genérico ou que `scene_id` vire **`sceneId`** **sem** mapeamento explícito — fonte de bugs em export, logs e suporte ([AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §10).

| Camada | Convenção mínima |
|--------|-------------------|
| **Base de dados / SQL** | Colunas e FKs com nomes **explícitos**: `event_id`, `scene_id`, `organization_id` — **não** usar só `id` como única chave de negócio sem prefixo de entidade em tabelas onde isso gere ambiguidade em joins e exports. |
| **API HTTP (JSON)** | Preferir **`snake_case`** nos **contratos estáveis** alinhados ao Pack (`event_id`, `scene_id`) — alinhado ao serializado no ficheiro. Se o cliente TypeScript usar `camelCase` **internamente**, o **mapeamento** boundary → domínio é **explícito** (uma camada, não mistura ad hoc). |
| **Pack JSON no disco** | **Snake_case** conforme [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) e schemas — **não** introduzir `sceneId` no ficheiro **sem** ADR. |

**Proibido:** persistir `scene_id` numa coluna `id` **sem** documentação do modelo mental; **proibido** expor na API **dois** nomes para o mesmo conceito sem versão de API.

---

# 6. Primeiro schema package

## 6.1 Ordem de entrada (Zod → geração JSON Schema)

**Ordem de entrada** em `shared-contracts` (prioridade) — **definições em Zod**; **emitir** artefatos JSON Schema para validação cruzada (§3.1):

1. **`pack.json`** — ancora `pack_version` e `schema_version` ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.6).  
2. **`event.json`** (ou nome canónico do snapshot de evento) — array ordenado de Scenes.  
3. **`scene`** (fragmento ou definição embutida) — tipos fechados, **sem** JSON livre ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §5.5).  
4. **`media-manifest.json`** — lista mínima (pode ser **vazia** com schema válido se o evento não declarar mídia).  
5. **`branding.json`** — **tokens mínimos** ou objeto vazio **se** permitido pelo schema (Fase 1 **não** exige branding avançado — §12).  
6. **Constantes** de `pack_version` **inicial** e **range** `app_min_player` — alinhamento a [DEPLOYMENT_MODEL_SPEC.md](./DEPLOYMENT_MODEL_SPEC.md) §8 quando existir Player público.

**Validação:** export **falha** se o snapshot **não** validar contra o **mesmo** contrato (Zod no TS; JSON Schema derivado no Python) **antes** de produzir ficheiros finais ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.6).

---

# 7. Primeiro modelo Event

Modelo **mínimo** (Cloud persistido **e** projeção exportável):

- **`event_id`**, **`organization_id`**  
- **Nome** (string) — identificação humana ([UI_SPEC.md](./UI_SPEC.md) labels futuros).  
- **Metadados opcionais** previstos no schema (datas, locale) — **omitíveis** na Fase 1 se schema assim permitir.  
- **Relação** com lista ordenada de Scenes (por `sort_order` **único** por evento — [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §9.2; [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §5.1).

**Proibido:** flags de UI transitórias, rascunho colaborativo, caminhos de ficheiro — [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §8.2.

---

# 8. Primeiro modelo Scene

Modelo **mínimo**:

- **`scene_id`**, **`event_id`**, **`sort_order`** (inteiro **único** no evento)  
- **`type`** — enum dos tipos MVP ([EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §6; [MASTER_CONTEXT.md](../context/MASTER_CONTEXT.md) §6)  
- **Campos tipados** permitidos pelo `type` — na Fase 1 **podem** ser **apenas** o mínimo (ex.: título de cena) **sem** sorteio nem mídia se o schema e o tipo **permitirem** cena “seca”  
- **Referências** `media_id` / `draw_config_id` — **opcionais** ou **ausentes** na primeira vertical **desde que** validação pré-export e schema **aceitem**

**Proibido:** Scene como recipiente de JSON arbitrário ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §5.5, §19).

---

# 9. Primeiro modelo Pack

## 9.1 Container físico obrigatório: ZIP desde o primeiro dia

O **primeiro** export operacional **não** pode ser “JSON cru” devolvido pelo endpoint **sem** empacotamento. **Obrigatório:** artefato **`.zip`** (ou contêiner equivalente normativo em [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md)) contendo a **árvore de ficheiros** na **ordem canónica** §6.1 / [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §6.1.

**Motivo:** forçar **pipeline real** (empacotar, assinar, registar) **cedo** — evita atalho que adia bugs de integridade e de naming de ficheiros até à Fase 3.

**Proibido na Fase 1:** endpoint de export que devolva **apenas** um blob JSON único **substituindo** o Pack **sem** zip, salvo **ADR** temporário com prazo de remoção.

## 9.2 Conteúdo mínimo do Pack

**Pack mínimo válido** (artefato no disco, não só BD):

- **`pack.json`** conforme §4 e [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §7.  
- **`event.json`** com **duas** Scenes na ordem correta (vertical §14).  
- **`media-manifest.json`** válido (pode listar **zero** entradas **se** coerente).  
- **`branding.json`** válido pelo schema mínimo.  
- **`signature.sig`** (e manifesto de ficheiros / ordem canónica) conforme [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §6.1 e política de assinatura — **chave de desenvolvimento** aceite **na Fase 1** com segregação de segredos ([DEPLOYMENT_MODEL_SPEC.md](./DEPLOYMENT_MODEL_SPEC.md) §15.4); **produção** exige endurecimento na Fase 3 sem **mudar** semântica contratual sem ADR.

**Nome do ficheiro zip** (recomendado): padrão de [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §5 (`export_id`, `pack_version`, etc.).

---

# 10. Primeira persistência oficial

**SGBD:** PostgreSQL ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3.1; [DEPLOYMENT_MODEL_SPEC.md](./DEPLOYMENT_MODEL_SPEC.md)).

**Tabelas mínimas conceituais:**

| Área | Tabelas (conceito) | Notas |
|------|---------------------|--------|
| **Tenant** | `organizations` | Pelo menos uma organização para desenvolvimento; Fase 2 endurece auth e isolamento. |
| **Evento** | `events` | Chave `event_id`, FK a `organization_id`. |
| **Cena** | `scenes` | Chave `scene_id`, FK a `event_id`, `sort_order` **único** por evento. |
| **Export** | `exports` (ou equivalente) | `export_id`, `event_id`, `organization_id`, `pack_version`, `generated_at`, referência a **localização** do artefato se armazenado ([DEPLOYMENT_MODEL_SPEC.md](./DEPLOYMENT_MODEL_SPEC.md) §15.3; [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md)). |

**Sem** dados de mídia binária na Cloud ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3.1).

## 10.1 Política mínima de migrations (`cloud-api`)

**Desde a primeira tabela:** alterações de esquema relacional **obedecem** a **migrations versionadas** (ex.: Alembic, ou ferramenta equivalente **fixada** no repositório).

**Regras:**

- **Proibido** “aplicar SQL à mão” em produção **como norma** — só exceção documentada e reversível.  
- **Proibido** começar com `CREATE TABLE` **só** em ambiente local **sem** ficheiro de migration correspondente no repositório.  
- **Baseline:** a **primeira** migration cobre o **estado inicial** mínimo §10 (pode ser uma única revisão se o projeto nascer já com migrations).

**Objetivo:** evitar que a Fase 2 herde **drift** irrecuperável entre ambientes ([DEPLOYMENT_MODEL_SPEC.md](./DEPLOYMENT_MODEL_SPEC.md) §12).

---

# 11. Primeiros endpoints mínimos

Todos **server-side** como fonte de verdade ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.2). Autenticação **completa** **fora** da Fase 1 (§12); **permitido** mecanismo **dev-only** (token, rede interna) **documentado** e **impossível** em produção sem Fase 2.

| Operação | Comportamento mínimo |
|----------|----------------------|
| **Criar evento** | POST — cria `event_id`, associa a `organization_id`; valida schema de entrada contra contrato API. |
| **Listar eventos** | GET — lista por organização (na Fase 1 pode ser **uma** org fixa). |
| **Criar scene** | POST — cria `scene_id`, `sort_order`, `type`; valida contra enum e regras mínimas [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md). |
| **Listar scenes** | GET — ordenação por `sort_order`. |
| **Exportar Pack mínimo** | POST (ou job síncrono) — lê estado persistido, valida contra **contrato Pack** (Zod/JSON Schema gerado §3.1), gera **ficheiros**, empacota **ZIP** §9.1, aplica ordem canónica e assinatura mínima, persiste `export_id` e registo em `exports`, devolve ou disponibiliza **download** do **zip** ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md); [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) eventos Cloud §5). |

**Proibido:** endpoint “export” que devolva **apenas** JSON solto **em substituição** do Pack zip normativo (§9.1).

---

# 12. O que NÃO entra na Fase 1

1. **Auth completa** (OAuth, convites, RBAC fino) — [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) Fase 2.  
2. **Branding avançado** e temas múltiplos — [UI_SPEC.md](./UI_SPEC.md); Fase 2/8.  
3. **Licensing completo** (emissão comercial, grace, UI de validade) — [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md); **stub** estrutural **apenas** se §5/§9 o exigirem.  
4. **Pre-flight completo** (G1–G5, `run_id`, FSM `ready`) — [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md); Fase 5.  
5. **Runtime completo** (FSM de execução, telão, controlos) — [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md); Fase 6.  
6. **Player** além de **stub** de leitura/validação — Fase 4.  
7. **Armazenamento de mídia** na Cloud — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3.1.  
8. **Telemetria** ou sync de logs Player → Cloud — [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §20.  
9. **CDN, HA multi-região** — [DEPLOYMENT_MODEL_SPEC.md](./DEPLOYMENT_MODEL_SPEC.md) §18.

---

# 13. Critério de pronto da Fase 1

A Fase 1 **fecha** quando, **simultaneamente**:

1. [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) §14 (tabela, linha Fase **1**) — contratos **aceites** pela equipa como base para F2/F3/F4.  
2. **`shared-contracts`** em **semver** inicial (§3.2), com **Zod** como fonte e **JSON Schema** gerado **usados** na validação de export **real** (não só ficheiros órfãos).  
3. **PostgreSQL** contém as entidades §10 com **integridade** referencial mínima e **histórico de migrations** §10.1 desde a primeira tabela.  
4. **OpenAPI** reflete os endpoints §11 **sem** divergência não documentada do comportamento.  
5. **Vertical §14** executada **de ponta a ponta** (API + **ficheiro `.zip`** no disco §9.1).  
6. **Player stub** lê `pack.json` e **rejeita** ou **aceita** `pack_version` de forma **alinhada** a [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §15.3 (mensagem **clara** — [UI_SPEC.md](./UI_SPEC.md) espírito, ainda que UI mínima).  
7. **Congelamento** aplicável: alterações **estruturais** aos contratos após fecho exigem [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) §14.1 + ADR.

---

# 14. Primeira vertical obrigatória

**Sequência obrigatória** (alinhada a [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) §3.1, **recorte** Fase 1):

1. **Criar evento** via API (persistido).  
2. **Adicionar duas Scenes** com `sort_order` **distintos** e `type` válido.  
3. **Exportar Pack mínimo válido** — **ficheiro `.zip`** §9.1 com `pack.json` + artefatos §9.2, `export_id` novo, registo em `exports` e **validação** (Zod / JSON Schema gerado §3.1) **antes** de assinar.  
4. **Abrir** o zip no **Player stub** e **confirmar** leitura de `pack_version` / `event_id` / contagem de Scenes esperada (sem exigir pre-flight completo).

**Objetivo:** provar **Cloud → Pack** com **contrato** antes de investir em Fase 2 UI.

---

# 15. Estratégia de testes da Fase 1

1. **Contratos primeiro:** testes que falham se JSON **não** valida contra **Zod** / **JSON Schema gerado** (§3.1) — export e, se aplicável, payloads API.  
2. **Schema consistency:** `pack.json` ↔ `event.json` ↔ manifestos — ids referenciados **existem** (grafo **fechado** mínimo).  
3. **Export determinístico mínimo:** para **mesmo** estado persistido e mesma `pack_version` / política de pipeline, **mesma** estrutura semântica de ficheiros ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §2.1 — variando apenas `export_id`, `generated_at`, assinatura como consequência).  
4. **Regressão** de `sort_order` duplicado — export **deve falhar** ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §9.2).

---

# 16. Relação com Cursor / IA

- **Nenhuma** estrutura de pastas, campo de modelo ou ficheiro do Pack **fora** desta spec e de `shared-contracts` **sem** ADR.  
- **Proibido** gerar **endpoints** que devolvam “qualquer JSON” para acomodar o frontend — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §13, §21.4.  
- Respeitar **§3.1** (Zod → JSON Schema), **§5.1** (naming), **§9.1** (ZIP), **§10.1** (migrations).  
- Prompts **devem** citar **ficheiro e secção** (ex.: PACK_EXPORT §7, EVENT_EDITOR §5.1, esta spec §11).

---

# 17. Anti-padrões da Fase 1

1. **UI-driven schema** — campos inventados no Next sem passar por `shared-contracts`.  
2. **Pack manual** “para testar” como substituto do pipeline — [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §3.  
3. **Ids** regenerados no export — [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §6.4.  
4. **Lógica de negócio** em `shared-contracts` — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §21.4.  
5. **Scene** como `Record<string, unknown>`.  
6. **Saltar** vertical §14 e declarar Fase 1 fechada.  
7. **Auth em produção** com token fixo copiado do tutorial.  
8. **Assinatura** omitida **sem** ADR que explique risco e prazo de correção.  
9. **JSON Schema** editado **à mão** em paralelo ao **Zod** — drift inevitável (§3.1).  
10. **Export** como resposta HTTP de **JSON único** **sem** zip §9.1.  
11. **Schema SQL** criado **só** em ambiente local **sem** migration versionada (§10.1).  
12. **`event_id`** persistido como **`id`** **opaque** em modelo de domínio **sem** mapa explícito (§5.1).

---

# 18. Critério normativo final

A **Fase 1** é **fundação**, não **vitrine**: estabiliza **ids**, **schemas** e **Pack mínimo** para que [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §5 seja **verdade técnica**, não slogan. Toda implementação da Fase 1 **deve obedecer** a este documento, ao [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) e à hierarquia normativa no cabeçalho.

---

*Documento interno de execução — TelaFlow. PHASE_1_EXECUTION_SPEC v1.0.1. Derivado de [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) v1.1, [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) v1.1, [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) v1.0.4, [DEPLOYMENT_MODEL_SPEC.md](./DEPLOYMENT_MODEL_SPEC.md) v1.0.1, [UI_SPEC.md](./UI_SPEC.md) v1.0, [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) v1.1, [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) v1.1, [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) v1.0.2, [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) v1.0.1, [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md) v1.0.1 e [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) v1.0.1.*
