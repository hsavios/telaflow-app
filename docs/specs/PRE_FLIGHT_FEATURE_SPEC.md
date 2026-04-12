# TelaFlow — Especificação Funcional do Pre-flight (PRE_FLIGHT_FEATURE_SPEC)

**Versão:** 1.1  
**Status:** Documento normativo — referência para **engine de checks**, **UX**, **severidades**, **transições de estado**, **logs** e **revalidação** do **Pre-flight** no **TelaFlow Player**  
**Última revisão:** 2026-04-10  
**Hierarquia normativa:** Este documento é **derivado e subordinado** a, **nesta ordem**: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md), [UI_SPEC.md](./UI_SPEC.md), [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md). Em caso de ambiguidade ou conflito, **prevalece** o documento mais acima na lista; o Pre-flight **deve** ser ajustado (via revisão deste arquivo e ADR quando couber) para restabelecer alinhamento.  

**Escopo:** comportamento funcional do **Pre-flight no Player** — **sem código**, **sem DDL**. O módulo Cloud **valida** o evento antes do export ([EVENT_EDITOR_FEATURE_SPEC](./EVENT_EDITOR_FEATURE_SPEC.md)); o Pre-flight **não** substitui essa linha — **completa** no **local** com **binding**, **ambiente** e **integridade** do artefato entregue.

---

## Prefácio

O fluxo normativo do produto é **Cloud → Pack → Player → binding local → Pre-flight → `ready` → `executing`** (PRODUCT_SPEC; ARCHITECTURE_SPEC §11–12, §14.0). O Pre-flight é o **gate** que transforma arquivos numa pasta e um Pack em disco em **decisão operacional explícita**: **pode** ou **não pode** ir ao ar com **risco conhecido**. Esta spec **não** redefine o Pack nem o editor — fixa **o que** o Player **deve** verificar, **como** classificar resultados e **como** isso **move** a máquina de estados.

---

# 1. Papel do Pre-flight no produto

## 1.1 Por que é central

O PRODUCT_SPEC promete **confiabilidade operacional** e **pre-flight explícito** no MVP; a ARCHITECTURE_SPEC trata o Pre-flight como **componente arquitetural**, não como tela opcional. Sem Pre-flight disciplinado, o Player **cai** no improviso de palco que o produto **existência** para eliminar: telão a falhar **sem** diagnóstico compartilhado entre operador e suporte.

## 1.2 Por que é mais que checklist

Checklist **papel** não tem **severidade** estável, **histórico** auditável nem **ligação** à máquina de estados. O Pre-flight **orquestra** verificações **determinísticas**, com **códigos** de resultado, **persistência** de `PreflightResult` (ARCHITECTURE_SPEC §7) e **efeito** direto em **`ready`** / **`preflight_failed`** / **`blocked`**. É **instrumento de governo** do runtime, não lista estática.

## 1.3 Valor comercial

- **Comprador:** prova de **disciplina** (“o produto **obriga** validação antes do ar”) e **rastreabilidade** (logs, último pre-flight).  
- **Operador:** **menos** incidente no primeiro minuto do show; linguagem **alinhada** ao editor (`media_id`, Scene, export).  
- **Suporte:** **mesmo vocabulário** que a Cloud (bloqueante, aviso, `export_id`) — reduz tempo de resolução.

---

# 2. O que o Pre-flight precisa resolver

| Problema | Função do Pre-flight |
|----------|----------------------|
| **Integridade do Pack** | Garantir que o artefato **não** está corrompido, adulterado ou incompatível antes de confiar no roteiro. |
| **Licença** | Garantir que a execução **está** coberta no **contexto** local (tempo, escopo, assinatura). |
| **Mídia obrigatória** | Garantir que o **manifesto** foi **cumprido** na workspace — arquivos **presentes** e **coerentes** com o esperado. |
| **Coerência do binding** | Garantir que caminhos **relativos** resolvem, **sem** drift silencioso face ao último guardado. |
| **Consistência mínima de execução** | Garantir que Scenes, `draw_config_id`, `media_id` no Pack **fecham** um grafo **executável** (sem referências quebradas **dentro** do contrato do Pack). |
| **Risco conhecido no palco** | **Impedir** `executing` quando o sistema **sabe** que condição **bloqueante** persiste — preferir **falha explícita** a silêncio no telão (PRODUCT_SPEC §11). |

---

# 3. O que o Pre-flight NÃO deve virar

| Anti-alvo | Por quê |
|-----------|---------|
| **Log técnico bruto** | Operador não é engenharia; mensagens **devem** ser **acionáveis** e agrupadas (UI_SPEC §16). |
| **Wizard burocrático** | Passos **artificiais** que atrasam sem acrescentar verificação **real** destroem confiança. |
| **Tela de alarme** | Excesso de vermelho, ícones de pânico e copy catastrófica **quebram** postura premium. |
| **Etapa ignorável** | Botão “Saltar” que leva a `executing` **sem** zero bloqueantes **viola** ARCHITECTURE_SPEC §11.4. |
| **Substituto do editor** | Pre-flight **não** corrige evento na Cloud — **indica** o que falta **localmente** ou que o Pack **é** inválido. |
| **Validação de conteúdo criativo** | Não julgar “qualidade” artística do vídeo — só **presença**, **forma** e **leitura** mínima acordada. |

