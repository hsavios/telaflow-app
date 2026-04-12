# TelaFlow — Especificação Funcional do Event Editor (EVENT_EDITOR_FEATURE_SPEC)

**Versão:** 1.1  
**Status:** Documento normativo — referência para frontend, backend, modelo de interação, validações, estados e persistência do **módulo Event Editor** na TelaFlow Cloud  
**Última revisão:** 2026-04-10  
**Hierarquia normativa:** Este documento é **derivado e subordinado** a, **nesta ordem**: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md), [UI_SPEC.md](./UI_SPEC.md). Em caso de ambiguidade ou conflito, **prevalece** o documento mais acima na lista; o Event Editor **deve** ser ajustado (via revisão deste arquivo e ADR quando couber) para restabelecer alinhamento.  
**Domínio SaaS:** app.telaflow.ia.br  

---

## Prefácio

O **Event Editor** é o **ambiente de autoria** onde se define tudo o que, **exportado**, vira **TelaFlow Pack** e, no palco, **execução no Player**. Esta especificação define **comportamento funcional** e **limites** do editor — **não** implementação de código, **não** DDL. Contratos de API e schemas JSON permanecem na linha da **ARCHITECTURE_SPEC** e de `shared-contracts`; a **experiência visual** obedece à **UI_SPEC**.

---

# 1. Papel do Event Editor no produto

## 1.1 Por que é o centro do Cloud

O PRODUCT_SPEC descreve o fluxo **criar evento → configurar branding → cenas → sorteios → mídia → exportar Pack**. Com exceção de fluxos **globais** (organização, conta, auditoria), **a maior parte do valor configurável** concentra-se **dentro de um Evento**. O Event Editor é onde esse valor **toma forma**: roteiro de **Scenes**, vínculos a **mídia requerida**, **sorteios**, **branding** aplicável e **preparação para exportação**. Sem editor disciplinado, o Pack **não** pode ser promessa confiável.

## 1.2 Por que é mais importante que telas periféricas

Dashboards, listagens e configurações de organização **apoiam** o trabalho, mas **não** substituem a **definição do show**. O comprador julga o produto pela **capacidade de montar um evento exportável sem improviso**; o operador no palco sofre quando a autoria **foi vaga**. Investimento desproporcional em telas periféricas **sem** editor sólido **contradiz** o posicionamento premium (PRODUCT_SPEC §1, §9).

## 1.3 Por que precisa ser extremamente disciplinado

Disciplina **reduz** três riscos simultâneos: (1) **deriva** para canvas ou timeline (PRODUCT_SPEC §8, §11.6; ARCHITECTURE_SPEC §5.5); (2) **CRUD genérico** sem domínio (ARCHITECTURE_SPEC §13 — risco de export inconsistente); (3) **complexidade precoce** que quebra UX e QA. O editor **impõe** tipos, hierarquia e validações **para** que o export e o pre-flight no Player **tenham** o quê validar.

---

# 2. O que o Event Editor precisa resolver

| Necessidade | Como o editor contribui |
|-------------|------------------------|
| **Construir evento sem caos** | Workspace com **uma** unidade de trabalho clara (Scene), lista ordenada, validações — não formulário único interminável. |
| **Organizar Scenes** | Lista ordenável com identidade visual de cada passo; ordem = roteiro exportável. |
| **Definir fluxo visual do evento** | Sequência de Scenes **tipadas** que o Player **ativa** uma a uma (ARCHITECTURE_SPEC §5.5). |
| **Conectar branding** | Evento referencia **BrandTheme**; Scenes **herdam** tokens; sem editor gráfico livre (PRODUCT_SPEC §14.3). |
| **Conectar mídia exigida** | Scenes **referenciam** `MediaRequirement` / slots — **não** armazenam arquivo na Cloud no MVP (PRODUCT_SPEC / ARCHITECTURE_SPEC). |
| **Conectar sorteios** | **DrawConfig** no âmbito do Evento; Scene **opcionalmente** referencia gatilho — sem duplicar regras na Scene. |
| **Preparar exportação** | Estado do evento **consistente** com pré-condições do módulo de export; pendências **visíveis** antes do Pack. |

---

# 3. O que o Event Editor NÃO deve virar

| Anti-alvo | Por quê |
|-----------|---------|
| **Editor gráfico livre** | Viola categoria de produto e explosão de QA (PRODUCT_SPEC §2, §11.6). |
| **Timeline audiovisual complexa** | Não é NLE; ordem é **lista de Scenes**, não trilhas (UI_SPEC §9.5). |
| **Formulário gigante único** | Remove hierarquia; aumenta erro e fadiga. |
| **Árvore de configurações sem hierarquia** | Esconde o roteiro; prejudica export e operador. |
| **Mini PowerPoint** | Slides livres = canvas disfarçado; **proibido** na linha base. |
| **Recipiente JSON arbitrário por Scene** | Viola ARCHITECTURE_SPEC §6.7; Scene **não** é saco de dados. |

