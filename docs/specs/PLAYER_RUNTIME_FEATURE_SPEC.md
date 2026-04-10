# TelaFlow — Especificação Funcional do Player Runtime (PLAYER_RUNTIME_FEATURE_SPEC)

**Versão:** 1.0.1  
**Status:** Documento normativo — referência para **ciclo de execução local**, **carregamento e interpretação do Pack**, **máquina de estados**, **operação do operador**, **comportamento sob falha** e **logs** do **TelaFlow Player**  
**Última revisão:** 2026-04-10  
**Domínio local:** TelaFlow Player (Tauri + runtime de palco)  

**Hierarquia normativa:** Este documento é **derivado e subordinado** a, **nesta ordem**: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md), [UI_SPEC.md](./UI_SPEC.md), [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md), [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md), [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md). Em caso de ambiguidade ou conflito aparente, **prevalece** o documento **mais acima** na lista; o Player Runtime **deve** ser ajustado (via revisão deste arquivo e **ADR** quando couber) para restabelecer alinhamento.

**Escopo:** comportamento funcional do **motor de execução** no palco — **sem código**, **sem DDL**. Detalhes de APIs internas, formatos de ficheiro local e codecs pertencem a especificações derivadas, **desde que** obedeçam a este documento e à **ARCHITECTURE_SPEC**.

**Fronteira:** O **Pre-flight** (orquestração de checks antes de `ready`) está normativamente definido no [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md); este documento **referencia** os seus **efeitos** na FSM e na execução, **sem** duplicar a taxonomia de checks.

---

## Prefácio

O **Player Runtime** é o núcleo vivo do TelaFlow no local do evento: consome o [Pack](./PACK_EXPORT_FEATURE_SPEC.md) como contrato fechado, honra licença e integridade, e conduz o telão passo a passo conforme Scenes ordenadas — não como leitor de ficheiros genérico. O [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) promete previsibilidade e modo offline para o núcleo do show; a [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) fixa a máquina de estados e os módulos; a [UI_SPEC.md](./UI_SPEC.md) exige mesa de controle clara em `executing`. Este documento unifica essas obrigações no comportamento do runtime.

---

# 1. Papel do Player Runtime no produto

## 1.1 Por que é núcleo operacional

Fora do runtime **disciplinado**, o Pack é **só** JSON em disco e a workspace **só** pastas: **ninguém** **garante** que o telão **obedece** ao roteiro aprovado. O runtime **é** a **instanciação** do contrato [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md): **ativa** Scenes na **ordem** exportada, **aplica** branding **resolvido**, **dispara** sorteios **no** **contexto** do roteiro e **reage** a falhas **sem** improviso silencioso ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §11).

## 1.2 Por que é mais do que “abrir mídia”

Um **media player** **genérico** **não** possui **unidade mínima executável** alinhada ao evento, **não** **encadeia** momentos de palco com **identidade** e **sorteio** **contextualizados**, **não** **respeita** a FSM **nem** o **gate** do Pre-flight. O TelaFlow **posiciona-se** como **direção visual e operação de palco** ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §1.4); o runtime **materializa** essa categoria **localmente**.

## 1.3 Por que sustenta a promessa comercial

O **comprador** renova com base em **confiabilidade** e **governança**; o **operador** julga no **primeiro** minuto ao vivo. O runtime **entrega**: estados **nomeados**, transições **registadas**, falhas **visíveis**, **offline** no núcleo ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.5). **Sem** isso, o handoff Cloud → Pack **desfaz-se** no palco.

---

# 2. O que o Runtime precisa resolver

| Necessidade | O que o runtime **deve** garantir |
|-------------|-----------------------------------|
| **Carregar Pack válido** | Ler artefatos na **ordem** e **contrato** do Pack ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §6–7); recusar formato adulterado ou incompatível **com** mensagem **clara** ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §4.2). |
| **Respeitar licença** | **Não** entrar em execução pública **sem** validação de claims e assinatura conforme política ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §10). |
| **Respeitar Pre-flight** | Transição para **`executing`** **só** com último pre-flight **sem bloqueantes** e condições de integridade acordadas ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md); ARCHITECTURE §11.4). |
| **Interpretar roteiro** | **Uma** sequência **ordenada** de Scenes **como** exportada ([EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §5.1); **sem** reordenar **por** heurística local. |
| **Executar Scenes** | Para cada Scene **ativa**, **comportamento** alinhado ao **tipo** e às **referências** (`media_id`, `draw_config_id`, slots) **do** Pack **somente**. |
| **Previsibilidade operacional** | Mesmo Pack + mesma workspace + binding + licença válidos → **mesmo** roteiro **observável** (salvo falha externa — ficheiro removido, etc.). |

---

# 3. O que o Runtime NÃO deve virar

| Anti-alvo | Por quê |
|-----------|---------|
| **Media player genérico** | Viola categoria de produto; **remove** roteiro, branding operacional e sorteio **contextualizado** ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §2.1). |
| **Timeline livre** | O produto **rejeita** NLE/canvas como núcleo ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §8, §11.6); o runtime **não** oferece **trilhas** arbitrárias. |
| **Editor local de evento** | Correções de roteiro **voltam** à Cloud e **novo** export ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3.3); o Player **não** reescreve o contrato. |
| **Ambiente de configuração prolongado em `executing`** | Em execução, a UI **minimiza** poluição ([UI_SPEC.md](./UI_SPEC.md) §17.4); **não** expor CRUD de Pack ou árvores de settings **como** foco. |
| **Cliente espontâneo da Cloud no núcleo** | **Não** buscar cenas ou mídia na API **durante** o show no fluxo principal ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §4.3). |
| **Inferência fora do contrato** | O Pack **diz** o que existe; o runtime **não** “completa” campos **omitidos** ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §23). |