---

# 4. Momento correto do Pre-flight no fluxo

## 4.1 Quando acontece

- **Primeira vez obrigatória** após: Pack **carregado e parseável**, **licença** avaliável no fluxo (pode ser revalidada **dentro** do mesmo run), e **binding** **suficiente** para correr checks de mídia (ou seja, após sair de **`binding_pending`** quando todos os **obrigatórios** estão vinculados — ou quando o operador **força** “Executar checagens” com gaps **ainda** presentes, o engine **deve** reportar bloqueantes, não falhar em silêncio).  
- **Reexecução:** sempre que **invalidação** ocorrer (seção 17) ou o operador **solicitar** “Executar checagens novamente”.

## 4.2 Em que estado da FSM (Player)

- **Tipicamente** a transição para correr o engine ocorre a partir de **`pack_loaded`** (binding completo) ou **reentrada** desde **`preflight_failed`** / **`ready`** (revalidação).  
- **`binding_pending`:** **pode** permitir **execução parcial** dos grupos que **não** dependem de mídia completa **ou** **deve** apresentar resultado com bloqueantes de mídia — política MVP: **permitir** run **sempre**; grupo **mídia** produz bloqueantes até binding satisfeito.

## 4.3 Em que estado **não** deve correr como “passagem para `ready`”

- **`idle`** sem Pack em sessão.  
- **`blocked`** **fatal** — não há ciclo de pre-flight que **substitua** novo Pack ou correção de ambiente **fora** do escopo (ex.: assinatura inválida: permanece **`blocked`** até novo Pack ou ação documentada).  
- **`executing`:** **não** reexecutar o **fluxo completo** de gate de **entrada** em `executing` **em paralelo** ao show; falhas **em** execução seguem fluxo da **execução** (UI_SPEC §17.6), eventual **revalidação** **após** pausa/encerramento por política futura.

## 4.4 Quando reexecutar

Ver seção **17** — resumo: mudança de binding, substituição de arquivo, novo Pack, alteração de workspace, ou **pedido** explícito do operador.

---

# 5. Relação com a máquina de estados do Player

Estados **oficiais** (ARCHITECTURE_SPEC §14.0). O Pre-flight **não** redefine nomes.

## 5.1 Transições que o Pre-flight **provoca** ou **habilita**

| De (resumo) | Evento de pre-flight | Para |
|-------------|----------------------|------|
| `pack_loaded` / `binding_pending` | Run completo, **zero** bloqueantes **fatais** e **zero** bloqueantes **recuperáveis** | **`ready`** |
| `pack_loaded` / `binding_pending` | Run completo, **≥1** bloqueante **recuperável** | **`preflight_failed`** |
| Qualquer onde run é possível | Run deteta **fatal** (seção 13) | **`blocked`** |
| `preflight_failed` | Run subsequente **limpa** todos os bloqueantes | **`ready`** |
| `ready` | Revalidação com **novos** bloqueantes recuperáveis | **`preflight_failed`** |
| `ready` | Revalidação com **fatal** | **`blocked`** |

## 5.2 Estados que o Pre-flight **permite** (operador pode invocar run)

- `pack_loaded`, `binding_pending`, `preflight_failed`, `ready` (revalidação).

## 5.3 Estados que **bloqueiam** transição para `executing` **sem** passar pelo critério de sucesso

- Qualquer estado **que não** seja **`ready`** conforme §13 — em particular **`preflight_failed`**, **`blocked`**, **`binding_pending`** (se política exigir binding antes de `ready`), **`idle`**, **`pack_loaded`** sem sucesso de pre-flight.

## 5.4 `paused` / `finished`

- **`paused`:** pre-flight de **entrada** já ocorreu; **não** é estado-alvo típico do primeiro gate.  
- **`finished`:** novo evento ou novo Pack **reinicia** fluxo desde `idle` / carregamento.

## 5.5 Alinhamento com o editor (Cloud)

Severidades e termos (**bloqueante**, **aviso**, `media_id`, Scene) **devem** ser **inteligíveis** para quem configurou o evento no **EVENT_EDITOR_FEATURE_SPEC** — **sem** exigir que o pre-flight **valide** lifecycle `draft` da Cloud (isso é **antes** do export).

---

# 6. Estrutura oficial da engine de checks

A engine é **agrupada** em **cinco** grupos **estáveis**. Cada grupo produz **itens** com severidade **OK**, **aviso** ou **bloqueante** (seção 12). A **consolidação** (seção 13) agrega **todos** os grupos.