---

# 4. Unidade central do editor

## 4.1 Scene como unidade mínima de trabalho

Dentro do Event Editor, a **Scene** é a **unidade central de trabalho** do usuário: pensa-se o palco **passo a passo**, não “o evento” como blob. O **Evento** permanece unidade de **negócio** e de **export** (PRODUCT_SPEC §5.4); a **Scene** é a unidade em que **autoria e revisão** são **acionáveis**.

## 4.2 O que é Scene

**Scene** é a **unidade mínima de execução visível** no telão após export: um **estado executável** do roteiro, com composição **tipada** (ARCHITECTURE_SPEC §5.5). No editor, cada Scene é uma **linha** (ou cartão compacto) na lista mestra + **painel de edição** quando selecionada.

## 4.3 O que Scene contém (conceitualmente)

Apenas o que o **schema** de Scene permitir: referência a **mídia principal** (via `MediaRequirement` / `media_id`); **overlays** de **tipos fechados** pelo produto (MVP: quantidade e natureza **limitadas** — evolução por ADR); **slots de patrocinador** **previstos**; **gatilho opcional** de sorteio (**referência** a `DrawConfig`); metadados editoriais (nome, tipo, ordem, notas internas).

## 4.4 O que Scene não contém

- Arquivos binários de mídia do cliente.  
- Regras completas de sorteio **duplicadas** (a verdade é **DrawConfig**).  
- Layout pixel a pixel, animação keyframe livre ou árvore de nós arbitrária.  
- Caminhos absolutos de disco (ARCHITECTURE_SPEC — mídia na workspace no Player).

## 4.5 Por que Scene é unidade central

Porque o **Player** executa **por Scene**; o **Pack** serializa **lista ordenada** de Scenes; o **pre-flight** valida **consistência** desse modelo. Se o editor centrasse outra entidade (ex.: “slides” genéricos), o desalinhamento **Cloud → Pack → Player** seria **estrutural**.

---

# 5. Estrutura oficial de uma Scene no MVP

Campos **conceituais** mínimos; nomes técnicos exatos podem variar na implementação, mas **semântica** deve coincidir.

| Campo | Obrigatório | Propósito |
|-------|-------------|-----------|
| **Nome** | Sim | Identificação humana na lista e no suporte (“Intervalo — patrocinador X”). |
| **Ordem** | Sim | Posição no roteiro; determina sequência no Pack e no Player. |
| **Tipo** | Sim | Enum de tipo de Scene (seção 6); restringe campos e preview **e** guia validação. |
| **Mídia principal (opcional)** | Não | Referência a **zero ou um** `MediaRequirement` / slot adequado ao tipo; ausência pode ser válida conforme tipo. |
| **Sponsor slots (opcionais)** | Não | Referências a slots de patrocinador **previstos** pelo tipo/produto; **não** CRM. |
| **Trigger de sorteio (opcional)** | Não | Referência a **um** `DrawConfig` do mesmo Evento; ausente = Scene não dispara sorteio. |
| **Observações internas (opcional)** | Não | Texto **só** para equipa (notas de produção); **não** exportado para texto público no telão salvo decisão futura explícita no PRODUCT_SPEC. |

**Regras:** combinações **tipo × campos** inválidas entram na matriz de validação (seção 16); o backend **rejeita** persistência incoerente (ARCHITECTURE_SPEC — validação server-side).

## 5.1 Ordem persistida e renormalização

A **ordem** no roteiro **não** é apenas derivada da posição em memória de um array na sessão: **deve** existir um campo **persistido** por Scene (ex.: `sort_order` — inteiro) que define a **sequência canônica** exportada para o Pack e consumida pelo Player.

| Regra | Conteúdo |
|-------|-----------|
| **Fonte de verdade** | O valor **persistido** `sort_order` (ou equivalente) é o que o **export** e o **backend** usam; a UI **reflete** esse valor. |
| **Reorder** | Após drag-and-drop ou ação “mover para cima/baixo”, o cliente **persiste** a nova ordenação; **não** confiar só em ordem transitória na lista sem save. |
| **Renormalização controlada** | Após reordenar, o sistema **pode** reatribuir inteiros **contíguos** (1…N) ou com **gaps** (0, 10, 20…) para reduzir reescritas — decisão de implementação, mas **deve** ser **determinística** e **documentada** (uma política por produto, não ad hoc por tela). |
| **Concorrência** | Duas sessões **não** devem corromper ordem sem estratégia de versão/lock (seção 18.4). |
| **Invariante** | Para um dado Evento, `sort_order` **único** por Scene (sem empates persistidos); empate é **bug** de export. |

**Motivo:** evita “fantasmas” de ordem entre refresh, falha de rede a meio do DnD e bugs de **lista visual ≠ Pack**.

## 5.2 Lifecycle derivado da Scene (estado normativo)