---

# 4. Relação com a máquina de estados oficial

Os **nomes** e **significados** abaixo são **normativos** ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §14.0). **UI**, **local_state** e **logs** **devem** usar o **mesmo** enum — **proibido** estado “fantasma” só na camada visual.

## 4.1 Estados

| Estado | Significado |
|--------|-------------|
| **`idle`** | Aplicação pronta; **nenhum** Pack em sessão ativa (ou sessão **resetada**). |
| **`pack_loaded`** | Pack lido e parseado até o ponto aceite; **podem** faltar binding ou pre-flight **completo** com sucesso. |
| **`binding_pending`** | Pack válido; **mídia obrigatória** **ainda** **não** totalmente vinculada na workspace. |
| **`preflight_failed`** | Último pre-flight com **bloqueantes**; **execução pública** **não** permitida até correção / novo ciclo. |
| **`ready`** | Pre-flight **sem** bloqueantes; licença e integridade **OK**; operador **pode** **iniciar** o roteiro. |
| **`executing`** | Telão sob **controle** do roteiro; Scene **ativa** conforme Pack. |
| **`paused`** | Execução **suspensa** pelo operador (**pode** ser opcional no MVP; o **estado** existe no modelo). |
| **`finished`** | Evento **encerrado** por ação do operador ou **término** explícito do roteiro. |
| **`blocked`** | **Impasse fatal** (licença inválida, assinatura quebrada, `pack_version` incompatível, erro irrecuperável **definido**). **Distinto** de `preflight_failed` quando **não** se resolve **só** com binding. |

## 4.2 Transições **reais** (visão funcional)

- **`idle` → `pack_loaded` | `blocked`:** carregar Pack; sucesso parcial até integridade/schema ou falha fatal cedo.  
- **`pack_loaded` ↔ `binding_pending`:** à medida que o binder **preenche** ou **reabre** lacunas em obrigatórios.  
- **→ `preflight_failed` | `ready` | `blocked`:** resultado do **run** de pre-flight e política de **fatal** ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §5, §13).  
- **`ready` → `executing`:** operador **inicia** execução (ação **explícita**).  
- **`executing` ↔ `paused`:** **se** pausa **habilitada** no MVP — política de produto; transição **nomeada**.  
- **`executing` → `finished` | `preflight_failed` | `blocked` | `ready`:** conforme §19–20 e §17.  
- **`finished` → `idle` (ou novo ciclo):** novo Pack / nova sessão — **reinício** **claro** para o operador.

## 4.3 Restrições

- **Transições** **só** por **eventos** nomeados (carregar Pack, binding atualizado, pre-flight concluído, operador inicia/pausa/encerra, erro fatal).  
- **Toda** mudança **relevante** **deve** ser **logada** (§18; ARCHITECTURE §17.2).  
- **`executing`** **com** pre-flight **ainda** com bloqueantes **conhecidos** no modelo atual **viola** a norma — salvo **revalidação** interrompida e estado **corrigido** **antes** de continuar (§19).

## 4.4 Comportamento esperado na UI

A UI **reflete** o estado **sem** contradizer a FSM ([UI_SPEC.md](./UI_SPEC.md) §20.13 — stepper **alinhado**). Controles **habilitados** / **desabilitados** **seguem** §15.

## 4.5 Orientação por eventos (modelo de progressão)

O runtime **não** avança por **loop** livre ou “tick” contínuo **conceitual** que simule o palco **fora** de causas identificáveis. A progressão **reage** a **eventos discretos**, entre os quais:

| Origem | Exemplos |
|--------|----------|
| **Operador** | Avançar, voltar (se permitido), pausar, retomar, encerrar, disparar sorteio quando aplicável. |
| **Fim de mídia / marco de playback** | Quando o Pack e a política exportada **ligarem** fim de clip ou auto-avanço a um evento **nomeado** (§9.2, §11.2). |
| **Falha detetada** | I/O, ficheiro ausente, erro de leitura, inconsistência de draw (§17). |
| **Gatilhos internos** | Conclusão atómica de transição de Scene (§11.4); **timeouts** ou **marcos** **só** se **existirem** em **ADR** ou spec derivada. |