| Grupo | Objeto de análise |
|-------|-------------------|
| **G1 — Integridade do Pack** | Artefato em disco, arquivos internos, schema, assinatura, legibilidade. |
| **G2 — Licença** | Presença, assinatura, tempo, escopo, relógio local. |
| **G3 — Mídia** | Manifesto vs binding vs arquivos na workspace. |
| **G4 — Consistência do roteiro** | `event.json` / Scenes / referências a `DrawConfig` e `media_id`. |
| **G5 — Ambiente local** | Permissões, workspace, I/O, runtime mínimo. |

**Princípio:** falhas **cedo** nos grupos **G1–G2** podem **abreviar** trabalho **útil** dos grupos seguintes (seção 14), mas **resultado** **deve** **registar** **claramente** o **motivo** primário (suporte).

## 6.1 Modelo conceitual de um item de check

Cada **resultado** de verificação **atómica** (uma linha na UI, um registro na engine) **deve** ser tratado como **entidade estável**, **não** texto solto. Isto **uniformiza** engine, UI, logs e suporte.

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| **`check_id`** | Sim | Identificador **estável** da verificação (ex.: `pack.files.present`, `media.required.bound`) — **não** mudar entre versões do Player sem ADR; pode mapear 1:1 para enum em `shared-contracts`. |
| **`group`** | Sim | Um de **G1 … G5** (seção 6). |
| **`severity`** | Sim | **OK** \| **aviso** \| **bloqueante** (seção 12). |
| **`fatality`** | Quando `severity` = bloqueante | **recuperável** \| **fatal** \| `null` / omitido se não for bloqueante. |
| **`message`** | Sim | Texto **humano** para o operador (microcopy, seção 16). |
| **`code`** | Sim | Código curto estável para suporte (`PACK_SIG_INVALID`, …) — alinhado a §16.4. |
| **`actionable_target`** | Não | Onde a UI **pode** navegar: ex. `binding:media_id:opening_video`, `workspace:root`, `group:G2` — **opcional** se não houver ação além de “ler mensagem”. |

**Regra:** logs e `PreflightResult` **persistem** pelo menos **`check_id`**, **`group`**, **`severity`**, **`fatality`** (se aplicável), **`code`** para bloqueantes/fatais; **`message`** pode ser resumida em log.

## 6.2 Determinismo no MVP

Os checks do **MVP** **devem** ser **determinísticos**: para o **mesmo** Pack (conteúdo e `pack_version` iguais), **mesma** workspace e binding, **mesma** licença em disco e **mesma** versão do Player, **repetir** o pre-flight **deve** produzir o **mesmo** conjunto de itens (**mesmos** `check_id` com **mesma** `severity`/`fatality` e **mesmos** códigos), **salvo** alteração **externa** entre runs (arquivo removido, relógio alterado, permissão mudada).

**Motivo:** evita comportamento **inconsistente** (“às vezes passa”), **facilita** reprodução de bugs e **dá** confiança ao operador e ao suporte. Qualquer uso de **aleatoriedade**, **heurística** não documentada ou **dependência** de rede **não determinística** para o **núcleo** do MVP **exige** **ADR** e revisão desta spec.

---

# 7. Check group: integridade do Pack (G1)

## 7.1 Checks (conceituais)

| Check | Descrição |
|-------|-----------|
| **Arquivos esperados presentes** | Lista canônica de arquivos do Pack (ex.: `pack.json`, `event.json`, manifestos, licença, assinatura) **existe** e é **lida**. |
| **Schema / `pack_version`** | Versão do formato **suportada** pelo Player; JSON **valida** contra contrato (**shared-contracts** — ARCHITECTURE_SPEC §9.6). |
| **Assinatura íntegra** | `signature.sig` (ou equivalente) **verifica** sobre o manifesto de conteúdo acordado. |
| **Arquivos legíveis** | Leitura **sem** erro de permissão ou I/O **nos** componentes do Pack. |
| **Estrutura coerente** | Parse de JSON **bem formado**; referências **internas** entre arquivos do Pack **existem** (ex.: ids de export). |

## 7.2 Severidade sugerida

| Situação | Severidade | Nota |
|----------|------------|------|
| Arquivo obrigatório do Pack **ausente** | **Bloqueante** — tipicamente **fatal** → **`blocked`** | Não há Pack válido. |
| `pack_version` **não suportada** | **Bloqueante** **fatal** → **`blocked`** | Atualizar Player ou novo export. |
| Assinatura **inválida** / tampering | **Bloqueante** **fatal** → **`blocked`** | PRODUCT_SPEC / segurança. |
| JSON **malformado** em arquivo crítico | **Bloqueante** **fatal** | |
| Arquivo **extra** não assinado (se política) | **Aviso** | Não impede se política MVP ignorar. |
| **Checksum** opcional **desalinhado** (se existir) | **Aviso** ou **bloqueante** por política de produto | Documentar escolha no ADR se ambíguo. |