O **estado de lifecycle** da Scene **não** é campo editável pelo usuário: é **sempre derivado** das **regras de validação** (seção 16) e dos **pré-requisitos mínimos** abaixo. O mesmo valor **deve** ser computável no **backend** e **espelhado** na UI (lista, inspector, export-readiness). Isto **uniformiza** lista visual, gate de export, UX e **debug** (logs e suporte falam a mesma língua).

**Estados formais (exclusivos por Scene):**

| Estado | Definição normativa | Implicação na lista / export |
|--------|---------------------|------------------------------|
| **`draft`** | Scene **ainda não** atinge o **mínimo editorial** para avaliação completa de negócio: em geral **nome** ausente ou inválido (vazio/só espaços), ou **tipo** não definido, ou registro recém-criado **antes** do primeiro commit válido desses campos. | Indicador “Rascunho”; **export** do evento **bloqueado** enquanto existir Scene em `draft` (tratada como bloqueante agregada). |
| **`blocked`** | Mínimo editorial OK, mas existe **pelo menos uma** regra **bloqueante** **a nível desta Scene** (seção 16 — ex.: tipo `draw` sem trigger, referência a `DrawConfig` ou `MediaRequirement` inexistente, combinação tipo × campo proibida). | Chip/ícone **bloqueante**; export **impossível** até resolver. |
| **`warning`** | **Nenhuma** regra bloqueante nesta Scene, mas **pelo menos um** **aviso** (seção 16 — ex.: tipo `sponsor` sem slots, política de “slot obrigatório global não referenciado” se for aviso). | Lista mostra aviso; export pode ser **permitido** ou **negado** conforme **política global do módulo export** — o estado da Scene comunica **risco local** de forma estável. |
| **`ready`** | **Nenhum** bloqueante e **nenhum** aviso aplicável a esta Scene. | Chip “Pronta”; contribui para evento **pronto para export** (outras áreas do evento podem ainda bloquear). |

**Prioridade de cálculo (de cima para baixo):** se aplicável `draft` → senão se aplicável `blocked` → senão se aplicável `warning` → senão `ready`.

**Nota:** o **lifecycle da Scene** é **ortogonal** à máquina de estados do **Player** (ARCHITECTURE_SPEC §14.0), mas a **semântica** “bloqueante / aviso / pronto” **deve** alinhar-se à linguagem do **pre-flight** e da **UI_SPEC** para o usuário não aprender dois vocabulários.

---

# 6. Tipos oficiais de Scene no MVP

## 6.1 Enum normativo inicial

Os valores **no contrato** (`shared-contracts`, JSON exportado) são **em inglês** (neutros de idioma); a **UI** pode apresentar **rótulos em português** ou outra língua.

| Chave (contrato) | Função no roteiro |
|-------------------|-------------------|
| `opening` | Marca o início do show; tipicamente mídia institucional forte ou identidade. |
| `institutional` | Bloco de conteúdo da marca/evento sem foco em sorteio ou patrocinador exclusivo. |
| `sponsor` | Momento em que **slots de patrocinador** são o foco visual principal. |
| `draw` | Momento em que um **DrawConfig** é o foco; gatilho **deve** estar presente salvo aviso de produto. |
| `break` | Transição, pausa, contagem ou loop leve — menor densidade de informação. |
| `closing` | Fecho formal; mensagem de despedida ou mídia final. |

## 6.2 Por que tipos controlados

- **UX:** o usuário **escolhe intenção**, não monta estrutura do zero — menos decisões vazias.  
- **Export:** cada tipo **mapeia** para expectativas claras no `event.json` e no runtime.  
- **Validação:** regras **por tipo** (ex.: `draw` sem trigger = incoerência).  
- **Produto:** evita **categoria errada** (mini PowerPoint) e **saco de JSON** (ARCHITECTURE_SPEC §6.7).

## 6.3 Evolução de tipos

Novos tipos **exigem** revisão desta spec + **PRODUCT_SPEC** se impactarem promessa de produto + **ADR**; **não** adicionar tipos “genéricos” que neutralizem o enum.

---

# 7. Fluxo de trabalho dentro do editor

Fluxo **operacional** ideal (não wizard obrigatório — o usuário pode saltar entre seções da subnave, mas **este** é o caminho mental recomendado):

1. **Criar evento** (metadados mínimos fora ou no topo do editor — nome, datas, org).  
2. **Associar BrandTheme** ao evento (ou confirmar padrão da org).  
3. **Criar primeira Scene** — preferencialmente via **criação rápida** (seção 7.1): **tipo** obrigatório imediato, **nome** sugerido, **foco** no campo certo; posição inicial conforme `sort_order` persistido (seção 5.1).  
4. **Ordenar Scenes** — arrastar para refletir o roteiro real; persistir `sort_order` com **renormalização controlada** (seção 5.1).  
5. **Editar cada Scene** — mídia principal, slots, trigger, conforme tipo.  
6. **Declarar MediaRequirements** (vista global ou por Scene) — slots com `media_id`, obrigatoriedade, tipo de arquivo.  
7. **Configurar DrawConfigs** no módulo de sorteios; **ligar** triggers nas Scenes adequadas.  
8. **Rever sequência** — percorrer lista como “storyboard lógico” (sem ser vídeo).  
9. **Validar consistência** — indicadores de completude (seção 17); corrigir **avisos** e **bloqueantes** de export.  
10. **Exportar Pack** — ação **fora** do núcleo do editor mas **dependente** do estado que o editor **mantém** coerente.

