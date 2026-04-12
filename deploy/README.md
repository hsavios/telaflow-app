# Deploy na VPS (GitHub Actions)

Espelha o fluxo do repositório **telaflow_landing**: o workflow SSH na VPS e executa `deploy/scripts/app-sync.sh`.

## Secrets (repositório GitHub — podem ser os mesmos da landing)

| Nome | Descrição |
|------|-----------|
| `VPS_HOST` | Hostname ou IP da VPS |
| `VPS_USER` | Usuário SSH |
| `VPS_SSH_PRIVATE_KEY` | Chave privada (conteúdo PEM) |

## Variable ou secret de caminho

| Nome | Descrição |
|------|-----------|
| `VPS_APP_PATH` | Caminho absoluto do clone deste monorepo na VPS (ex.: `/home/deploy/telaflow_app`) |

Preferência: **GitHub Variable** `VPS_APP_PATH` (não sensível). Pode usar secret com o mesmo nome se preferir.

## Na VPS

- **Node.js 20+** e `npm` no `PATH` do usuário SSH.
- Clone do repositório na pasta indicada por `VPS_APP_PATH`, remote `origin` apontando para o GitHub, branch `main` rastreada.
- Script: `deploy/scripts/app-sync.sh` — `git pull --ff-only origin main`, depois `npm ci` e `npm run verify`.

Para rebuild sem commit novo (igual à landing): o workflow chama com `--force`.

## Python (opcional neste workflow)

O `npm run verify` atual **não** executa `pytest` da `cloud-api`. Na raiz do monorepo existe `npm run test:cloud-api` (gera schemas + instala deps + `pytest tests/`). Para CI na VPS, pode estender `app-sync.sh` com esse comando ou com `cd apps/cloud-api && pip install -e ".[dev]" && pytest`.