---

# 8. Check group: licença (G2)

## 8.1 Checks

| Check | Descrição |
|-------|-----------|
| **Licença presente** | Artefato de claims **existe** e **associa** ao Pack. |
| **Assinatura válida** | Claims **assinados** com cadeia **confiável** no Player. |
| **Validade temporal** | `valid_from` / `valid_until` (ou equivalente) vs **relógio local** (ARCHITECTURE_SPEC §16.4). |
| **Escopo compatível** | `org_id`, `event_id`, `export_id` **alinham** com `pack.json` / `event.json`. |
| **Relógio local suspeito** | Heurística leve (ex.: relógio **antes** de `valid_from` por margem absurda, ou ano 1970) — **sem** NTP obrigatório no MVP. |

## 8.2 Severidade sugerida

| Situação | Severidade |
|----------|------------|
| Licença **ausente** ou assinatura **inválida** | **Bloqueante** **fatal** → **`blocked`** |
| **Expirada** | **Bloqueante** **fatal** → **`blocked`** |
| Escopo **não coincide** (evento errado) | **Bloqueante** **fatal** → **`blocked`** |
| Relógio **suspeito** | **Aviso** (MVP recomendado) ou **bloqueante** se política comercial **exigir** — **nunca** silencioso |

---

# 9. Check group: mídia (G3)

## 9.1 Checks

| Check | Descrição |
|-------|-----------|
| **Obrigatória presente** | Cada `media_id` **obrigatório** no manifesto tem **binding** e arquivo **existente**. |
| **Extensão / tipo compatível** | Extensão MIME ou regra declarada **coerente** com `MediaRequirement`. |
| **Binding válido** | Path **relativo** resolve dentro da **workspace root** declarada; **sem** quebra após último save. |
| **Duplicidade suspeita** | Dois `media_id` distintos apontam para o **mesmo** arquivo — pode ser **intencional**; **avisar**. |
| **Arquivo ilegível** | Permissão negada, volume desmontado, **smoke** open/read **falha**. |

## 9.2 Severidade sugerida

| Situação | Severidade |
|----------|------------|
| Obrigatório **ausente** | **Bloqueante** **recuperável** |
| Extensão **incorreta** para obrigatório | **Bloqueante** **recuperável** |
| Binding **quebrado** | **Bloqueante** **recuperável** |
| Opcional **ausente** | **Aviso** (se política de manifesto assim definir) |
| Duplicidade suspeita | **Aviso** |
| Ilegível | **Bloqueante** **recuperável** |

## 9.3 Âmbito MVP da validação de mídia (sem “decode profundo”)

No **MVP**, a validação do grupo **G3** **restringe-se** a:

1. **Presença** — arquivo referenciado pelo binding **existe** no caminho resolvido.  
2. **Leitura mínima** — operação **I/O** mínima que prove **legibilidade** (ex.: abrir handle, ler **primeiros** bytes ou metadata **leve** conforme spec técnica derivada) — **não** ler o arquivo inteiro **nem** exigir decode completo.  
3. **Extensão / tipo declarado** — coerência com o **manifesto** / `MediaRequirement` (extensão ou regra equivalente).

**Não** entra no MVP: **decode** profundo de vídeo/áudio, validação de **codec** interno, **duração** exacta por análise de stream, **resolução** por frame decode, **checksum** de arquivo completo **salvo** ADR. Isto **evita** **creep** de complexidade e tempos **imprevisíveis** (seção 14.3). Evolução para checks **mais pesados** **exige** **ADR**, **timeouts** explícitos e **progresso** na UI.

---

# 10. Check group: consistência do roteiro (G4)

## 10.1 Checks

| Check | Descrição |
|-------|-----------|
| **Scenes válidas** | Lista ordenada **não** vazia (se evento exige ≥1 Scene); tipos **conhecidos** pelo Player; `sort_order` **sem** colisão. |
| **Referências resolvidas** | Cada Scene **referencia** apenas `media_id` / `draw_config_id` **presentes** no Pack. |
| **DrawConfig existente** | Todo `draw_config_id` referenciado **existe** em `draw-configs.json` (ou agregado equivalente). |
| **media_id resolvido** | Todo id usado no roteiro **consta** no manifesto de mídia. |

## 10.2 Severidade sugerida

| Situação | Severidade |
|----------|------------|
| **Zero** Scenes quando o contrato exige roteiro | **Bloqueante** — **fatal** se incorrigível sem novo Pack |
| Referência **quebrada** (id inexistente) | **Bloqueante** — **fatal** (Pack mal exportado) |
| Scene com tipo **desconhecido** pelo Player | **Bloqueante** **fatal** ou **recuperável** se prevista **degradação** por ADR — MVP: **fatal** |
| Inconsistência **leve** documentada | **Aviso** |