O editor **deve** permitir **saltos** (ex.: definir mídia global antes de fechar todas as Scenes), mas **não** **esconder** dependências (seção 10).

## 7.1 Criação rápida de Scene (“Nova Scene”)

Regra **normativa** de UX: adicionar Scene **não** pode ser um clique que deixa linha vazia sem estrutura — isso **infla** `draft` e frustra.

| Requisito | Comportamento |
|-----------|----------------|
| **Tipo obrigatório imediato** | Ao “Nova Scene”, o usuário **deve** escolher o **tipo** **antes** ou **no mesmo passo** de criação (modal compacto, step inline ou picker lateral). **Proibido** criar Scene **sem** tipo persistido. |
| **Nome sugerido** | Preencher **automaticamente** um nome editável, ex.: `{Tipo} {n+1}` (“Intervalo 3”, “Institucional 2”) com base na contagem **por tipo** ou global — política **uma** por produto, documentada. |
| **Foco automático** | Após criar, foco no **nome** (para renomear rápido) **ou** no primeiro campo incomum obrigatório do tipo — preferência MVP: **foco no nome**. |
| **Ordem** | Nova Scene recebe `sort_order` **explícito** (ex.: após a selecionada ou no fim da lista) e **persistido** na mesma ação. |
| **Estado inicial** | Tipicamente **`draft`** até nome válido + consistência mínima; depois o derivado atualiza (seção 5.2). |

Atalhos futuros (“duplicar última estrutura”) **exigem** ADR se alterarem esta regra.

---

# 8. Arquitetura visual do editor

Conforme **UI_SPEC** §15 e §9.5 — aqui **fixado** como layout **normativo** do módulo.

## 8.1 Três zonas

| Zona | Papel | Peso visual |
|------|--------|-------------|
| **Coluna de Scenes** | Lista mestra ordenável; **seleção** única (salvo modo especial futuro). | **Alta** — sempre visível em desktop; âncora do contexto. |
| **Painel principal** | Edição da Scene selecionada + preview interpretativo (seção 15). | **Máxima** — foco cognitivo. |
| **Inspector lateral (opcional)** | Metadados densos, atalhos, lista de dependências, validação resumida. | **Média** — secundário ao painel; colapsável **se** UI_SPEC permitir em breakpoints. |

## 8.2 Cabeçalho do editor

Fixo: **nome do evento**, estado de rastro (guardado / a guardar), **atalho Exportar** (abre fluxo de export, não substitui módulo export por completo). **Primeira leitura:** identidade do trabalho + confiança de persistência.

## 8.3 Prioridade de leitura

1. Nome da Scene atual + tipo.  
2. Campos **obrigatórios** ou **ausentes** para export.  
3. Preview.  
4. Detalhe fino no inspector.

## 8.4 Comportamento esperado

- Selecionar Scene na lista **atualiza** painel principal **sem** perder scroll da lista de forma desorientadora.  
- **Não** abrir modal para **cada** edição de campo trivial.

---

# 9. Lista de Scenes

## 9.1 Ordenação

- **Ordem** = ordem de execução no Player = campo **`sort_order` persistido** (seção **5.1**), **não** só ordem transitória na vista.  
- Mudança de ordem **persiste** imediatamente após gesto (sujeito a política de save — seção 18), com **renormalização** conforme política fixada.  
- **Índice visível** opcional (“3 de 12”) para orientação — o índice reflete a **ordem canônica**, não uma ordenação local de UI.

## 9.2 Seleção

- **Uma** Scene selecionada por vez no MVP.  
- Seleção **clara** (borda ou fundo) — UI_SPEC estados semânticos.

## 9.3 Drag and drop

- **Handle** de arrasto **visível**; **feedback** durante arrasto; **undo** recomendado após reordenação (nível produto: pelo menos uma ação desfazer ou confirmação opcional — decisão de UX fina sem contradizer “confiabilidade primeiro”).

## 9.4 Duplicação — política normativa de referências

Duplicar cria uma **nova** Scene (novo `scene_id`) **abaixo** da original (ou posição definida), com nome sugerido (ex.: “{Nome} (cópia)”), `sort_order` recalculado e **renormalização** se aplicável.

