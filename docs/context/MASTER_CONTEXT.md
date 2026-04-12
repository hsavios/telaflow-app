# MASTER_CONTEXT.md — TelaFlow

## 1. Identidade oficial do produto

TelaFlow é uma plataforma visual inteligente para eventos ao vivo.

TelaFlow não é apenas software de sorteio.

TelaFlow é um produto premium de direção visual e operação de palco, concebido para organizar, validar e executar experiências visuais ao vivo com confiabilidade operacional.

O produto nasce com posicionamento premium:

* confiável
* elegante
* operacional
* tecnicamente disciplinado
* visualmente sóbrio
* sem estética genérica de dashboard
* sem aparência de software improvisado

TelaFlow deve ser percebido como ferramenta séria de operação ao vivo.

---

## 2. Arquitetura conceitual oficial

TelaFlow é composto por três blocos centrais:

### TelaFlow Cloud

SaaS principal em app.telaflow.ia.br

Responsável por:

* autoria
* governança
* configuração
* organização de eventos
* branding
* cenas
* sorteios
* requisitos de mídia
* exportação
* licenciamento

### TelaFlow Pack

Contrato operacional exportado pelo Cloud

Contém:

* configuração do evento
* manifesto de mídia
* branding
* licença
* versionamento

### TelaFlow Player

Aplicativo local para execução offline

Responsável por:

* abrir Pack
* validar licença
* localizar mídia local
* executar Pre-flight
* operar offline
* registrar logs

Princípio normativo:
Cloud → Pack → Player

Essa cadeia não deve ser quebrada.

Cloud e Player não devem se acoplar diretamente.

---

## 3. Stack oficial definida

### Cloud

Frontend:

* Next.js (App Router)

Backend:

* FastAPI

Banco:

* PostgreSQL

### Player

Desktop runtime:

* Tauri 2

Frontend local:

* React + Vite

Persistência local inicial:

* JSON
* manifestos
* logs

SQLite local:

* apenas se realmente necessário em fase posterior

---

## 4. Estratégia oficial de mídia

No MVP:

Cloud não armazena mídia do usuário.

Cloud armazena:

* metadados
* manifesto de mídia
* requisitos
* nomes lógicos
* obrigatoriedade

Player realiza:

* binding local
* validação local
* leitura local

Princípios obrigatórios:

* não usar caminho absoluto como verdade única
* usar binding relativo
* usar workspace controlada
* validar presença antes de executar

---

## 5. Unidade central de modelagem

### Event é unidade central do produto

Tudo deriva do evento:

* branding
* scenes
* sorteios
* requisitos de mídia
* exportação
* licença

### Scene é unidade mínima executável e de autoria

Cada Scene representa estado executável visível.

Scene pode conter:

* mídia principal
* sponsor slots previstos
* trigger de sorteio opcional
* observações internas

Scene não é canvas livre.

Scene não é recipiente arbitrário.

---

## 6. Tipos oficiais de Scene no MVP

Tipos iniciais controlados (chaves em inglês no contrato JSON; UI pode localizar):

* opening
* institutional
* sponsor
* draw
* break
* closing

Princípio:
tipos controlados primeiro, liberdade depois.

---

## 7. Editor oficial do produto

Event Editor é o núcleo do Cloud.

O editor deve ser:

* workspace de produção
* lista de Scenes
* painel principal
* inspector lateral quando necessário

Não deve virar:

* canvas livre
* timeline audiovisual complexa
* formulário gigante
* mini PowerPoint

Preview do editor:
interpretativo, nunca render final.

---

## 8. Pre-flight como diferencial central

Pre-flight é núcleo de valor operacional do Player.

Ele valida:

* integridade do Pack
* licença
* mídia obrigatória
* consistência mínima
* ambiente local

Pre-flight não é checklist trivial.

Pre-flight é cerimônia de qualidade operacional.

Sem Pre-flight válido:
Player não entra em Ready.

---

## 9. Máquina de estados do Player

Estados oficiais:

* idle
* pack_loaded
* binding_pending
* preflight_failed
* ready
* executing
* paused
* finished
* blocked

Toda feature do Player deve respeitar essa máquina.

---

## 10. Linguagem visual oficial

TelaFlow deve parecer:

* software premium real
* ferramenta séria
* produto maduro

Nunca:

* dashboard genérico
* excesso de glow
* excesso de gradiente
* cards em excesso
* estética de IA

Princípios:

* silêncio visual
* hierarquia forte
* densidade controlada
* tipografia com autoridade
* contraste intencional

---

## 11. Cloud e Player têm papéis visuais distintos

### Cloud

Sensação:
produto premium de autoria

### Player

Sensação:
mesa de operação confiável de palco

Cloud não deve parecer teatral demais.

Player não deve parecer corporativo demais.

---

## 12. Anti-padrões proibidos

Nunca:

* acoplar Player diretamente ao Cloud
* armazenar mídia cloud cedo demais
* deixar Scene virar recipiente arbitrário
* deixar editor virar canvas livre
* transformar tudo em CRUD genérico
* colocar inteligência excessiva no frontend
* gerar Pack sem versionamento
* ignorar logs
* ignorar trilhas de auditoria quando a spec as exige
* ignorar validações

---

## 13. Documentação normativa e planejamento

Toda referência abaixo vive em [`docs/specs/`](../specs/) salvo indicação em contrário.

### 13.1 Especificações fundamentais

* [PRODUCT_SPEC.md](../specs/PRODUCT_SPEC.md) — produto, escopo MVP, visão Cloud → Pack → Player
* [ARCHITECTURE_SPEC.md](../specs/ARCHITECTURE_SPEC.md) — fronteiras, stack, persistência, anti-padrões arquiteturais
* [UI_SPEC.md](../specs/UI_SPEC.md) — linguagem visual, papéis Cloud vs Player, estados de interface