**Nota:** inconsistências que **só** a Cloud **deveria** ter impedido no export **ainda** **devem** aparecer aqui como **bloqueante** — o operador **precisa** de mensagem **clara** (“Pack inconsistente — gere novo export”), alinhada à UI_SPEC.

---

# 11. Check group: ambiente local (G5)

## 11.1 Checks

| Check | Descrição |
|-------|-----------|
| **Permissões mínimas** | App **pode** ler Pack, workspace e escrever **áreas** de log/binding conforme política Tauri. |
| **Acesso à workspace** | Root **definida** e **acessível**. |
| **Leitura de arquivos** | Teste **representativo** (não precisa ler **todo** o binário de vídeo — **head**/metadata conforme spec técnica derivada). |
| **Integridade mínima do runtime** | Display alvo **disponível** (se check existir no MVP) — pode ser **aviso** se **opcional**. |

## 11.2 Severidade sugerida

| Situação | Severidade |
|----------|------------|
| Workspace **inacessível** | **Bloqueante** **recuperável** |
| Sem permissão de leitura no Pack | **Bloqueante** **recuperável** ou **fatal** se irrecuperável |
| Segundo tela **ausente** (se exigido) | **Aviso** ou **bloqueante** por política — MVP: **aviso** |

---

# 12. Severidades oficiais

## 12.1 Três níveis por item de check

| Severidade | Significado | Efeito no consolidado |
|------------|-------------|---------------------|
| **OK** | Check passou; **nada** a reportar ao operador salvo modo detalhe. | **Não** impede `ready`. |
| **Aviso** | Condição **subótima** ou **risco** comunicado; execução **pode** prosseguir se **não** existir bloqueante. | **Não** impede `ready` (MVP normativo). |
| **Bloqueante** | Condição **impeditiva** para **`ready`**. | Impede `ready`; exige correção ou novo Pack. |

## 12.2 Subtipo normativo de bloqueante (para FSM)

- **Bloqueante recuperável:** operador **pode** resolver **na** máquina local (binding, permissões, arquivo errado) — consolidado leva a **`preflight_failed`**.  
- **Bloqueante fatal:** **não** resolvível **sem** novo Pack, alteração de licença, ou atualização de Player — consolidado leva a **`blocked`**.

**Regra:** cada check **bloqueante** **deve** ser **classificado** na implementação como **recuperável** ou **fatal** (documentado por **código** de razão estável).

## 12.3 Impacto operacional

- **OK / aviso:** operador **pode** avançar para **`ready`** se **zero** bloqueantes.  
- **Bloqueante recuperável:** operador **vê** lista **acionável**; estado **`preflight_failed`**.  
- **Bloqueante fatal:** operador **vê** mensagem **terminal** para esta sessão; estado **`blocked`**; logs **com** `export_id` e código.

## 12.4 Avisos acumulados e `ready` (MVP)

- **Quantidade** de avisos (**10**, **50**, …) **não** altera a regra: **enquanto** existir **zero** **bloqueante**, o consolidado **permite** **`ready`**.  
- Avisos são **informativos** — **não** “somam” em bloqueante **nem** degradam o estado da FSM para algo **equivalente** a `preflight_failed`.  
- **Visualmente** (seção **15.5**): muitos avisos **não** devem **imitar** bloqueantes (cor, ícone, densidade de alarme) — o operador **deve** distinguir **claramente** “posso ir ao ar com riscos comunicados” de “**não** posso até corrigir bloqueantes”.

---

# 13. Resultado consolidado do Pre-flight

## 13.1 Cálculo

Após **uma** execução completa (ou **ciclo** definido na seção 17):

1. Executar grupos na **ordem** da seção **14** (com **atalhos** seguros se aplicável).  
2. Agregar **todos** os itens **não-OK**.  
3. Se existir **≥1** bloqueante **fatal** → **resultado consolidado** = **falha fatal** → FSM **`blocked`**.  
4. Senão, se existir **≥1** bloqueante **recuperável** → **falha recuperável** → FSM **`preflight_failed`**.  
5. Senão → **sucesso** (OK e/ou **apenas** avisos) → FSM **`ready`**.

## 13.2 Quando vira `ready`

**Zero** bloqueantes de **qualquer** tipo; **avisos** **permitidos** (UI_SPEC §16.3 — padrão MVP).

## 13.3 Quando vira `preflight_failed`

**≥1** bloqueante **recuperável** e **zero** fatal.

## 13.4 Quando vira `blocked`

**≥1** bloqueante **fatal** **ou** condição **equivalente** já detetada no **loader** antes do run (FSM pode **entrar** diretamente em **`blocked`** sem passar por `preflight_failed` — **consistente** com ARCHITECTURE_SPEC §14.0).

## 13.5 `PreflightResult` persistido

Snapshot **recomendado** (ARCHITECTURE_SPEC §7.5): timestamp **global** do fim do run, `pack_version`, contagens (bloqueantes / avisos / OK), lista **resumida** de códigos dos não-OK, **não** payload gigante de binários.