| Elemento | Política no MVP |
|----------|-----------------|
| **Referências a mídia principal** (`media_id` / `MediaRequirement`) | **Copiar** — a nova Scene aponta para os **mesmos** slots que a original. **Motivo:** reutilização intencional (mesma vinheta, etc.). O usuário **pode** alterar depois. |
| **Sponsor slots** | **Copiar** — mesmas referências a slots de patrocinador. |
| **Overlays tipados** (se existirem no MVP) | **Copiar** a **configuração declarativa** (mesmos tipos/parâmetros permitidos), **não** criar novas entidades de overlay fora do modelo. |
| **Trigger de sorteio** (`DrawConfig`) | **Não** duplicar a entidade **DrawConfig** (essa continua **uma** por id no Evento). **Por padrão:** **copiar a referência** (mesmo `draw_config_id`) **somente** após **confirmação explícita** na UI (modal ou passo de duplicação): explicar que **duas Scenes** passarão a **compartilhar** o mesmo sorteio no roteiro e que o operador no palco **deve** saber **qual** momento dispara. **Alternativa** oferecida ao usuário: **“Duplicar sem gatilho”** (referência **limpa** na cópia). **Proibido** copiar trigger **sem** o usuário ver o aviso — evita erro silencioso em eventos com múltiplas Scenes `draw`. |
| **Notas internas** | **Copiar** texto **ou** limpar — política **uma**; recomendado MVP: **copiar** para contexto de produção. |

**Cena tipo `draw` duplicada com trigger mantido:** cumpre a tabela acima (aviso **obrigatório** se mantiver referência).

## 9.5 Exclusão — sem cascata em entidades donas

- **Excluir Scene** remove **apenas** o registro da Scene e os **vínculos** dessa Scene (referências a mídia, patrocínio, trigger).  
- **Nunca**, no MVP, **excluir automaticamente** **DrawConfig** nem **MediaRequirement** por cascata a partir da exclusão de Scene. Essas entidades pertencem ao **Evento** ou ao catálogo de slots do evento; outras Scenes ou o manifesto global **podem** ainda precisar delas.  
- **Efeito:** pode ficar **DrawConfig** “órfão” de uso no roteiro (aceitável — limpeza **manual** ou política futura de “sorteios não referenciados” como **aviso** na vista de sorteios). **Nunca** apagar silenciosamente sorteio ou slot de mídia.  
- **Confirmação** na UI se a Scene tiver trigger ou slots preenchidos; microcopy **operacional** (UI_SPEC §14), listando o que **não** será apagado (DrawConfig / slots permanecem).

## 9.6 Estados visuais por linha (lifecycle derivado)

A lista **deve** exibir o **lifecycle** da seção **5.2**, **não** apenas “completo/incompleto” genérico:

| Lifecycle | Tratamento visual (UI_SPEC alinhado) |
|-----------|--------------------------------------|
| `draft` | Rótulo “Rascunho”; cor/ícone **neutro** ou secundário. |
| `blocked` | **Bloqueante** — ícone + texto “Bloqueada” ou causa curta; **nunca** só cor vermelha. |
| `warning` | Aviso discreto na linha + detalhe no painel. |
| `ready` | “Pronta” ou ausência de alerta + opcional check discreto. |

**Tipo** de Scene — label ou ícone **funcional** (legenda obrigatória). **Ordem** — número ou posição coerente com `sort_order`.

## 9.7 Limite saudável de Scenes no MVP (orientação)

O MVP **assume** eventos de **média complexidade** com **até da ordem de ~24–48 Scenes** com lista **fluida** (scroll, DnD) **sem** exigência formal de virtualização. **Acima** desta ordem de grandeza, **degradação** de performance de UI torna-se **provável**; **virtualização** da lista (ou paginação **dentro** do editor) passa a **recomendação forte** e **deve** ser tratada em roadmap técnico com **ADR**. O número **exacto** **não** é hard limit de produto nesta versão da spec — **comunicar** a equipa que testes de usabilidade **devem** incluir roteiros longos.

## 9.8 Evitar caos visual

- **Não** mostrar todos os campos da Scene na lista — só **nome**, **tipo**, **ordem**, **lifecycle** (5.2).  
- **Limite** de altura com scroll **interno** só se necessário; preferir lista com altura confortável da página; acima do limite orientador (9.7), **virtualizar**.

---

# 10. Painel principal de edição

## 10.1 Ao selecionar uma Scene

Exibir **em blocos** (fieldsets semânticos — UI_SPEC §8.5):

1. **Identidade:** nome, tipo (tipo pode ser somente leitura após criação **se** produto quiser reduzir erros — decisão: **editável** com aviso de impacto **ou** imutável após criação; MVP recomendado: **permitir** mudança de tipo **com** validação que **limpe** campos incompatíveis **ou** bloqueie com mensagem).  
2. **Conteúdo visual:** mídia principal (picker de **slot** / `MediaRequirement`), overlays permitidos pelo tipo.  
3. **Patrocínio:** slots **se** tipo ou produto permitir.  
4. **Sorteio:** selector de `DrawConfig` **existente** no evento (criar novo sorteio **via** atalho para módulo de sorteios, **não** inventar regras inline).  
5. **Notas internas** (colapsável).