**Motivo:** fixa **onde** a implementação **deve** ancorar trabalho — **handlers** sobre **eventos** **nomeados**, **não** uma **engine** **tipo** **simulação** **por** **iteração** **aberta**. Reduz ambiguidade entre **estado** **da** **FSM** **global** **e** **momento** **em** **que** **o** **roteiro** **de** **Scene** **avança**.

---

# 5. Momento de entrada no Runtime executável

## 5.1 Quando o runtime **pode** iniciar (modo **executável**)

O **núcleo** de execução (ativação de Scene, saída para telão conforme roteiro) **só** **entra** em operação **plena** a partir de **`executing`**. **Antes** disso, o **loader**, **binder** e **pre-flight** **preparam** o contexto **sem** **equivocar** “montagem” com “ao vivo”.

## 5.2 O que precisa existir **antes**

- Pack **carregado** e **interpretável** até o nível exigido pelo loader.  
- Licença **validada** conforme política **ou** estado **`blocked`** **explícito**.  
- Binding **suficiente** para os checks **necessários** ao último pre-flight **que** habilita `ready` ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §4).  
- Último pre-flight **com** **zero** bloqueantes para transição **`ready`**.

## 5.3 O que **bloqueia** execução

- **`blocked`:** **não** há caminho para `executing` **sem** novo Pack / correção **fora** do escopo local.  
- **`preflight_failed`:** **não** iniciar show **público** até **resolver** bloqueantes ou **aceitar** apenas **avisos** conforme política ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §12).  
- **`binding_pending`** **quando** a política **exige** obrigatórios **antes** de `ready`.  
- **`idle`** sem Pack.

---

# 6. Carregamento do Pack

## 6.1 Como o Pack **entra**

O operador **indica** o **artefato** (diretório descompactado ou contêiner suportado) **dentro** das **permissões** do Player ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §16.3). O **pack_loader** **lê** ficheiros **do** filesystem **local** — **sem** depender de rede para o **núcleo**.

## 6.2 O que o runtime lê **primeiro**

`pack.json` **primeiro** — manifesto raiz ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §7): `pack_version`, ids, `generated_at`, referência ao conjunto assinado. **Sem** `pack.json` **válido**, o objeto **não** é tratado como Pack **normativo**.

## 6.3 Ordem **lógica** de leitura

Alinhada à **ordem canónica** de **verificação** ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §6.1): após `pack.json`, **`event.json`**, **`branding.json`**, **`media-manifest.json`**, **`draw-configs.json`**, licença, **`signature.sig`** — para **validação** de integridade e **construção** do modelo **interno**. **Falha** **cedo** com mensagem **estruturada** (o quê / por quê / próximo passo — [UI_SPEC.md](./UI_SPEC.md) §18.1).

---

# 7. Construção do contexto de execução

## 7.1 Modelo interno do evento

Após **parse** e **validação** de schema, o runtime **monta** uma **visão** **somente leitura** do evento: metadados exportáveis, **lista ordenada** de Scenes, referências **por id** **fechadas** contra manifesto e draw configs.

## 7.2 Scenes **carregadas**

Cada Scene é um **objeto** **tipado** com **ordem** **canónica**; **não** **reordenar** por UI local **salvo** ações **explícitas** de “ir para” **se** política **permitir** (§11) — **não** alteram o Pack em disco.

## 7.3 Branding **resolvido**

Tokens e regras **do** `branding.json` **entram** no **contexto** como **camada** **aplicável** a todas as Scenes **salvo** overrides **previstos** no schema (MVP: ver §13).

## 7.4 DrawConfigs **disponíveis**

Mapa **`draw_config_id` → configuração** **a partir** de `draw-configs.json`; Scenes **referenciam** **sem** duplicar regras ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §6.8).

## 7.5 Media bindings **válidos** para execução

`media_id` → **path relativo** à workspace **persistido** no binding local ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §7.2, §8.7). **Até** `ready`, o binding **pode** estar **incompleto**; em **`executing`**, o runtime **assume** **resolução** **conforme** último estado **validado** pelo pre-flight **que** habilitou `ready` — mudanças **posteriormente** **detetadas** **tratadas** em §17 e §19.

---

# 8. Unidade operacional central do Runtime

## 8.1 Scene como unidade mínima executável