### 13.2 Especificações de feature

* [EVENT_EDITOR_FEATURE_SPEC.md](../specs/EVENT_EDITOR_FEATURE_SPEC.md) — editor, Event/Scene, requisitos de mídia
* [PRE_FLIGHT_FEATURE_SPEC.md](../specs/PRE_FLIGHT_FEATURE_SPEC.md) — pre-flight, grupos de checks, severidades
* [PACK_EXPORT_FEATURE_SPEC.md](../specs/PACK_EXPORT_FEATURE_SPEC.md) — export, Pack, integridade, auditoria de export
* [PLAYER_RUNTIME_FEATURE_SPEC.md](../specs/PLAYER_RUNTIME_FEATURE_SPEC.md) — FSM, runtime, cenas, controles
* [LICENSING_FEATURE_SPEC.md](../specs/LICENSING_FEATURE_SPEC.md) — licença, validação, emissão e falhas auditáveis
* [AUDIT_LOGGING_SPEC.md](../specs/AUDIT_LOGGING_SPEC.md) — logging Cloud e Player, correlação, severidades, suporte

### 13.3 Plano de implementação do MVP

* [MVP_IMPLEMENTATION_PLAN.md](../specs/MVP_IMPLEMENTATION_PLAN.md) — **ordem oficial de fases**, **primeira vertical ponta a ponta** obrigatória, **congelamento** ao fechar cada fase, política mínima de **dívida técnica**, dependências entre módulos, critérios de pronto, limites do MVP e disciplina de execução. **Não** substitui as specs: **materializa** o que já está decidido numa sequência implementável.

### 13.4 Avaliação de novas funcionalidades

* [FEATURE_EVALUATION_FRAMEWORK.md](../specs/FEATURE_EVALUATION_FRAMEWORK.md) — filtros obrigatórios **antes** de qualquer nova spec formal; alinhado a produto, palco, offline-first e Cloud → Pack → Player.

### 13.5 Modelo de deployment

* [DEPLOYMENT_MODEL_SPEC.md](../specs/DEPLOYMENT_MODEL_SPEC.md) — Cloud (VPS inicial, domínio, topologia), artefato de release do Player (instalador vs zip oficial), naming `telaflow-player-*`, rollback local, backups BD + retenção de artefatos Pack, renovação TLS monitorada, compatibilidade `pack_version` ↔ Player, ambientes, segurança operacional mínima e logs em produção.

### 13.6 Execução da Fase 1 do MVP

* [PHASE_1_EXECUTION_SPEC.md](../specs/PHASE_1_EXECUTION_SPEC.md) — contratos centrais: monorepo mínimo, `shared-contracts` (**Zod** primário, JSON Schema gerado, semver do pacote), naming `event_id`/`scene_id`, export **ZIP** desde o primeiro dia, migrations desde a primeira tabela, persistência PostgreSQL, endpoints mínimos, primeira vertical Cloud → Pack, stub Player; o que **não** entra na Fase 1.

**Hierarquia se houver ambiguidade:** prevalece [PRODUCT_SPEC.md](../specs/PRODUCT_SPEC.md); depois [ARCHITECTURE_SPEC.md](../specs/ARCHITECTURE_SPEC.md); depois [UI_SPEC.md](../specs/UI_SPEC.md); depois as demais specs de feature na ordem indicada no cabeçalho de cada documento (alinhado ao MVP_IMPLEMENTATION_PLAN e às próprias specs).

---

## 14. Regra de governança do projeto

Toda nova feature deve nascer de spec.

Ordem obrigatória:

1. avaliação pelo [FEATURE_EVALUATION_FRAMEWORK.md](../specs/FEATURE_EVALUATION_FRAMEWORK.md) quando for **nova** funcionalidade (não correção de spec existente)
2. spec (e revisão cruzada com documentos normativos já existentes)
3. revisão
4. implementação conforme [MVP_IMPLEMENTATION_PLAN.md](../specs/MVP_IMPLEMENTATION_PLAN.md) — **fase** e **dependências**, sem saltar contratos centrais

Specs e plano de MVP prevalecem sobre geração livre por IA.

Toda mudança estrutural relevante exige revisão arquitetural (e ADR quando aplicável).

---

## 15. Papel da IA no projeto

IA não decide arquitetura livremente.

IA atua como:

* executor disciplinado
* refinador técnico
* gerador sob contrato

Restrições explícitas:

* não implementar fora da **spec da fase** e da ordem do [MVP_IMPLEMENTATION_PLAN.md](../specs/MVP_IMPLEMENTATION_PLAN.md)
* não contornar Cloud → Pack → Player

Nunca como autor soberano do produto.

---

## 16. Critério normativo final

TelaFlow deve evoluir mantendo:

* confiabilidade
* simplicidade operacional
* clareza
* robustez comercial
* arquitetura disciplinada
* linguagem visual consistente

Toda nova decisão deve ser avaliada contra este documento, contra as [especificações em §13](#13-documentação-normativa-e-planejamento), contra o [FEATURE_EVALUATION_FRAMEWORK.md](../specs/FEATURE_EVALUATION_FRAMEWORK.md) quando for **nova funcionalidade**, contra o [MVP_IMPLEMENTATION_PLAN.md](../specs/MVP_IMPLEMENTATION_PLAN.md) quando a decisão afetar entrega ou ordem de implementação, e contra o [DEPLOYMENT_MODEL_SPEC.md](../specs/DEPLOYMENT_MODEL_SPEC.md) quando afetar **infraestrutura**, **distribuição do Player** ou **política de ambientes**.