## 10.2 Excesso de informação

- Campos **irrelevantes ao tipo** **ocultos** ou **desativados** com explicação curta (“Não aplicável a intervalo”).  
- **Progressive disclosure:** overlays avançados **atrás** de “Mostrar opções” se raros.

## 10.3 Dependências

- Se um slot de mídia **ainda não** existe na lista global de `MediaRequirements`, **mostrar** call-to-action **“Criar slot”** ou link para vista de mídia — **não** falhar em silêncio.  
- Se `DrawConfig` referenciado **for removido**, Scene entra em estado **incoerente** — **bloqueante** ou **aviso** forte (seção 16).

---

# 11. Inspector lateral

## 11.1 Quando existe

- **Desktop:** recomendado **sempre** disponível (colapsável) para **metadados** e **validação** da Scene selecionada.  
- **Largura estreita:** fundir inspector no painel principal **por abas** — **sem** duplicar lista de Scenes no inspector (UI_SPEC §9.4).

## 11.2 Quando não existe (ou está colapsado)

- **Mobile / breakpoint baixo:** conteúdo do inspector **integrado** no painel por **tabs** ou **accordion**.

## 11.3 Que informação vai no inspector

- **IDs** legíveis (`scene_id` interno, `media_id` ligados).  
- **Resumo de validação** e **lifecycle** derivado (`draft` / `blocked` / `warning` / `ready` — seção 5.2).  
- **Atalhos:** “Ir para mídia”, “Ir para sorteio”.  
- **Histórico** de alterações **não** obrigatório no MVP — se existir, spec separada.

**Não** colocar no inspector: **preview principal** (fica no painel); **lista de Scenes**.

---

# 12. Relação entre Scene e branding

## 12.1 Herança

O **Evento** referencia **BrandTheme** (snapshot no export — ARCHITECTURE_SPEC §6.5). **Todas** as Scenes **herdam** tokens (cores, tipografia permitida, regras de marca) **no preview interpretativo** e na **semântica** do Pack.

## 12.2 Sobrescrita no MVP

- **Sem** paleta livre por Scene no MVP salvo **ADR** e PRODUCT_SPEC §14.3.  
- **Permitido:** variáveis **já previstas** no tema (ex.: “fundo alternado” **se** o tema exportar essa opção como enum) — **não** cor hexadecimal livre por Scene na linha base.

## 12.3 O que não é livre

- Logo **upload** na Cloud para composição livre — fora do MVP de mídia na Cloud.  
- Tipografia **fora** do conjunto do BrandTheme.

---

# 13. Relação entre Scene e mídia

## 13.1 Scene não guarda arquivo

A Cloud **não** armazena blobs de mídia do cliente no MVP (ARCHITECTURE_SPEC §8). A Scene **nunca** contém binário.

## 13.2 Scene referencia MediaRequirement

A mídia “desta Scene” é **sempre** uma **referência** a um **slot** declarado: `media_id`, papel, obrigatoriedade, tipo esperado. O **manifesto** agrega todos os slots do evento; o Player **faz binding** local.

## 13.3 Scene declara necessidade

Ao escolher “mídia principal”, o usuário **escolhe** um requisito **já** definido **ou** é guiado a **criar** requisito — a Scene **declara** **uso**, não **inventa** arquivo. **Vários** tipos de Scene podem **compartilhar** o mesmo `media_id` (ex.: vinheta repetida) — **consciente** e visível na lista global de mídia.

---

# 14. Relação entre Scene e sorteio

## 14.1 Modelo mental

- **DrawConfig** pertence ao **Evento** (dono lógico — ARCHITECTURE_SPEC §6.8).  
- **Scene** **opcionalmente** contém **referência** a **um** DrawConfig = “neste momento do roteiro, este sorteio pode ser **disparado** no Player”.

## 14.2 Como aparece no editor

- No painel da Scene: **dropdown** ou lista de sorteios **já** criados + **“Gerir sorteios…”** (navega para subárea ou painel).  
- Na lista de Scenes: **ícone ou rótulo** “Sorteio” quando trigger presente.

## 14.3 Evitar acoplamento confuso

- **Não** editar regras de pool, pesos ou participantes **dentro** do painel da Scene — só **ligação**.  
- Tipo **sorteio** **sem** trigger = **incoerência** tratada na validação (seção 16).

---

# 15. Preview dentro do editor

## 15.1 Preview é interpretativo

Mostra **intenção**: template fixo + tokens de branding + **placeholder** ou **thumbnail** do slot (se a Cloud no futuro permitir preview por URL, **fora** do MVP de armazenamento — até lá, **nome do slot** + tipo + ícone).

## 15.2 Preview não é render final

**Não** garante pixel-identidade ao Player (hardware, resolução, fontes instaladas no palco). Texto na UI do editor **deve** declarar **implicitamente** (microcopy curta): aproximação para **autoria**.

