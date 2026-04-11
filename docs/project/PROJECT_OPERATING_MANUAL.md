# TelaFlow — Project Operating Manual

Manual principal de operação do repositório e do ambiente de produção.

---

## Visão do produto

TelaFlow é uma plataforma para operação visual de eventos ao vivo.

Fluxo central do produto:

```txt
Cloud → Pack → Player
```

### Cloud

Camada de autoria, organização e governança.

### Pack

Contrato exportado contendo metadados operacionais do evento.

### Player

Execução local offline-first no ambiente do evento.

---

## Stack oficial atual

### Backend

- Python
- FastAPI

### Frontend

- Next.js
- React

### Infraestrutura

- Docker
- Docker Compose
- GitHub Actions
- GHCR (GitHub Container Registry)
- Cloudflare Tunnel

---

## Domínios em produção

### Aplicação (Cloud Web)

https://app.telaflow.ia.br

### API (Cloud API)

https://api.telaflow.ia.br

### Landing

Site público: https://telaflow.ia.br — servido na VPS com Nginx; DNS e TLS via Cloudflare.

---

## Deploy oficial

Fluxo oficial:

```txt
push main
  → GitHub Actions
  → build imagens Docker
  → push GHCR
  → SSH VPS
  → docker compose pull
  → docker compose up -d
```

### Fluxo Git

- Trabalhar em branch quando fizer sentido; integração na `main` dispara o pipeline acima.
- Antes do push: `git status`, `git diff`, build local quando tocar em código compilável.

### Fluxo VPS

- SSH no servidor de produção.
- Diretório de operação: `/opt/telaflow` (ver secção seguinte).
- Após o Actions publicar imagens: `docker compose pull` e `docker compose up -d` no diretório do compose.

### Fluxo Cloudflare

- Um único tunnel (ex.: `heliosavio-vps-prod`) aponta serviços na VPS.
- Hostnames públicos atuais: `app.telaflow.ia.br`, `api.telaflow.ia.br` (e o domínio da landing conforme DNS).

---

## Infra VPS atual

Diretório principal:

```txt
/opt/telaflow
```

Arquivos principais:

- `docker-compose.yml`
- `.env`

---

## Containers principais

### cloud-api

- Porta **interna** do processo: `8000`.

### cloud-web

- Porta **interna** do processo: `3000`.

Mapeamento atual no host (via `.env`):

- `API_PORT=8002`
- `WEB_PORT=3002`

---

## Cloudflare

Tunnel compartilhado na VPS (nome operacional conhecido):

```txt
heliosavio-vps-prod
```

Hostnames atuais expostos pelo tunnel (exemplos):

- `app.telaflow.ia.br`
- `api.telaflow.ia.br`

Ajustes de rota public hostname ↔ serviço local no painel do Cloudflare / config do `cloudflared`.

---

## Variáveis críticas

### cloud-web

- `NEXT_PUBLIC_CLOUD_API_URL` — URL pública da API (ex.: `https://api.telaflow.ia.br`), usada pelo browser.

### cloud-api

- `CLOUD_API_CORS_ORIGINS` — origens permitidas para CORS (lista separada por vírgula), incluindo a origem do app (ex.: `https://app.telaflow.ia.br`).

---

## Fluxo Cursor (regra obrigatória após qualquer entrega do Cursor)

1. `git status`
2. `git diff --stat`
3. build local (quando aplicável)
4. testar endpoint ou fluxo na UI
5. `commit`
6. `push`
7. validar GitHub Actions
8. validar produção (app + API + health)

---

## Comandos padrão de validação

### Frontend (monorepo, a partir da raiz do repo)

```bash
npm run build -w cloud-web
```

### Backend local

```bash
cd apps/cloud-api
source .venv/bin/activate
uvicorn telaflow_cloud_api.main:app --reload --host 127.0.0.1 --port 8000
```

### Health

```bash
curl -sS http://127.0.0.1:8000/health
```

### Events

```bash
curl -sS http://127.0.0.1:8000/events
```

---

## Regra arquitetural atual

Não inflar escopo.

Sempre construir:

**base mínima → validar → só então expandir.**

---

## Ordem natural do produto

```txt
Eventos
  → Scenes
  → Pack
  → Player
```

---

## Filosofia de trabalho

Não aceitar entrega sem entender:

- o que mudou
- onde mudou
- impacto em infra
- impacto em deploy
- risco futuro
