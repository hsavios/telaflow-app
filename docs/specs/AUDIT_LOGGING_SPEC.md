# TelaFlow — Especificação Funcional de Auditoria e Logging (AUDIT_LOGGING_SPEC)

**Versão:** 1.0.1  
**Status:** Documento normativo — referência para logs na Cloud, logs locais no Player, auditoria, correlação de eventos, cadeia causal opcional, severidades, retenção conceitual e relação com UI e suporte  
**Última revisão:** 2026-04-10  

**Hierarquia normativa:** Este documento é derivado e subordinado a, **nesta ordem**: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md), [UI_SPEC.md](./UI_SPEC.md), [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md), [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md), [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md), [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md), [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md). Em caso de ambiguidade ou conflito aparente, prevalece o documento mais acima na lista; a estratégia de auditoria e logging deve ser ajustada (via revisão deste arquivo e ADR quando couber) para restabelecer alinhamento.

**Escopo:** comportamento funcional e contrato do que é registado, onde, com que severidade e para que fins — sem código, sem formato de arquivo byte-a-byte, sem políticas de retenção numérica obrigatórias (estas ficam em produto, compliance ou spec derivada). Pipelines tipo SIEM/ELK ficam fora desta spec salvo menção em evolução.

---

## Prefácio

O TelaFlow opera em dois domínios com responsabilidades distintas: **Cloud** (autoria, export, governança) e **Player local** (carga de Pack, binding, pre-flight, execução) — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3. A exportação gera trilha auditável ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §20); o Pre-flight produz narrativa operacional verificável ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md)); o runtime move uma FSM cujas transições devem ser registadas ([PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) §4, §18); emissão e falhas de licença exigem rastreabilidade ([LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md) §16). O [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §7 trata observabilidade como parte do produto. Este documento unifica o quê e o porquê do logging sem transformá-lo em descarga técnica nem em segunda fonte de verdade operacional face ao Pack.

---

# 1. Papel do logging no produto

## 1.1 Por que logging é parte do produto

Logs e trilhas de auditoria não são “instrumentação para engenharia quando sobra tempo”: são superfície de confiabilidade — para suporte, pós-mortem de palco, governança comercial e prova de que exportações e execuções ocorreram de forma rastreável. A [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.9 e §17 tratam a ausência de logging planejado como débito arquitetural, não detalhe cosmético.

## 1.2 Por que não é só debug técnico

Debug serve a equipa interna em desenvolvimento. O logging normativo TelaFlow serve também narrativa reconstruível por terceiros autorizados (suporte, compliance, disputas operacionais): precisa de códigos estáveis, correlação com `export_id` e estados nomeados — não apenas stack traces ou prints ad hoc.

---

# 2. O que logging precisa resolver

| Necessidade | Função |
|-------------|--------|
| **Reconstruir narrativa operacional** | Responder em ordem: carregou Pack → passou pre-flight? → entrou em execução? → que Scenes? → encerrou ou bloqueou? |
| **Suportar troubleshooting** | Reduzir tempo até causa provável com correlação (§10) e códigos de evento. |
| **Sustentar auditoria comercial** | Quem exportou o quê e quando na Cloud; ligação a `export_id` / `license_id`. |
| **Rastrear export e execução** | Ligação explícita entre linha de auditoria Cloud e logs locais do Player via ids compartilhados. |

---

# 3. O que logging NÃO deve virar

| Anti-alvo | Por quê |
|-----------|---------|
| **Ruído inútil** | Volume alto sem decisão de severidade esconde falhas reais e encarece armazenamento. |
| **Dados sensíveis desnecessários** | PII, tokens, conteúdo de participantes de sorteio além do mínimo — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §15.3 e política interna/LGPD. |
| **Dumping técnico bruto** | Substituir eventos semânticos por blobs ou logs não estruturados frustra suporte e auditoria. |
| **Fonte paralela de verdade** | Logs não redefinem roteiro, licença ou estado do Pack; refletem o que ocorreu — a verdade contratual permanece no Pack e na FSM real. |

---

# 4. Dois domínios oficiais de logging

| Domínio | Onde vive | Finalidade principal |
|---------|-----------|----------------------|
| **Cloud audit** | Infraestrutura da TelaFlow Cloud (servidor, base de auditoria) | Governança, exportações, emissões de licença, ações administrativas relevantes. |
| **Player local log** | Máquina do operador (arquivos locais — MVP: JSON / JSONL conforme [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §15.2) | Diagnóstico de palco, pre-flight, runtime, falhas sem depender de rede. |

**Regra:** não fundir mentalmente os dois num único “log global” sem correlação explícita (§10). Sincronização opcional para nuvem é evolução (§20).

---

# 5. Logging oficial da Cloud

Eventos mínimos normativos (a lista pode crescer por ADR; não encolher sem revisão de produto):

| Evento | Conteúdo mínimo conceitual |
|--------|------------------------------|
| **Login relevante** | Sucesso e falha de autenticação (com moderação de PII — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §17.1). |
| **Export bem-sucedido** | `export_id`, `event_id`, `organization_id`, usuário, timestamp, referência a `pack_version`. |
| **Emissão / selagem de licença** | `license_id`, `export_id`, vínculo a evento/org ([LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md) §16). |
| **Falha de export** | Motivo estável (código), evento afetado, usuário, timestamp. |
| **Mudança estrutural relevante** | Ex.: role alterada, membro adicionado — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §17.1 / módulo audit_logs. |

---

# 6. Logging oficial do Player

Eventos mínimos (cada um com severidade adequada — §11):

| Evento | Momento |
|--------|---------|
| **pack_load** | Início/fim ou sucesso/falha do carregamento (incl. `pack_version`, `export_id` se legível). |
| **binding_update** | Alteração persistida do mapa `media_id` → path (sem gravar binários). |
| **preflight_run** | Ver §7 (run completo). |
| **ready** | Transição para `ready` após pre-flight sem bloqueantes. |
| **execution_start** | Entrada em `executing`. |
| **scene_transition** | Conclusão e ativação (alinhado a [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) §9.4). |
| **draw_action** | Disparo de sorteio (detalhe limitado por privacidade). |
| **execution_finish** | Término ordenado / `finished`. |
| **blocked** | Entrada em `blocked` (licença, integridade, fatal). |
| **fsm_transition** | Mudanças relevantes da FSM ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §14.0), no mínimo o que §17.2 da mesma spec exige. |

---

# 7. Logging do Pre-flight

## 7.1 Identificador de run

Cada execução completa (ou ciclo definido em [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §17) deve ter **`run_id`**: identificador único (opaco ou ULID) gerado no Player no início do run — correlaciona `PreflightResult`, linhas de log e pedidos de suporte.

## 7.2 Resumo por grupo

Para cada grupo G1…G5 ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §6): registar conclusão e duração ou timestamps conforme §13.5 daquela spec; contagens por severidade no grupo ou agregado exportável.

## 7.3 Severidades no registro

Eco da taxonomia do pre-flight: itens bloqueantes, avisos e OK com `check_id` e `code` nos bloqueantes (amostra ou completo conforme [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §19.1).

## 7.4 Resultado final

Um registro sintético por run: destino FSM `ready` / `preflight_failed` / `blocked`, contagens globais, `export_id`, `pack_version`, timestamp global de fim de run.

---

# 8. Logging do Runtime

| Tipo | O que registar |
|------|----------------|
| **Scene activation** | `scene_id`, índice no roteiro, timestamp, origem (manual ou política). |
| **Scene completion** | Idem mais causa ([PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) §9.4). |
| **Operator actions** | Avançar, pausar, encerrar, disparar sorteio — sem dados desnecessários do operador. |
| **Falhas em execução** | Código estável, `media_id` se aplicável, sem conteúdo de arquivo ([PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) §17). |

---

# 9. Logging do Licensing

| Momento | Conteúdo |
|---------|----------|
| **Validação bem-sucedida** | Confirmação de vigência e correspondência de ids (sem repetir claims inteiros se redundante). |
| **Falha** | Código canônico `LICENSE_*` ou equivalente, razão (assinatura, expiração, mismatch, ausente) — [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md) §13. |
| **Expiração detetada** | Instante e contexto `ready` vs `executing` (incl. grace §8.4 da spec de licenciamento — sessão a concluir). |

---

# 10. Correlação entre eventos

Chaves oficiais (usar o subconjunto aplicável a cada linha):

| Chave | Uso |
|-------|-----|
| **`export_id`** | Ancoragem principal Cloud ↔ Player ↔ suporte. |
| **`event_id`** | Contexto de negócio. |
| **`organization_id`** | Tenant / isolamento. |
| **`license_id`** | Emissão e falhas de licença. |
| **`run_id`** | Runs de pre-flight (§7.1). |
| **`request_id` (Cloud)** | Correlação HTTP — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §17.1. |

**Regra:** eventos filhos devem herdar correlação do evento pai quando forem continuação causal (ex.: pre-flight após o mesmo Pack carregado).

## 10.1 Cadeia causal mínima (opcional)

Correlação por ids (§10) não substitui, por si só, a pergunta “**porque** este evento ocorreu agora?”. Para troubleshooting, as implementações **podem** incluir, quando fizer sentido semântico, um campo opcional **`caused_by_event_code`**: referência ao `event_code` do predecessor **causal** imediato na mesma sessão (não obrigatório em todas as linhas).

**Exemplo:** uma linha com `event_code` `FSM_TRANSITION` pode declarar `caused_by_event_code: PF_RUN_COMPLETE` quando a transição da FSM for consequência direta do fecho do run de pre-flight.

**Regras:**

- Opcionalidade: omitir quando a causalidade for óbvia pelo fluxo ou quando não houver predecessor único identificável sem ambiguidade.  
- Não confundir com correlação: `caused_by_event_code` descreve **causa imediata nomeada**, não substitui `export_id`, `run_id`, etc.  
- Não exige grafo completo: basta o elo mínimo útil para reconstruir a narrativa (§2).

---

# 11. Severidades oficiais

| Nível | Uso |
|-------|-----|
| **info** | Fluxo esperado (transição FSM, run concluído com sucesso, export registado). |
| **warning** | Anomalia não impeditiva imediata (avisos de pre-flight, relógio suspeito se política assim classificar). |
| **error** | Falha recuperável ou degradação que exige ação (pre-flight com bloqueantes recuperáveis, erro de mídia com retry). |
| **critical** | Fatal `blocked`, integridade quebrada, impossibilidade de continuar sem novo Pack ou intervenção forte. |

**Nota:** alinhar linguagem à UI (bloqueante / aviso) sem confundir severidade de log com severidade de check do pre-flight — mapeamento em spec de implementação.

## 11.1 Controle de ruído em `critical`

`critical` não deve gerar **avalanche repetitiva** (centenas ou milhares de linhas idênticas ou equivalentes): isso anula o suporte e mascara o sinal.

**Política:** quando a mesma condição fatal se repetir em loop (ex.: falha invariante num frame ou num ciclo), a implementação deve **agregar** ou **amostrar**: uma linha `critical` inicial com contexto completo, seguida de resumos periódicos ou contagem consolidada até intervenção ou terminação — de modo que o operador e o suporte vejam **uma falha fatal clara**, não um despejo de repetições.

Detalhes de janela de agregação e formato ficam em spec técnica; o requisito funcional é: **eventos `critical` repetidos devem ser agregáveis** para leitura humana e triagem.

---

# 12. O que NÃO logar

1. Mídia binária ou trechos de arquivos do cliente.  
2. Segredos: tokens de sessão, passwords, chaves privadas.  
3. Paths absolutos excessivos ou inventário completo de disco — preferir `media_id` e path relativo à workspace quando necessário.  
4. Dados pessoais além do mínimo (participantes de sorteio, etc.).  
5. Conteúdo integral de `PreflightResult` em cada linha — resumo mais referência a snapshot persistido.

---

# 13. Estrutura conceitual mínima de um registro

## 13.1 Campos mínimos

| Campo | Descrição |
|-------|-----------|
| **timestamp** | Instante do evento (UTC recomendado na Cloud; no Player, relógio do sistema — ver §13.2). |
| **severity** | info / warning / error / critical (§11). |
| **source** | `cloud` ou `player` + componente lógico (ex.: `preflight_engine`, `export_service`). |
| **event_code** | Código estável — ver §13.3. |
| **message** | Texto humano curto para suporte. |
| **correlation_ids** | Subconjunto de §10 aplicável. |
| **caused_by_event_code** | Opcional — predecessor causal imediato (§10.1). |

## 13.2 Monotonicidade de tempo e ordem no Player

No Player, o **timestamp** reflete o relógio local do sistema (NTP desalinhado, ajuste manual ou VM podem fazer o relógio **retroceder** entre linhas).

**Política:** aceita-se o clock do sistema como etiqueta temporal; a **ordem lógica** dos acontecimentos não pode depender só de `timestamp` para ordenação quando houver suspeita de skew. A ordem **causal** deve ser preservada por:

- **sequência de append** no destino persistido (primeira linha escrita = primeiro evento registado nesse fluxo), e/ou  
- um **contador monotónico** por fluxo de log (ex.: `sequence` estritamente crescente por arquivo ou sessão), definido em implementação.

Consumidores de log devem poder reconstruir a narrativa por **causa e sequência**, não apenas por ordenação lexicográfica de `timestamp`.

## 13.3 Imutabilidade de `event_code`

`event_code` é **contrato estável** entre produto, suporte, documentação e eventual automação (alertas, dashboards). **Não** se renomeia por refactor estético: alteração de código existente implica período de deprecação, mapeamento documentado ou ADR, para não invalidar playbooks e comparações entre versões do Player.

Novos comportamentos **preferem** novos códigos a sobrecarregar semântica de códigos antigos.

---

# 14. Logs locais do Player

- **Append-only conceitual:** novas linhas acrescentadas sem reescrever histórico de execução passada (rotação ou truncagem por política — spec derivada).  
- **Persistência mínima** conforme [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §15.2 (nomes de arquivo em spec técnica).  
- Buffer em memória com flush para não perder eventos críticos em crash — detalhe de implementação.

## 14.1 Exportação mínima para suporte (sob demanda)

Para pedidos de suporte ([§16](#16-relação-com-suporte)), o Player deve permitir **exportar um extrato** dos logs locais **sob demanda** (ação explícita do operador ou fluxo “copiar diagnóstico” — [§17](#17-relação-com-ui)), contendo no mínimo os **últimos N eventos** relevantes do buffer persistido (ou janela equivalente por tamanho), **sem fixar N nesta spec**.

**Política:** N (ou o critério de janela) é definido em produto ou spec técnica — suficiente para reproduzir a narrativa recente (§2) sem exportar histórico ilimitado nem violar §12.

---

# 15. Auditoria na Cloud

Obrigatório (mínimo comercial — [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §7):

- Exportações com `export_id` e atores.  
- Emissões de licença ligadas a `export_id`.  
- Eventos de segurança e admin relevantes ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §17.1).

**Rastreabilidade mínima:** qualquer auditor autorizado deve poder responder “quem, o quê, quando” para as ações acima sem acesso aos logs locais do Player.

---

# 16. Relação com suporte

Um pedido de suporte deve poder ser atendido com: `export_id` + versão do Player + trecho de log local (ou último `PreflightResult` exportável) — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §17.3.

**Objetivo:** reproduzir a narrativa (§2) sem exigir reprodutor de vídeo do palco.

**Alinhamento:** o extrato exportável (§14.1) é o artefacto mínimo esperado para colar em ticket ou enviar por canal acordado; combina com `export_id` e versão do Player.

---

# 17. Relação com UI

- A UI não é terminal de log bruto em `executing` ([UI_SPEC.md](./UI_SPEC.md) §17.4).  
- Mensagens ao operador são derivadas de estado e códigos — microcopy das specs de Pre-flight, licenciamento e runtime.  
- Telas de suporte ou “copiar diagnóstico” podem expor JSON resumido — com confirmação e sem dados proibidos (§12); o conteúdo deve respeitar a política de extrato (§14.1).

---

# 18. Retenção conceitual

- **Proporcional** ao valor e ao risco: logs de execução longos exigem política de rotação — não crescimento indefinido sem limite documentado.  
- Cloud e Player podem diferir: auditoria comercial pode reter mais que arquivo local — desde que compliance e custo estejam alinhados.  
- Números exatos (dias, GB) ficam fora desta spec até definição de produto ou ADR.

---

# 19. Anti-padrões do logging

1. Logar só no console sem persistência no Player para eventos críticos.  
2. Duplicar estado canônico no log como fonte de verdade (§3).  
3. Um único nível de severidade para tudo.  
4. IDs opacos sem correlação (§10).  
5. Exportar logs com PII sem consentimento ou política.  
6. Silenciar transição para `blocked` ou `finished`.  
7. Misturar logs de Cloud e Player num único stream sem marcador `source`.  
8. Omitir `run_id` em runs de pre-flight quando o suporte precisa correlacionar com `PreflightResult`.  
9. Avalanche de linhas `critical` repetidas sem agregação (§11.1).  
10. Renomear `event_code` sem processo de compatibilidade (§13.3).  
11. Ordenar exclusivamente por `timestamp` no Player ignorando skew de relógio quando a narrativa exige ordem causal (§13.2).

---

# 20. Evolução futura segura

- Telemetria opt-in (volume, erros agregados) — não substituir logs locais obrigatórios.  
- Exportação assistida de pacote de diagnóstico para suporte (alinhada a §14.1: últimos N eventos ou janela por tamanho, mais `export_id` e metadados acordados).  
- Sync opcional de eventos do Player para Cloud — só com ADR, privacidade e opcionalidade relativa ao núcleo offline.

---

# 21. Critério normativo final

Logging e auditoria são parte da **confiabilidade premium** do TelaFlow: sem eles, o produto promete governança e operação de palco sem meios de provar ou diagnosticar o que ocorreu. Toda implementação deve obedecer a esta spec e às fontes normativas acima na hierarquia.

---

*Documento interno de feature — TelaFlow. AUDIT_LOGGING_SPEC v1.0.1. Derivado do [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) v1.1, [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) v1.1, [UI_SPEC.md](./UI_SPEC.md) v1.0, [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) v1.1, [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) v1.1, [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) v1.0.2, [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) v1.0.1 e [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md) v1.0.1.*