## 15.3 Intenção visual

Comunica **hierarquia** (mídia principal vs overlay), **presença** de patrocinador, **momento** de sorteio — **sem** simular animação final complexa.

## 15.4 Não simula Player completo

**Sem** pre-flight, **sem** binding local, **sem** segunda tela, **sem** estado `executing`. **Proibido** prometer “exatamente como no telão” no MVP.

---

# 16. Validações do editor

Validações **no cliente** para UX; **no servidor** para verdade (ARCHITECTURE_SPEC). Severidade alinhada a **export** e PRODUCT_SPEC. Cada regra **alimenta** o **lifecycle derivado** da Scene (seção **5.2**): bloqueantes → `blocked` (quando mínimo editorial satisfeito); avisos sem bloqueantes → `warning`; limpeza total → `ready`; mínimo não satisfeito → `draft`.

## 16.1 Lista de regras (exemplos normativos)

| Condição | Severidade |
|----------|------------|
| Scene **sem nome** | **Bloqueante** para export (ou nome padrão **proibido** — preferir forçar nome). |
| Scene **sem tipo** | **Bloqueante** — tipo obrigatório. |
| **Ordem** duplicada ou buracos | **Bloqueante** ou **auto-correção** com log — **não** exportar ordem ambígua. |
| Tipo **sorteio** **sem** trigger | **Bloqueante** para export (ou **aviso** forte se produto permitir sorteio só por outro mecanismo — MVP: **bloqueante**). |
| Trigger referencia DrawConfig **inexistente** | **Bloqueante**. |
| Mídia principal referenciada **inexistente** | **Bloqueante**. |
| Slot **obrigatório** global **não** usado em nenhuma Scene | **Aviso** (pode ser intencional para pre-flight no Player) **ou** **bloqueante** por política de produto — MVP recomendado: **aviso** na vista mídia + **bloqueante** no export **se** política “todo obrigatório referenciado”. |
| Tipo **patrocinador** **sem** slots | **Aviso** ou **bloqueante** conforme PRODUCT_SPEC — MVP: **aviso**. |
| Overlay **não** permitido para o tipo | **Bloqueante** na persistência. |
| Scene com **nota interna** apenas | **Nunca** bloqueante — notas são opcionais. |

## 16.2 Aviso vs bloqueante

- **Aviso:** permite **guardar** e **continuar** edição; **export** pode ou não ser permitido — **regra de negócio** unificada com módulo **export** (seção 19). Contribui para lifecycle **`warning`** quando não há bloqueantes na Scene.  
- **Bloqueante:** **impede export** até resolução; UI **deve** mostrar **contagem** e **lista** (UI_SPEC — nunca só toast). Contribui para lifecycle **`blocked`** (ou evento agregado bloqueado se existir `draft`).  
- **Pré-requisitos mínimos** (nome/tipo): contribuem para **`draft`** até cumpridos.

## 16.3 Mapeamento regra → lifecycle (resumo)

| Situação na Scene | Lifecycle resultante (após avaliar prioridade 5.2) |
|-------------------|---------------------------------------------------|
| Nome inválido/ausente ou tipo ausente | `draft` |
| Mínimo OK + qualquer bloqueante de 16.1 | `blocked` |
| Mínimo OK + zero bloqueantes + ≥1 aviso | `warning` |
| Mínimo OK + zero bloqueantes + zero avisos | `ready` |

---

# 17. Estado de completude do evento

## 17.1 Indicador de progresso

**Uma** área compacta (barra ou checklist **resumida**): ex. “Scenes: 8”, contagens por lifecycle **“Prontas: 5 / Avisos: 2 / Bloqueadas: 1 / Rascunho: 0”** (derivadas de 5.2), “Sorteios: 2”, “Slots obrigatórios: 5/5 referenciados”, “Bloqueantes globais: 1”. **Não** duplicar **todo** o painel de validação.

## 17.2 Pendências sem poluir

- **Chip** ou **linha** no cabeçalho: “1 bloqueante” com **link** “Ver”.  
- **Lista** completa **só** ao expandir ou na vista **Revisão** (subárea opcional do editor ou passo do export).

## 17.3 Alinhamento com operação

O comprador **vê** disciplina; o editor **não** esconde que o evento **não** está pronto para Pack.

---

# 18. Salvamento e persistência

## 18.1 Auto-save vs explícito

**Norma MVP:** **auto-save** com **debounce** após alterações + indicador **“Guardado” / “Salvando…”** no cabeçalho (UI_SPEC — feedback explícito). **Botão “Guardar”** explícito **opcional** como **reassurance** e para usuários com rede instável — **não** substitui persistência automática se auto-save for adotado.

## 18.2 Quando persistir

- Alteração de **ordem** de Scenes.  
- Alteração de **campos** da Scene.  
- Criação/remoção de Scene.  
- Alterações que afetem **consistência** com DrawConfig ou MediaRequirements (cascata **validada** no servidor).

