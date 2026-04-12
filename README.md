# TelaFlow

Monorepo da plataforma TelaFlow (Cloud web, API, Player desktop e contratos compartilhados).

## Estrutura

| Caminho | Descrição |
|--------|-----------|
| [apps/cloud-web](apps/cloud-web) | Next.js (App Router) — UI cloud; skeleton com página de status que consome `@telaflow/shared-contracts`. |
| [apps/cloud-api](apps/cloud-api) | FastAPI — health check; camadas `domain` / `application` / `api` reservadas. |
| [apps/player](apps/player) | Tauri 2 + Vite + React — leitor desktop; stub que referencia tipos de cena do pacote de contratos. |
| [packages/shared-contracts](packages/shared-contracts) | Contratos Zod + TypeScript; build emite também `dist/schema/*.json` (Zod → JSON Schema). |

## Documentação de execução

- Plano da Fase 1: [docs/specs/PHASE_1_EXECUTION_SPEC.md](docs/specs/PHASE_1_EXECUTION_SPEC.md)

## Scripts (raiz)

- `npm install` — instala workspaces; `postinstall` compila `@telaflow/shared-contracts`.
- `npm run build:contracts` — pacote de contratos + geração de JSON Schema em `dist/schema/`.
- `npm run test:contracts` — testes Vitest de parse/rejeição dos schemas.
- `npm run typecheck` — contratos, `cloud-web` e `player`.

Desenvolvimento por app: `npm run dev -w cloud-web`, `npm run dev -w player`, e no diretório `apps/cloud-api` conforme o [README](apps/cloud-api/README.md) da API.

## Dependências entre workspaces

Os apps referenciam `@telaflow/shared-contracts` com versão `*` (resolvida pelo npm workspaces). Evite prefixos `workspace:` se o `npm` do ambiente rejeitar esse protocolo.
