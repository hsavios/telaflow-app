# TelaFlow — Decisions Log

Registro curto de decisões de produto e de infra, com motivo, para leitura rápida no futuro.

---

## 2026-04

### Decisão

Cloud API permanece em memória nesta fase.

### Motivo

Acelerar validação do fluxo funcional antes de persistência definitiva.

---

### Decisão

Cloudflare usa tunnel já existente `heliosavio-vps-prod`.

### Motivo

Evitar multiplicação desnecessária de tunnels.

---

### Decisão

Deploy oficial via GitHub Actions + GHCR + VPS.

### Motivo

Fluxo reproduzível e controlado.

---

### Decisão

Scenes entram antes de Pack.

### Motivo

Evento sem scenes ainda não gera valor operacional.

---

### Decisão

`NEXT_PUBLIC_CLOUD_API_URL` é **build-time** (valor congelado na imagem do `cloud-web` no build).

### Motivo

Next.js incorpora variáveis `NEXT_PUBLIC_*` no bundle/imagem no momento do build.