## 18.3 Evitar perda

- **Bloqueio** de navegação com alterações **não** guardadas **se** auto-save falhar (erro de rede).  
- **Retry** com mensagem **clara** — PRODUCT_SPEC confiabilidade.

## 18.4 Edição concorrente (futuro)

**Fora** do contrato MVP detalhado: exige **ADR** — opções: **locking** otimista com versão (`updated_at`), **merge** guiado, ou **avisar** segundo editor. **Não** implementar silenciosamente “last write wins” sem decisão documentada.

---

# 19. Relação com exportação do Pack

## 19.1 O editor produz estado exportável

O aggregate do Evento (Scenes ordenadas, referências, BrandTheme resolvido, DrawConfigs existentes, MediaRequirements completos) **deve** ser **serializável** sem ambiguidade para o módulo **export** (ARCHITECTURE_SPEC §9, §13).

## 19.2 O que o export exige do editor

- **Zero** bloqueantes da matriz acordada (seção 16 + regras do módulo export).  
- **Identificadores** estáveis (`scene_id`, `media_id`, `draw_config_id`) **gerados** na Cloud **antes** ou no momento da criação da entidade — **não** reescrever ids ao exportar salvo migração versionada.  
- **Ordem** de Scenes **explícita** via `sort_order` persistido (seção 5.1), **não** inferida só pela sessão.  
- **Snapshot** de branding **coerente** com PRODUCT_SPEC.

## 19.3 O que o editor não faz

**Não** assina Pack, **não** gera `pack_version` sozinho — **orquestra** dados; **export** **valida** schema e chama **licensing** (ARCHITECTURE_SPEC).

---

# 20. Anti-padrões do editor

1. Campo livre “JSON” ou “HTML” por Scene.  
2. Timeline com **trilhas** como NLE.  
3. Criar **DrawConfig** inline com **dezenas** de parâmetros na mesma vista da Scene.  
4. Lista de Scenes com **todos** os campos expandidos.  
5. Preview **fullscreen** que **oculta** contexto do evento **sem** saída clara.  
6. **Toast** como único feedback de **bloqueante** de export.  
7. Permitir export **silencioso** com Scenes **vazias** de significado.  
8. **Reordenar** sem persistir ou sem feedback.  
9. **Duplicar** Scene com **compartilhamento do trigger** de sorteio **sem** aviso explícito na UI nem opção **“Duplicar sem gatilho”** (viola seção 9.4).  
10. Ignorar validação **server-side** porque “o cliente já validou no browser”.  
11. Ordenar Scenes **só** por posição em memória **sem** campo **`sort_order` persistido** e política de **renormalização** (viola seção 5.1).  
12. **Excluir Scene** com **cascata** automática sobre **DrawConfig** ou **MediaRequirement** (viola seção 9.5).  
13. Expor campo editável pelo usuário para **“estado da Scene”** em desacordo com o **lifecycle derivado** (viola seção 5.2).  
14. **“Nova Scene”** sem **tipo** obrigatório no momento da criação (viola seção 7.1).

---

# 21. Evolução futura segura

## 21.1 O que pode evoluir (com ADR + revisão desta spec)

- **Novos tipos** de Scene **específicos** (ex.: “Q&A”) **se** fechados no enum.  
- **Mais overlays** tipados — **não** overlay arbitrário.  
- **Preview** enriquecido (still gerado, frame de vídeo local **no Player** — não confundir com Cloud).  
- **Comentários** colaborativos, **versões** de rascunho do evento.  
- **Templates** de evento (estrutura de Scenes pré-preenchida).

## 21.2 O que não deve entrar cedo

- Canvas livre, keyframes, **motor** de animação genérico.  
- **Edição** concorrente **sem** modelo de conflito.  
- **Upload** de mídia na Cloud **sem** revisão completa de PRODUCT_SPEC e ARCHITECTURE_SPEC.  
- **Lógica de sorteio** **dentro** da Scene.

---

# 22. Critério normativo final

O **Event Editor** é **núcleo** da TelaFlow Cloud: **toda** implementação de autoria de evento **deve** obedecer esta especificação. Features novas que **touched** Scenes, mídia, sorteios, branding ou export **devem** ser avaliadas contra **PRODUCT_SPEC**, **ARCHITECTURE_SPEC**, **UI_SPEC** e **este documento**; desvios **relevantes** exigem **revisão normativa** explícita (e **ADR** quando alterarem contrato ou comportamento exportável).

---

*Documento interno de feature — TelaFlow. Derivado do PRODUCT_SPEC v1.1, ARCHITECTURE_SPEC v1.1 e UI_SPEC v1.0. EVENT_EDITOR_FEATURE_SPEC v1.1 — lifecycle derivado, ordem persistida, duplicação/exclusão normativas, criação rápida, limite orientador de Scenes.*
