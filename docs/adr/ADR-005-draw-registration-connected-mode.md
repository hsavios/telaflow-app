# ADR-005 — Modo conectado para inscrições em sorteio (opcional)

**Estado:** proposto (opcional)  
**Data:** 2026-04-12  
**Contexto:** O fluxo predefinido v1 congela participantes no **Pack** no momento do export (offline-first). Operadores podem desejar inscrições **durante** o evento com sincronização em tempo real.

## Decisão

1. **v1 (padrão):** Inscrições via URL pública na Cloud até fecho; lista exportada em `draw-attendees.json` no pack; Player **sem** chamadas de rede obrigatórias.
2. **v2 (opcional, este ADR):** Player em modo conectado autenticado (token de sessão de evento) faz **poll** ou **SSE** à Cloud API para anexar novos `draw_registrations` ao pool em memória — **exige** rede estável e aceitação de risco operacional documentada.

## Consequências

- Requer feature flag no Player, UI explícita “Modo online (beta)” e timeouts claros.
- Auditoria na Cloud: toda alteração ao pool durante show deve ser logada.
- **Não** implementar no v1 sem revisão de produto e testes de palco.

## Alternativas

- **Reexport manual** — operador gera novo pack entre momentos do show (simples, alinhado ao offline).