**Timestamps por grupo:** o resultado **deve** **também** registar, por cada **G1…G5**, **pelo menos** **início** e **fim** da fase desse grupo no run (ou timestamp de **conclusão** por grupo se início for derivado). Isto **não** altera a norma de **run completo** no MVP (seção 17.4), mas **prepara** otimizações futuras (**run parcial** por grupo) **sem** perder **rastreabilidade** (“G3 demorou 40s”, “G1 falhou aos 2s”).

## 13.6 Run parcial futuro (sem quebrar a norma)

Enquanto o MVP **exigir** run **completo**, qualquer **evolução** para **reexecutar só** um subconjunto de grupos **deve**:

- **manter** o modelo de **§6.1** e o **consolidado** **§13.1**;  
- **registar** explicitamente grupos **não** reexecutados nesta passagem (`SKIPPED_NOT_RUN` ou equivalente), **ou** **reconsolidar** após run parcial com **regra** documentada em ADR;  
- **preservar** **timestamps por grupo** para o que **foi** executado, **sem** apagar histórico **global** do último run **completo** **salvo** política de retenção definida.

---

# 14. Ordem oficial de execução dos checks

## 14.1 Sequência normativa

1. **G1** Integridade do Pack  
2. **G2** Licença  
3. **G5** Ambiente local (pode **subir** antes de G3 se **I/O** global falhar — **duas** ordens aceites: **G1→G2→G5→G3→G4** **ou** **G1→G2→G3→G4→G5**; **fixar uma** no ADR de implementação; **recomendação:** **G5** **antes** de **G3** para **falhar** cedo em pasta inacessível **antes** de varrer mídia.)

**Recomendação forte (MVP):** **G1 → G2 → G5 → G3 → G4**

## 14.2 Por que a ordem importa

- **Falha** em G1/G2 **invalida** confiança em **todo** o resto — **desperdício** e **ruído** listar 40 mídias se o Pack **já** é adulterado.  
- **G5** antes de **G3** evita **falso** “mídia ausente” quando o **real** problema é **workspace** desmontada.  
- **G4** **por último** assume **dados** de Pack **já** **legíveis** e **licenciados**.

## 14.3 Política de tempo operacional e responsividade

- Cada **grupo** **G1…G5** **deve** ter **tempo operacional aceitável** definido em **implementação** (limites **por** check ou **por** grupo), com **especial atenção** a **G3** (muitos arquivos, vídeos grandes, **shares** de rede lentos, disco externo).  
- Os checks **não** **devem** **travar** a interface: trabalho **pesado** **off** do **thread** de UI; cancelamento **controlado** **só** se produto **definir** (MVP: **não** obrigatório).  
- Checks **longos** (**varrimento** de mídia, I/O lento) **devem** **reportar** **progresso** na UI (arquivo **N** de **M**, grupo **G3** em curso — UI_SPEC §16.4), **não** **congelar** o tela **sem** feedback.  
- **Timeout** **por** check ou **por** grupo: em caso de **exceder** o limite, o item **deve** tornar-se **bloqueante recuperável** (ex.: “Timeout ao ler `media_id` X — verifique rede ou disco”) **ou** **aviso** se política **assim** definir — **nunca** **falha** **silenciosa** nem **spin** infinito. Valores **numéricos** concretos ficam em **spec técnica** ou **ADR**, **não** neste documento.

## 14.4 Atalhos (fail-fast)

Se **G1** ou **G2** produz **fatal**, a engine **pode** **omitir** grupos posteriores **no mesmo run** **desde que** o **resultado consolidado** **registe** **explicitamente** checks **não executados** como **omitidos** (código `SKIPPED_DEPENDENCY`) **para** debugging — **não** confundir com **OK**. Os **timestamps por grupo** (§13.5) **devem** **refletir** grupos **omitidos** (fim imediato ou marcador `skipped`).

---

# 15. UX oficial do Pre-flight

Alinhado à **UI_SPEC §16**; aqui **reforçado** como **norma funcional**.

## 15.1 Superfície

- **Tela dedicada** ou **painel de página inteira** — **não** modal pequeno.  
- **Cerimónia de qualidade:** ritmo **calmo**, hierarquia **clara**, **sem** alarmismo.

## 15.2 Layout

1. **Resumo superior:** contagens **“Bloqueantes: N”**, **“Avisos: M”**, **última execução** (hora), **`export_id`** opcional para suporte.  
2. **Grupos** colapsáveis: G1…G5 com **títulos** estáveis.  
3. **Lista** por grupo: cada linha = **severidade** + **mensagem** + **código** (opcional colapsado) + **ação** (“Ir para binding”, “Abrir pasta da workspace”).  
4. **Ação principal:** **“Executar checagens”** / **“Executar checagens novamente”**; secundária: **“Ir para mídia”** quando aplicável.  
5. Transição para **`ready`:** mensagem **“Pronto para executar”** + botão **“Iniciar execução”** **só** se FSM = `ready`.