Conforme [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §5.5 e [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §4: **não** há sub-unidade executável **nomeada** **fora** de Scene no MVP. O runtime **sempre** tem **exactamente** **uma** Scene **ativa** em `executing` (salvo transição **atómica** entre Scenes).

## 8.2 Scene **atual**

**Índice** (ou ponteiro) **na** sequência exportada + **identidade** da Scene (`scene_id`, nome operacional). **Obrigatório** para **output** ao telão e **para** logs.

## 8.3 **Próxima** Scene

Derivável **da** ordem **do** Pack: **sempre** **conhecida** **salvo** última Scene — **para** UI (“Próximo: …” — [UI_SPEC.md](./UI_SPEC.md) §17.5) e **para** decisões de transição.

## 8.4 Posição **clara**

O operador **vê** **cena atual** e, **quando** aplicável, **“N de M”** ([UI_SPEC.md](./UI_SPEC.md) §17.3). **Não** **esconder** posição **em** `executing` **sem** ação **consciente** de “modo mínimo” **documentada**.

---

# 9. Execução de Scene

## 9.1 Como uma Scene **inicia**

Transição **atómica**: **desativa** **output** específico da Scene anterior **conforme** política de **transição** (§11); **carrega** **definição** da nova Scene **do** contexto; **aplica** branding **de** execução; **resolve** **mídia** via binding; **prepara** **gatilhos** (ex.: sorteio **disponível** **mas** **não** disparado **sem** ação **se** assim **for** a regra do tipo).

## 9.2 Quando uma Scene **termina**

- **Operador** **avança** (**manual**).  
- **Política** de **auto-avanço** **se** existir no MVP (**explícita** em ADR/produto — §11): **ex.** mídia **com** fim **natural** **e** **flag** exportada **que** **permita** — **nunca** **silêncio** no telão **sem** **design** **aceite**.  
- **Encerramento** do evento (§20).

## 9.3 O que o runtime faz **ao entrar** numa Scene

- **Valida** **referências** **locais** **mínimas** **para** **aquela** Scene (ficheiros **ainda** **presentes** — §17).  
- **Compõe** **camadas** **autorizadas**: mídia principal **se** houver, overlays **de** **tipos** **fechados**, slots de patrocinador **previstos**.  
- **Expõe** **no** **telão** **conforme** **tipo** e **branding** (§10, §13).  
- **Regista** **ativação** em **log** (§18).

## 9.4 Marcador de conclusão de Scene

Antes de **aceitar** o **avanço** do roteiro (mudança do ponteiro da Scene **ativa** para a **seguinte**, ou efeito **irreversível** **equivalente**), o runtime **deve** **registar** **explicitamente** a Scene **que** **termina** como **concluída** no **fluxo** de execução: **`scene_id`**, **timestamp**, **causa** da conclusão (**manual**, **fim de mídia** / marco exportado, **erro** com política de **pular** Scene, **encerramento** do evento, …).

**Ordem normativa:** **(1)** registo de **conclusão** **(completed)** **→** **(2)** **transição atómica** (§11.4) **→** **(3)** **ativação** da **nova** Scene **e** **log** de **ativação** (§18). **Não** avançar **dois** **índices** **de** **roteiro** **sem** **dois** **registos** **de** **conclusão** **compatíveis** **com** **§15.2**.

---

# 10. Tipos de Scene em execução

Comportamento **operacional** alinhado ao enum do [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §6. **Sem** implementação: **expectativa** **observável**.

| Tipo | Comportamento operacional esperado |
|------|-----------------------------------|
| **abertura** | **Forte** **identidade** de evento/marca; mídia institucional **ou** composição **equivalente** **conforme** Pack; **ritmo** **claro** de “início de show”. |
| **institucional** | Conteúdo de marca/evento **sem** foco **exclusivo** em sorteio ou **um** patrocinador; leitura **à distância** **priorizada** na composição. |
| **patrocinador** | **Slots** de patrocinador **como** **elemento** **dominante** **visual** **relativo** ao tipo; **não** substituir CRM nem dados **fora** do Pack. |
| **sorteio** | **DrawConfig** **referenciado** **obrigatório** **salvo** política de aviso no editor; **UI** de palco **preparada** para **disparo** **explícito** ([UI_SPEC.md](./UI_SPEC.md) §17.2); **resultado** **visível** **conforme** regras **exportadas**. |
| **intervalo** | **Menor** densidade; transição **ou** loop **leve** **conforme** Pack; **não** **confundir** com **encerramento**. |
| **encerramento** | **Fecho** **formal**; mensagem **ou** mídia **final** **conforme** roteiro; **prepara** **transição** para **`finished`** **por** ação do operador **ou** política **documentada**. |

**Regra:** **nenhum** tipo **autoriza** **layout** **livre** **nem** **árvore** **arbitrária** — só o **permitido** pelo schema da Scene no Pack.

---

# 11. Transição entre Scenes

## 11.1 Transição **manual**

**Predefinição** MVP: operador **avança** (**e** **volta** **se** política **permitir** — [UI_SPEC.md](./UI_SPEC.md) §17.2). **Cada** **clique** **ou** **atalho** **gera** **transição** **nomeada** **na** FSM **interna** **e** **log**.

## 11.2 Transição **automática**

**Só** **com** **regra** **exportada** **e** **ADR** / **produto** **se** **introduzir** **comportamento** **sem** **confirmação** **humana**: **deve** **haver** **feedback** **visível** **ao** operador **antes** **ou** **durante** **a** **troca** (**não** **mudança** **súbita** **no** telão **sem** **rastreabilidade**).

## 11.3 Comportamento **seguro**

- **Não** **avançar** **duas** Scenes **por** **um** **único** **input** **salvo** **gesto** **explícito** **“saltar”** **se** **algum** **dia** **existir** — **MVP:** **um** **passo** **por** **ação** **primária**; **reforço** **normativo** em §15.2.  
- **Em** **erro** **de** **mídia** **na** **Scene** **atual**, **não** **avançar** **automaticamente** **sem** **política** **documentada** — **ver** §17.  
- **Sorteio** **pendente** **não** **bloqueia** **avanço** **físico** **da** **FSM** **de** **Scene** **salvo** **regra** **de** **produto** **que** **exija** **confirmação** — **mas** **deve** **ficar** **claro** **na** **UI** **se** **há** **risco** **operacional** (**ex.** **sorteio** **não** **disparado**).

## 11.4 Atomicidade da transição (ponto de vista do operador e do telão)

A troca entre duas Scenes **deve** ser **atómica** **no** **efeito** **visível**: **não** **há** **estado** **intermediário** **estável** **em** **que** **metade** **da** **composição** **pertença** **à** **Scene** **A** **e** **metade** **à** **Scene** **B** **como** **“palco** **válido”**. Trabalho **interno** (I/O, decode, preload — §11.5) **pode** **correr** **antes** **do** **momento** **da** **troca**; **o** **instante** **em** **que** **a** **Scene** **ativa** **no** **telão** **muda** **é** **único** **e** **alinhado** **ao** **registo** **de** **conclusão** **(§9.4)**.

## 11.5 Preparo antecipado (preload mínimo)

O runtime **pode** **preparar** **a** **próxima** Scene **antes** **de** **a** **ativar**: **ler** **definição**, **resolver** **binding**, **antecipar** **abertura** **de** **recursos** **leves** **conforme** **política** **de** **implementação**. **Limites** **normativos:**

- **Não** **promover** **a** **próxima** Scene **a** **“Scene** **ativa”** **no** **telão** **nem** **atualizar** **o** **indicador** **“cena** **atual”** **para** **o** **público** **antes** **do** **evento** **de** **transição** **(§4.5)**.  
- **Se** **o** **preload** **falhar**, **a** **falha** **trata-se** **no** **momento** **da** **transição** **ou** **antes**, **com** **mensagem** **ao** **operador** **(§17)** — **sem** **expor** **ao** **público** **um** **estado** **“a** **carregar** **próxima** **Scene”** **como** **substituto** **de** **Scene** **válida** **salvo** **decisão** **explícita** **de** **UX** **em** **ADR**.

---

# 12. Relação com mídia local

## 12.1 Uso do binding **resolvido**

O runtime **resolve** `media_id` → **ficheiro** **apenas** **via** **LocalMediaBinding** **oficial** + **workspace** **root** ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §8.4, §8.7). **Paths** **absolutos** **opacos** **fora** **da** **workspace** **normativa** **não** são **fonte** **primária**.

## 12.2 **Não** procurar mídia **fora** **do** **contrato**

**Proibido** **como** **comportamento** **padrão**: **varrer** **disco**, **adivinhar** **por** **nome** **parecido**, **substituir** **ficheiro** **sem** **atualizar** **binding** **e** **revalidar** **pre-flight** **conforme** [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §17. **Sugestões** **com** **confirmação** **explícita** **podem** **existir** **na** **fase** **de** **binding**, **não** **como** **substituto** **silencioso** **em** **`executing`**.

---

# 13. Relação com branding em tempo de execução

## 13.1 Camada de execução

Branding **atua** como **conjunto** **de** **tokens** **e** **regras** **aplicadas** **pelo** **runtime** **à** **composição** **de** **palco** (tipografia **permitida**, cores, uso de logo **conforme** Pack) — **sem** **editor** **gráfico** **no** **Player** ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §11.6).

## 13.2 O que **pode** mudar por Scene

**Apenas** **o** **que** **o** **schema** **da** Scene **e** **do** **evento** **exportados** **permitem**: **ex.** **override** **de** **slot** **visual** **fechado** **ou** **variante** **enumerada** — **não** **valores** **ad hoc** **por** **Scene** **sem** **contrato**.

## 13.3 O que **não** muda no MVP

**Biblioteca** **completa** **de** **temas** **da** **org**; **importação** **de** **novo** **tema** **durante** **`executing`**; **mudança** **de** **`branding.json`** **sem** **novo** Pack. **Tudo** **isso** **fica** **fora** **do** **runtime** **ao** **vivo**.

---

# 14. Relação com sorteio em tempo real

## 14.1 DrawConfig **acionado** **no** **contexto** **da** Scene

Quando a Scene **declara** **gatilho** **para** **`draw_config_id`**, o runtime **torna** **disponível** **a** **ação** **de** **disparo** ([UI_SPEC.md](./UI_SPEC.md) §17.2) **e** **executa** **a** **lógica** **parametrizada** **no** Pack — **sem** **duplicar** **regras** **na** **UI** **como** **fonte** **de** **verdade**.

## 14.2 Sorteio **não** **quebra** **o** **fluxo** **do** **runtime**

**Falha** **interna** **de** **sorteio** (**ex.** **lista** **vazia**, **estado** **inconsistente**) **trata-se** **como** **erro** **de** **execução** (§17): **mensagem** **ao** **operador**, **opções** **controladas** (**repetir** / **avançar** **se** **política**) — **não** **corromper** **silenciosamente** **a** **FSM** **nem** **encerar** **o** **evento** **sem** **feedback**.

---

# 15. Controles do operador

**Mínimo** **normativo** **alinhado** a [UI_SPEC.md](./UI_SPEC.md) §17.2 **e** **à** FSM.

| Controle | Função |
|----------|--------|
| **Iniciar** **execução** | De **`ready`** **para** **`executing`**; **único** **caminho** **normativo** **para** **“ao** **vivo”**. |
| **Avançar** | **Próxima** Scene **na** **ordem** **exportada** (**salvo** **“ir** **para”** **se** **política**). |
| **Voltar** | **Scene** **anterior** **se** **política** **permitir** — **não** **obrigatório** **no** MVP **salvo** **PRODUCT_SPEC**. |
| **Pausar** | **`executing` → `paused`** **se** **implementado**; **distinto** **de** **encerrar**. |
| **Retomar** | **`paused` → `executing`**. |
| **Encerrar** | **Fluxo** **para** **`finished`** **com** **confirmação** **modal** **curta** ([UI_SPEC.md](./UI_SPEC.md) §17.2). |
| **Disparar** **sorteio** | **Visível** **quando** **a** **Scene** **exige**; **não** **misturar** **com** **avanço** **sem** **intenção**. |

## 15.1 Permissões **por** estado (resumo)

| Estado | Controles **típicos** **habilitados** |
|--------|--------------------------------------|
| `idle` | Carregar Pack, sair |
| `pack_loaded` / `binding_pending` | Binding, executar pre-flight, **não** **iniciar** **show** |
| `preflight_failed` | Corrigir binding/workspace, reexecutar pre-flight |
| `ready` | **Iniciar** **execução**, reexecutar pre-flight **se** **desejado** |
| `executing` | Avançar, pausar, disparar sorteio **se** **aplicável**, encerrar |
| `paused` | Retomar, encerrar |
| `finished` | Novo Pack / reset **para** `idle` **conforme** **fluxo** |
| `blocked` | **Só** **ações** **de** **recuperação** **documentadas** (**ex.** **novo** Pack) — **sem** **“forçar** **ao** **vivo”** |

## 15.2 Inputs operacionais e duplicação de comandos

Ações **que** **avançam** **o** **roteiro** **(Scene** **seguinte)**, **iniciam** **`executing`** **a** **partir** **de** **`ready`**, **ou** **disparam** **efeitos** **irreversíveis** **no** **fluxo** **do** **evento** **devem** **ser** **protegidas** **contra** **duplicação** **acidental**: **debounce** **ou** **mecanismo** **equivalente** **documentado** (ex.: **ignorar** **segundo** **disparo** **do** **mesmo** **controlo** **dentro** **de** **uma** **janela** **curta** **após** **o** **primeiro** **aceite**).

**Norma:** **dois** **cliques** **rápidos** **no** **“avançar”** **não** **podem** **avançar** **duas** Scenes. **Valores** **de** **tempo** **ficam** **fora** **desta** **spec**; **o** **comportamento** **esperado** **é** **idempotência** **percebida** **pelo** **operador** **no** **palco**.

---

# 16. Feedback visual do Runtime

## 16.1 Scene **atual**

Nome **+** **opcional** **“N** **de** **M”** ([UI_SPEC.md](./UI_SPEC.md) §17.3).

## 16.2 **Próxima** Scene

Linha **“Próximo:”** **quando** **o** Pack **o** **permitir** **inferir** (§17.5).

## 16.3 **Status** **geral**

**Indicador** **discreto** **“ao** **vivo”** / **estado** **da** FSM **em** **linguagem** **operacional** — **sem** **alarmismo** **desnecessário** ([UI_SPEC.md](./UI_SPEC.md) §17.3).

## 16.4 **Warnings** **relevantes**

**Em** **`executing`:** **avisos** **não** **modais** **empilhados** **com** **teto** **de** **atenção** (**ex.** **um** **banner** + **fila** **acessível** — §17.3); **não** **ocultar** **erro** **bloqueante** **de** **mídia** **atrás** **de** **toast** **único** ([UI_SPEC.md](./UI_SPEC.md) §17.6, §20.9).

---

# 17. Falhas durante execução

## 17.1 Mídia **ausente** **descoberta** **tardiamente**

**Cenário:** ficheiro **removeu-se** **após** `ready`. **Tratamento:** **bloqueante** **imediato** **para** **aquela** **Scene** **ou** **para** **o** **playback** **afetado** — **overlay** / **banner** **com** **ação** **“Repetir”** / **“Pular”** **se** **política** ([UI_SPEC.md](./UI_SPEC.md) §17.6); **log** **com** `media_id` **e** **path** **relativo** **esperado**. **Não** **silêncio** **no** telão.

## 17.2 Erro **local** **de** **leitura** / I/O

**Bloqueante** **para** **a** **camada** **afetada**; **recuperação** **só** **com** **ação** **do** **operador** **ou** **revalidação** **que** **possa** **regredir** **estado** **conforme** §19.

## 17.3 Draw **inconsistente** (**ex.** **config** **corrompida** **em** **memória** **—** **improvável** **se** Pack **íntegro**)

**Bloqueante** **para** **o** **disparo**; **aviso** **operacional** **com** **código** **estável** **para** **suporte**; **não** **prosseguir** **como** **se** **sorteio** **tivesse** **ocorrido**.

## 17.4 Separação **bloqueante** **imediato** **vs** **aviso** **operacional**

| Severidade | Exemplo | Resposta |
|------------|---------|----------|
| **Bloqueante imediato** | Mídia obrigatória da Scene atual ilegível | Interromper output fiel ao roteiro até ação; não avançar sozinho salvo política explícita. |
| **Aviso operacional** | Mídia opcional ausente; degradação não crítica | Informar; permitir continuar se política do Pack / Pre-flight assim tratar opcionais. |

## 17.5 Fallback visual mínimo em falha severa

Quando a Scene **atual** **falhar** **de** **forma** **severa** — **impossibilidade** **de** **apresentar** **o** **output** **fiel** **ao** **roteiro** **(ex.** **mídia** **obrigatória** **ilegível** **e** **sem** **recuperação** **imediata** **no** **momento)** — **o** **telão** **não** **pode** **ficar** **em** **tela** **preta** **sem** **qualquer** **camada** **de** **estado** **nem** **sem** **feedback** **ao** **operador**.

**Mínimo** **normativo:**

- **Camada** **visual** **base** **com** **branding** **neutro** **ou** **tokens** **mínimos** **derivados** **do** **Pack** **(§13)** — **não** **caos** **visual**, **não** **anúncio** **promocional** **substituto**.  
- **Aviso** **discreto** **ao** **operador** **(painel** **de** **controlo)**; **no** **telão**, **se** **a** **política** **de** **palco** **exigir** **legibilidade** **mínima**, **mensagem** **curta** **e** **calma** **—** **alinhada** **a** **[UI_SPEC.md](./UI_SPEC.md)** **§17.6** **e** **postura** **premium** **do** **PRODUCT_SPEC**.

**Proibição:** **tela** **preta** **silenciosa** **como** **único** **estado** **durante** **falha** **crítica** **recuperável** **ou** **aguardando** **ação**.

---

# 18. Relação com logs locais

## 18.1 O **que** **registrar**

**Mínimo** **alinhado** a [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §17.2: carregamento de Pack **e** **resultado** **de** **integridade/licença**; **transições** **da** FSM **relevantes**; **cada** pre-flight **com** **resumo** **de** **contagens**; **ativação** **de** Scene **e** **conclusão** **de** Scene **(§9.4)** **com** **causa**; **ações** **de** **sorteio** (**nível** **compatível** **com** **privacidade**); **erros** **de** **mídia**; **entrada** **em** **fallback** **visual** **severo** **(§17.5)** **quando** **ocorrer**.

## 18.2 **Quando** **registrar**

**No** **momento** **do** **evento** **observável** (**append** **preferencial** **—** **ExecutionLog**); **rotação** **e** **retenção** **em** **spec** **derivada**.

## 18.3 Granularidade **mínima**

**Suficiente** **para** **suporte** **reproduzir** **narrativa** **operacional** **com** `export_id`, **versão** **do** Player **e** **trecho** **de** **log** ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §17.3) — **sem** **registar** **segredos** **nem** **PII** **desnecessária** **de** **participantes** ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §15.3).

---

# 19. Relação com Pre-flight **após** `ready`

## 19.1 O **que** **pode** **invalidar** `ready`

- **Mudança** **de** **binding** **ou** **substituição** **de** **ficheiro** **na** **workspace**.  
- **Novo** Pack **carregado**.  
- **Alteração** **de** **workspace** **root**.  
- **Pedido** **explícito** **de** **revalidação** **pelo** **operador** ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §17).

