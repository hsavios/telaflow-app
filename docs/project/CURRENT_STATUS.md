# TelaFlow — Current Status

Resumo objetivo do que está no ar e do que ainda limita o produto.

---

## Estado atual do produto

---

## Cloud API

Funciona em produção.

### Endpoints ativos

- `GET /health`
- `GET /events`
- `POST /events`
- `GET /events/{event_id}`
- `GET /events/{event_id}/scenes`
- `POST /events/{event_id}/scenes/reorder`
- `POST /events/{event_id}/scenes`
- `GET /events/{event_id}/scenes/{scene_id}`
- `PATCH /events/{event_id}/scenes/{scene_id}`
- `DELETE /events/{event_id}/scenes/{scene_id}`

### Persistência atual

Em memória (perde dados ao reiniciar o processo/container).

---

## Cloud Web

Funciona em produção.

### Rotas

- `/`
- `/events`
- `/events/[eventId]`

---

## Funcionalidades reais já operando

### Eventos

- criar evento
- listar eventos

### Scenes

- listar scenes por evento
- criar scene (ordem única por evento)
- reordenar (drag + API)
- editar e excluir no painel lateral
- campos reservados `media_id` / `draw_config_id` (API; UI só leitura)

---

## Scenes atualmente suportam

Tipos alinhados ao contrato (inglês no payload):

- `opening`
- `institutional`
- `sponsor`
- `draw`
- `break`
- `closing`

---

## Deploy

Produção via GitHub Actions está operacional.

Último fluxo validado:

`build → GHCR → VPS → docker compose`

---

## Cloudflare

DNS e tunnel operando corretamente.

---

## Limitação atual

Dados reiniciam ao reiniciar o container.

Ainda não existe persistência real.

---

## Próximo gargalo natural

Persistência mínima real **ou** export de pack.

---

## Produto já saiu de skeleton

Agora existe operação mínima real.