## 15.3 Progresso

Se checks **assíncronos:** atualizar **linha a linha** — **não** spinner **opaco** único.

## 15.4 Densidade

**Evitar** lista **única** de 200 linhas **sem** grupos; **evitar** **esconder** bloqueantes **abaixo** da dobra **sem** resumo.

## 15.5 Muitos avisos — não parecer “quase bloqueante”

- O **resumo superior** **deve** **separar** **sempre** contagens **Bloqueantes** vs **Avisos** (nunca **fundir** num único número **alarmista**).  
- Lista de **avisos** **deve** usar **peso visual** **inferior** ao de **bloqueantes** (UI_SPEC — cor, ícone, **sem** banner global vermelho **só** por avisos).  
- **Dez** ou **mais** avisos: preferir **grupo** colapsável **“Avisos (N)”** com **primeiros** itens visíveis **ou** scroll **dentro** do grupo — **não** **elevar** a hierarquia ao nível de **erro fatal**.  
- Estado **`ready`** com avisos: mensagem **“Pronto para executar”** **pode** incluir **frase** curta **“Com N avisos — reveja se necessário”**, **sem** **bloquear** o CTA primário **nem** **duplicar** o peso visual dos bloqueantes.

---

# 16. Microcopy do Pre-flight

## 16.1 Tom

**Preciso, operacional** (PRODUCT_SPEC §10; UI_SPEC §14). **Sem** marketing. **Sem** “Ops!” ou “Algo correu mal”.

## 16.2 Exemplos normativos (bons)

- “**3 itens bloqueantes** precisam de resolução antes de executar.”  
- “**Licença válida até** 2026-04-12 (relógio local).”  
- “**Mídia obrigatória ausente:** `opening_video`.”  
- “**Assinatura do Pack inválida.** Gere um novo Pack na Cloud.”  
- “**Workspace inacessível.** Verifique o caminho ou permissões.”

## 16.3 Evitar

- “Erro desconhecido.”  
- “Contacte o administrador” sem **código** ou **ação**.  
- Jargão de stack **sem** tradução (“ENOENT” **sozinho**).

## 16.4 Códigos de razão

Cada item **deve** ter **código** estável (`PACK_SIG_INVALID`, `MEDIA_REQUIRED_MISSING`, …) alinhado ao campo **`code`** do modelo **§6.1** — **compartilhável** com suporte; pode viver em **shared-contracts** como enum (ARCHITECTURE_SPEC §21.4 — **sem** lógica de negócio, só **códigos**).

---

# 17. Revalidação

## 17.1 Quando reexecutar **automaticamente** (recomendado)

- Alteração **gravada** de **binding** (`local-binding.json` ou equivalente).  
- Substituição de arquivo **detetada** (watch **ou** reabertura de diálogo de mídia — política de implementação).  
- Troca de **workspace root** (se permitida).

## 17.2 Quando reexecutar **manualmente**

- Qualquer momento **via** botão **“Executar checagens novamente”** em `ready` ou `preflight_failed`.

## 17.3 O que **invalida** o resultado anterior

Qualquer evento acima **ou** carregamento de **novo** Pack — resultado anterior **arquivado** em histórico (collapse) ou **substituído** com timestamp.

## 17.4 Run completo vs parcial

- **MVP normativo:** **run completo** em **toda** invocação **pública** — **simplicidade** e **determinismo** (§6.2).  
- **Otimização futura** (ADR): subset de grupos (ex.: **só** **G3** após mudança de binding) — **só** **válida** se **respeitar** **§13.6** (registro de grupos **omitidos** / **reconsolidação** explícita) e **manter** **timestamps por grupo** para o que **correu**, **sem** **quebrar** a **norma** de **transparência** para suporte.

---

# 18. Relação com binding de mídia

- O grupo **G3** **consome** o **binding atual**; **não** há cache **silencioso** de paths **obsoletos** face ao arquivo guardado.  
- **Mudança** de binding **invalida** qualquer **`ready`** **implícito**: FSM **deve** regressar a **`preflight_failed`** ou **`binding_pending`** **até** **novo** run **bem-sucedido** (ARCHITECTURE_SPEC §11.4).  
- **UI:** após alterar arquivo, **CTA** “Executar checagens” **visível** — **não** assumir `ready` **automático** **sem** run **completado** (política: auto-run **após** debounce **é** **permitida** **se** **transição** de estado **for** **sempre** **explícita** na UI).

---

# 19. Relação com logs locais

## 19.1 O que logar

- **Início** e **fim** de cada run (timestamp, duração **global**).  
- **Por grupo:** **conclusão** (ou início+fim) alinhado a **§13.5**.  
- **Transição** de FSM **motivada** por pre-flight (`preflight_failed` → `ready`, etc.).  
- **Resumo** contagens bloqueantes/avisos.  
- **`check_id`** e **códigos** de razão dos **bloqueantes** e **fatals** (avisos: **amostra** ou **contagem** **se** volume alto — política: **sempre** **bloqueantes** e **fatals** completos).