## 19.2 Quando o runtime **deve** **bloquear** **ou** **regredir**

**Se** **revalidação** **produzir** **bloqueantes**: **não** **permanecer** **em** **`executing`** **como** **se** **ainda** **houvesse** **garantia** **do** **último** **pre-flight** **OK** — **transição** **para** **`preflight_failed`** **ou** **estado** **que** **impõe** **correção** **antes** **de** **continuar** **show** **público** ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §5). **Fatal** **de** **integridade** **ou** **licença** → **`blocked`**.

## 19.3 **Durante** **`paused`**

**Revalidação** **não** **deve** **surpreender** **o** **operador**: **feedback** **claro** **se** **estado** **deixa** **de** **ser** **`ready`** **equivalente**.

---

# 20. Encerramento do evento

## 20.1 Quando o runtime **considera** **`finished`**

- Operador **confirma** **encerramento** **após** **última** **Scene** **ou** **em** **momento** **operacional** **aceite**; **ou**  
- **Política** **exportada** **de** **término** **automático** **do** **roteiro** **após** **última** Scene (**só** **com** **ADR** **/** **produto** **—** **com** **confirmação** **visual** **adequada**).

## 20.2 Comportamento **após** **última** Scene

**Não** **reiniciar** **roteiro** **silenciosamente** **para** **o** **início** **salvo** **ação** **explícita** **“repetir** **evento”** **se** **existir** **no** **produto**. **Predefinição:** **manter** **última** **Scene** **ou** **ecrã** **de** **fim** **controlado** **até** **reset** / **novo** Pack.

## 20.3 **Após** **`finished`**

**Telão** **e** **UI** **de** **operador** **em** **modo** **pós-evento** **claro**; **logs** **preservados**; **próximo** **passo** **visível** (**novo** **carregamento**, **sair**).

---

# 21. Anti-padrões do Runtime

1. **`executing`** **sem** **ter** **passado** **por** **`ready`** **normativo**.  
2. **Avançar** **Scenes** **sem** **ação** **do** **operador** **sem** **regra** **exportada** **documentada**.  
3. **Resolver** **mídia** **por** **heurística** **de** **nome** **em** **`executing`**.  
4. **Editar** **conteúdo** **lógico** **do** **Pack** **em** **disco** **para** **“consertar”** **palco**.  
5. **Chamar** **API** **da** **Cloud** **para** **cenas** **ou** **mídia** **no** **fluxo** **principal** **do** **show**.  
6. **Toast** **único** **como** **única** **resposta** **a** **falha** **bloqueante** **de** **mídia** **no** **telão**.  
7. **Estados** **duplicados** **só** **no** **React** **sem** **alinhar** **ao** **núcleo** **FSM**.  
8. **Sorteio** **com** **resultado** **não** **refletido** **ou** **sem** **log** **mínimo**.  
9. **Pausar** **confundido** **com** **encerrar**.  
10. **Lista** **completa** **de** **todas** **as** **Scenes** **sempre** **visível** **em** **`executing`** **sem** **menu** **“…”** ([UI_SPEC.md](./UI_SPEC.md) §17.4).  
11. **Ignorar** **expiração** **de** **licença** **no** **MVP**.  
12. **Silêncio** **visual** **no** **telão** **em** **erro** **recuperável**.  
13. **Loop** **ou** **“tick”** **contínuo** **como** **único** **motor** **de** **progressão** **sem** **eventos** **nomeados** **(§4.5)**.  
14. **Transição** **de** **Scene** **com** **estado** **intermediário** **visível** **estável** **(§11.4)**.  
15. **Preload** **que** **ativa** **a** **próxima** Scene **no** **telão** **antes** **do** **evento** **de** **transição** **(§11.5)**.  
16. **Duplo** **clique** **ou** **input** **duplicado** **avançando** **mais** **de** **uma** Scene **(§15.2)**.  
17. **Falha** **severa** **com** **telão** **vazio** **e** **sem** **fallback** **mínimo** **(§17.5)**.  
18. **Avanço** **de** **roteiro** **sem** **registo** **de** **conclusão** **da** **Scene** **anterior** **(§9.4)**.

---

# 22. Evolução futura segura

- **Auto-avanço** **entre** Scenes, **modo** **multi-telão**, **integração** **com** **hardware** **específico** — **só** **com** **ADR** **e** **revisão** **desta** **spec**.  
- **Telemetria** **opt-in**, **atualização** **de** **licença** **online** **antes** **do** **show** — **opcional** **relativamente** **ao** **núcleo** **offline** ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §4.3).  
- **SQLite** **local** **quando** **sinais** **da** **ARCHITECTURE** §15.5 **se** **verificarem** — **não** **no** MVP **obrigatório**.  
- **Novos** **tipos** **de** Scene **enumerados** — **nunca** **tipo** **“genérico”** **que** **anule** §8 **e** **EVENT_EDITOR** §6.3.

---

# 23. Critério normativo final

O **Player Runtime** é o núcleo vivo do TelaFlow no palco: interpreta apenas o que o Pack e a licença declaram; só entra em execução pública pelos caminhos da FSM e do Pre-flight; trata falhas com explicitude operacional.

Qualquer feature nova no Player que afete roteiro, estados, mídia, sorteio ou telão deve respeitar este comportamento ou exigir revisão normativa conjunta (PRODUCT_SPEC, ARCHITECTURE_SPEC, UI_SPEC, specs de domínio) e ADR quando couber.

---

*Documento interno de feature — TelaFlow. PLAYER_RUNTIME_FEATURE_SPEC v1.0.1 — eventos §4.5, conclusão de Scene §9.4, atomicidade §11.4, preload §11.5, debounce §15.2, fallback §17.5. Derivado do [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) v1.1, [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) v1.1, [UI_SPEC.md](./UI_SPEC.md) v1.0, [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) v1.1, [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) v1.1 e [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) v1.0.2.*