## 19.2 Quando

- **Sempre** que o run **termina** (sucesso ou falha).  
- **Não** spammar **por** check OK **individual** em arquivo **salvo** salvo modo **debug**.

## 19.3 Severidade no log

Níveis **alinhados** a **ERROR** (fatal), **WARN** (bloqueante recuperável / aviso crítico), **INFO** (run completo OK com avisos).

---

# 20. Relação com execução

## 20.1 O que impede `ready`

**Qualquer** bloqueante **no último consolidado** (seção 13).

## 20.2 O que impede `executing`

FSM **diferente** de **`ready`** **ou** **ação** do operador **não** **disparada**; **nunca** `executing` **com** último pre-flight **com** bloqueantes **ainda** **válidos**.

## 20.3 Problema **após** `ready` **e** **já** em `executing`

- **Não** é **reclassificado** como “falha de pre-flight” **retroactivamente** — é **incidente de execução** (arquivo **removido** a meio, etc.).  
- UI: **banner** / overlay (UI_SPEC §17.6); **opções** “Pausar”, “Repetir”, **“Executar checagens novamente”** **após** pausa **se** política **permitir** **revalidação** **antes** de **retomar**.

---

# 21. Anti-padrões do Pre-flight

1. **Toast** como **único** canal para bloqueante **fatal**.  
2. Permitir **“Iniciar execução”** com bloqueantes **ativos**.  
3. Lista **única** **sem** grupos **G1–G5**.  
4. Mensagens **genéricas** **sem** `media_id` ou código.  
5. **Confundir** **`preflight_failed`** com **`blocked`** **sem** critério **fatal/recuperável**.  
6. **Saltar** G1/G2 **silenciosamente** **sem** registro **SKIPPED**.  
7. **Cache** de resultado **através** de **mudança** de binding **sem** invalidar **`ready`**.  
8. Pre-flight **modal** de **400px**.  
9. **Verde** “tudo certo” **exagerado** para **avisos** **ainda** presentes **sem** lista.  
10. Exigir **N** cliques **burocráticos** **sem** valor de check **adicional**.  
11. Duplicar **validação** do **editor** com **mensagens** **que** **culpam** o operador **por** **erro** de **export** **sem** dizer **“Pack inconsistente — novo export”**.  
12. Itens de check **sem** **`check_id`** / **`code`** estáveis (viola §6.1).  
13. Comportamento **não determinístico** do **núcleo** MVP sem ADR (viola §6.2).  
14. **UI** **travada** durante I/O longo **sem** progresso nem timeout (viola §14.3).  
15. **Muitos avisos** apresentados com **mesma** hierarquia visual que **bloqueantes** (viola §15.5).  
16. **Decode** profundo de codec ou análise pesada de mídia **no** MVP **sem** ADR (viola §9.3).

---

# 22. Evolução futura segura

## 22.1 Checks **possíveis** (ADR + revisão desta spec)

- **Hash** de arquivo vs manifesto (se Cloud passar **hash** esperado).  
- **Resolução** / **codec** de vídeo (smoke **decode** — **fora** do âmbito **§9.3** até ADR).  
- **Espaço em disco** mínimo.  
- **Versão** de **fontes** no sistema vs BrandTheme.  
- **Rede** **opcional** “ping” **sem** **tornar** pre-flight **dependente** de internet para **núcleo** offline.

## 22.2 O que **não** inflar cedo

- **ML** “qualidade de vídeo”.  
- **Centenas** de checks **microscópicos** **sem** valor no palco.  
- **Telemetria** **obrigatória** **para** **passar** pre-flight.

---

# 23. Critério normativo final

O **Pre-flight** é **núcleo** do **valor operacional** do **Player**: **toda** implementação da **preflight_engine**, **UX** associada, **logs** e **transições** para **`ready`** **devem** obedecer esta especificação. **Novas** regras de check, **novos** códigos de severidade ou **mudança** na **ordem** dos grupos **exigem** **revisão** deste documento e alinhamento com **PRODUCT_SPEC**, **ARCHITECTURE_SPEC**, **UI_SPEC** e, quando **tocar** em conteúdo exportável, **EVENT_EDITOR_FEATURE_SPEC**.

---

*Documento interno de feature — TelaFlow. PRE_FLIGHT_FEATURE_SPEC v1.1 — modelo de item de check (§6.1), determinismo (§6.2), âmbito MVP de mídia (§9.3), avisos acumulados (§12.4, §15.5), timestamps por grupo (§13.5–13.6), tempo e progresso (§14.3). Derivado do PRODUCT_SPEC v1.1, ARCHITECTURE_SPEC v1.1, UI_SPEC v1.0 e EVENT_EDITOR_FEATURE_SPEC v1.1.*
