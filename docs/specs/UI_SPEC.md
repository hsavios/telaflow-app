# TelaFlow — Especificação de Interface e Experiência (UI_SPEC)

**Versão:** 1.0  
**Status:** Documento normativo — referência para design, UX, frontend visual e consistência entre Cloud e Player  
**Última revisão:** 2026-04-10  
**Hierarquia normativa:** Este documento é **derivado e subordinado** ao [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) e ao [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md). Em caso de ambiguidade ou conflito, **prevalecem**, nesta ordem, o **PRODUCT_SPEC** e o **ARCHITECTURE_SPEC**; a interface deve ser ajustada (via revisão deste arquivo e registro de decisão) para restabelecer alinhamento.  
**Domínio SaaS principal:** app.telaflow.ia.br  

---

## Prefácio

A interface do TelaFlow **materializa** decisões de produto e de arquitetura em **forma perceptível**. Ela não é “pele” opcional: **reduz risco operacional**, comunica **estado** (incluindo a máquina de estados do Player definida na ARCHITECTURE_SPEC) e sustenta o posicionamento **premium** descrito no PRODUCT_SPEC. Este documento **não** substitui um design system implementado (tokens em código, biblioteca de componentes), mas **define** o que esse sistema **deve** honrar.

**Escopo:** experiência de usuário, arquitetura de informação, linguagem visual, componentes e padrões de feedback — **sem código**.

---

# 1. Objetivo da interface

## 1.1 Papel da interface no TelaFlow

A interface tem três papéis simultâneos:

1. **Instrumento de autoria e governança (Cloud)** — Permitir que equipes configurem **eventos**, **cenas**, **sorteios**, **mídia requerida**, **branding** e **exportação** com clareza, sem transformar o produto em estúdio gráfico livre (PRODUCT_SPEC §14.3).  
2. **Instrumento de execução confiável (Player)** — Conduzir o operador pelo **carregamento do Pack**, **binding**, **pre-flight** e **execução**, em conformidade com os estados formais `idle` … `blocked` (ARCHITECTURE_SPEC §14.0).  
3. **Linguagem comum entre comprador e operador** — Vocabulário, status e hierarquia **consistentes** para suporte, auditoria e confiança comercial.

## 1.2 Por que não pode ser genérica

Interface genérica de “SaaS dashboard” **colide** com o PRODUCT_SPEC: o TelaFlow **não** é painel de métricas nem sorteador isolado. Cada tela **deve** responder à pergunta: *isto reduz improviso de palco ou risco no telão?* Se não responder, a solução visual está **equivocada**, por mais polida que pareça.

## 1.3 Reforço de confiabilidade, clareza e valor premium

- **Confiabilidade** aparece como **estados explícitos**, **mensagens acionáveis** e **ausência de surpresa** (nada “funciona até falhar” sem aviso).  
- **Clareza** aparece como **hierarquia editorial** — um foco principal por visão, não dez pesos iguais.  
- **Premium** aparece como **sobriedade disciplinada**, **ritmo** e **precisão**, não como brilho ou animação excessiva (seção 4).

## 1.4 Redução de risco operacional

A UI **antecipa** falhas: checklist de mídia, pre-flight com **bloqueantes** visíveis, distinção inequívoca entre **aviso** e **impeditivo**, e **proibição** de esconder dependências críticas (licença, `pack_version`, mídia obrigatória). O operador no palco **não** deve descobrir o problema no primeiro frame do telão.

---

# 2. Princípios de UX do TelaFlow

### 2.1 Clareza operacional acima de decoração

Cada elemento visual **serve** à tarefa (configurar, validar, executar). Decoração que não melhora **leitura**, **ordem de ações** ou **estado do sistema** é **candidata a remoção**.

### 2.2 Baixa carga cognitiva no momento crítico

No **Player**, em `executing`, a carga cognitiva **deve** ser mínima: poucos controles, **uma** leitura dominante (cena atual / estado ao vivo), ações secundárias **relegadas** ou agrupadas. Na Cloud, a carga pode ser maior **fora** do fluxo de export — mas o caminho até “exportar Pack válido” **deve** ser linear e revisável.

### 2.3 Hierarquia forte sempre

Título de tela → subtítulo ou contexto → conteúdo principal → ações primárias → secundárias. **Nunca** apresentar grid de cards homogêneos sem **um** elemento que comande a atenção quando há decisão ou risco.

### 2.4 Feedback explícito sempre

Toda ação com efeito colateral relevante (exportar, revalidar, iniciar execução) **deve** ter **confirmação perceptível** (estado da UI, não só toast). Estados de sistema (carregando, sucesso parcial, erro) **não** podem ser inferidos por omissão.

### 2.5 Controle visível, não mágico

Preferir **mostrar** o que o sistema assumiu (workspace, Pack carregado, último pre-flight) a “corrigir” silenciosamente. Automação **documentada** na UI supera automação oculta.

### 2.6 Visual com intenção, não vitrine

A interface **comunica** disciplina de produto: templates, tokens, manifesto — alinhado ao princípio de **composição controlada** (PRODUCT_SPEC §11.6). Não é vitrine de efeitos nem portfólio de componentes.

### 2.7 Consistência entre Cloud e Player

**Mesma semântica** para: bloqueante vs. aviso, “pronto para executar”, identidade do evento/Pack, códigos de erro de alto nível. **Mesma família tipográfica e lógica de cor semântica** (com adaptação de densidade — seção 18).

### 2.8 Informação certa na hora certa

**Progressive disclosure:** na Cloud, detalhes de sorteio ou patrocinador **não** competem com a lista de cenas quando o foco é ordem do roteiro. No Player, logs técnicos **não** competem com pre-flight **até** o operador solicitar ou até modo suporte.

### 2.9 Densidade equilibrada

Telas de **lista e revisão** (eventos, mídia, auditoria) podem ser mais densas. Telas de **decisão** (export, pre-flight, go live) **respiram** — mais espaço, menos competição visual.

### 2.10 Silêncio visual como recurso de sofisticação

Áreas **sem** conteúdo útil **devem** ser calmas (fundo estável, sem textura ruidosa). O premium aqui é **retenção de atenção**, não preenchimento de pixels.

---

# 3. Linguagem visual oficial do produto

## 3.1 Sensação geral

A interface deve parecer **ferramenta profissional madura** — próxima de software de produção, engenharia ou finanças de alto padrão, **não** de consumer app ruidoso nem de template de “startup genérica”. Sensação: **peso**, **ordem**, **calma**.

## 3.2 Sobriedade e sofisticação

- **Sobriedade:** paleta contida; superfícies predominantemente neutras; cor **semântica** reservada a estado e ênfase.  
- **Sofisticação:** vem de **tipografia**, **alinhamento**, **microespaçamento** e **ritmo** — não de gradientes ou sombras dramáticas.

## 3.3 Premium sem futurismo gratuito

Evitar visual “sci-fi” (neon, grids animados de fundo, copy futurista). O premium do TelaFlow é **operacional**: “sabemos o que é palco sério”. Uma **linha** de acento (cor primária) e **estados** bem desenhados bastam.

## 3.4 Ferramenta séria, não dashboard genérico

Evitar o clichê: sidebar + 12 cards de KPI + gráfico decorativo. O Cloud **organiza trabalho em torno de Eventos e Packs**, não em torno de “widgets”. Se um gráfico existir no futuro, **deve** responder a pergunta de governança ou uso — não preencher layout.

## 3.5 Atributos a transmitir

| Atributo | Como traduzir na UI |
|----------|---------------------|
| **Precisão** | Alinhamentos, números e datas legíveis, labels que nomeiam o objeto real (`export_id`, evento, org). |
| **Confiança** | Estados honestos; erros sem culpar o usuário genericamente; confirmação de export e pre-flight. |
| **Presença** | Tipografia com peso adequado em títulos; área principal clara. |
| **Fluidez** | Transições **curtas** e **funcionais**; sem animação que atrase tarefa. |
| **Disciplina visual** | Poucos estilos de card; grid consistente; sem fontes decorativas. |

---

# 4. Como evitar “cara de feito com IA”

## 4.1 O que evitar e por quê

| Sintoma | Por que deteriora o produto |
|---------|----------------------------|
| **Excesso de gradientes** | Parece template; compete com hierarquia; envelhece rápido. |
| **Excesso de glow / sombra difusa** | Reduz legibilidade; associa a gamer ou marketing agressivo. |
| **Excesso de cards** | Grid homogêneo = **sem** prioridade; “bonito” mas **inútil** para decisão. |
| **Ícones decorativos** | Poluem; diluem ícones que **deveriam** ser funcionais. |
| **Labels irrelevantes ou genéricos** | “Informações”, “Detalhes”, “Configurações avançadas” sem objeto — tom de placeholder. |
| **Repetição artificial de blocos** | Padrão de IA: três colunas idênticas com ícone + título + frase vaga. |
| **Dashboard bonito sem hierarquia** | Contradiz princípio operacional; frustra comprador e operador. |
| **Baixa intenção editorial** | Tudo com mesmo peso = ninguém sabe por onde começar. |
| **Microcopy genérico** | “Algo deu errado”, “Sucesso!”, “Bem-vindo de volta” sem contexto — destrói confiança. |
| **Futurista gratuito** | Desconecta do chão de evento corporativo. |

## 4.2 O que fazer no lugar

- **Ritmo visual:** alternar zonas de densidade (lista densa → área de decisão espaçosa).  
- **Contraste controlado:** hierarquia por **peso tipográfico** e **escala**, não só por cor saturada.  
- **Composição intencional:** uma **coluna principal** ou **painel principal** óbvio.  
- **Espaço como recurso:** margens generosas **onde há decisão** (export, pre-flight, go live).  
- **Componentes com função clara:** botão com verbo operacional (“Exportar Pack”, “Executar checagens”).  
- **Menos elementos, mais peso:** um resumo forte em vez de seis fracos.  
- **Densidade desenhada:** tabelas e listas **quando** a tarefa é varredura; não cards para cada linha sem motivo.  
- **Tipografia com autoridade:** uma família bem escolhida (sans humanista ou neo-grotesca de qualidade); escala limitada de tamanhos.

---

# 5. Arquitetura de informação do TelaFlow Cloud

Cada área abaixo **deve** mapear para navegação e prioridade visual **coerentes** com o módulo de backend (ARCHITECTURE_SPEC §13), sem expor CRUD cru como “tela única genérica”.

### 5.1 Dashboard

- **Objetivo:** ponto de entrada **orientado a ação** — eventos recentes, exportações recentes, alertas de rascunho incompleto (se aplicável).  
- **Frequência:** alta ao login.  
- **Prioridade visual:** **lista ou tabela** de eventos + atalho claro “Criar evento”; **não** parecer painel de analytics vazio.  
- **Navegação:** atalhos para Eventos, Organização, Auditoria.  
- **Primeiro plano:** próximos eventos / última atividade **relevante** ao tenant.  
- **Evitar:** cards de “estatísticas” sem dados reais no MVP.

### 5.2 Organizações

- **Objetivo:** contexto do tenant, membros, papéis, temas de marca da org (se aplicável).  
- **Frequência:** média (admin).  
- **Prioridade:** formulários claros; **segurança** e membros em destaque para admin.  
- **Navegação:** item de primeiro nível ou subárea de configurações — **não** esconder demais.  
- **Evitar:** poluir com preferências de produto irrelevantes.

### 5.3 Eventos

- **Objetivo:** inventário do trabalho — **Event** como unidade central (PRODUCT_SPEC §5.4, §14.1).  
- **Frequência:** muito alta.  
- **Prioridade:** tabela ou lista **escaneável** com estado (rascunho / pronto para export / último export).  
- **Navegação:** clique leva ao **editor do evento** ou a visão resumo + CTA “Continuar edição”.  
- **Evitar:** grid de capas genéricas sem estado operacional.

### 5.4 Editor do evento

- **Objetivo:** configurar **todo** o evento antes do Pack — coração do Cloud (seção 15 desta spec).  
- **Frequência:** muito alta para editors.  
- **Prioridade:** **máxima**; layout de workspace com subnavegação clara.  
- **Evitar:** timeline confusa ou canvas livre (PRODUCT_SPEC §14.3).

### 5.5 Cenas

- **Objetivo:** ordenar e configurar **Scenes** como **unidades mínimas executáveis** (ARCHITECTURE_SPEC §5.5) — não saco de conteúdo.  
- **Frequência:** alta no editor.  
- **Prioridade:** lista ordenável **explícita** + painel de detalhe da Scene selecionada.  
- **Evitar:** misturar edição de cena com sorteio sem hierarquia.

### 5.6 Sorteios

- **Objetivo:** **DrawConfigs** do evento; regras e visualização pública **declarativas**.  
- **Frequência:** média/alta conforme evento.  
- **Prioridade:** formulário estruturado; ligação **visível** à Scene quando houver gatilho.  
- **Evitar:** UI de “jogo” ou animação promocional na Cloud.

### 5.7 Patrocinadores

- **Objetivo:** cadastro e uso de **Sponsors** e slots ligados a mídia/cenas.  
- **Frequência:** média.  
- **Prioridade:** clareza de **onde** o patrocinador aparece no roteiro.  
- **Evitar:** CRM pesado; manter enxuto.

### 5.8 Branding

- **Objetivo:** **BrandTheme** / tokens — cores, tipos permitidos, regras de logo (PRODUCT_SPEC §14.3).  
- **Frequência:** média.  
- **Prioridade:** **preview** do token aplicado a um template fixo, não editor livre.  
- **Evitar:** simulador de identidade infinita.

### 5.9 Requisitos de mídia

- **Objetivo:** **MediaRequirements** e checklist — manifesto antes do arquivo (ARCHITECTURE_SPEC §8).  
- **Frequência:** alta.  
- **Prioridade:** tabela de slots com obrigatoriedade, tipo, `media_id`, vínculo a Scene quando aplicável.  
- **Evitar:** upload na Cloud no MVP — UI **não** deve sugerir que o arquivo “foi para o servidor” se não foi.

### 5.10 Exportação de Pack

- **Objetivo:** fechar snapshot, validar pré-condições, gerar artefato e registro (**ExportPackage**).  
- **Frequência:** pontual por evento, **altíssima importância**.  
- **Prioridade visual:** **máxima** — tela ou painel com **resumo**, **validações** e **confirmação** explícita.  
- **Evitar:** botão único sem resumo do que está sendo exportado.

### 5.11 Licenciamento

- **Objetivo:** visão **comercial/operacional** do que será selado no Pack (escopo, validade) — sem substituir sistema de billing se externo.  
- **Frequência:** baixa/média (configuração e revisão).  
- **Prioridade:** texto **preciso**, datas e ids legíveis.  
- **Evitar:** jargão vago (“plano ativo” sem definir evento/export).

### 5.12 Auditoria / logs

- **Objetivo:** trilha de **exportações** e eventos críticos (PRODUCT_SPEC §7, §14.5).  
- **Frequência:** baixa até incidente — aí **crítica**.  
- **Prioridade:** tabela **filtrável**, correlacionável por `export_id`, evento, usuário, tempo.  
- **Evitar:** log bruto ilegível sem colunas semânticas.

---

# 6. Arquitetura de informação do TelaFlow Player

Áreas **devem** refletir a **máquina de estados** (ARCHITECTURE_SPEC §14.0): a UI **mostra** o estado atual e **só** oferece ações válidas naquele estado.

### 6.1 Abertura / carregamento do Pack

- **Objetivo:** `idle` → seleção de arquivo/diretório → `pack_loaded` ou `blocked`.  
- **Urgência:** preparação pré-evento — alta, mas sem pressão de “ao vivo”.  
- **Feedback:** progresso de leitura; **erro** com causa (formato, assinatura, versão).  
- **Visível:** nome do Pack, `pack_version`, evento, org (se claims permitirem).  
- **Oculto:** detalhes de parse até falha ou modo avançado.

### 6.2 Validação de licença

- **Objetivo:** integridade + tempo + escopo; pode resultar em `blocked`.  
- **Urgência:** alta antes do show.  
- **Feedback:** **bloqueante** claro (“Licença expirada”, “Pack alterado”); **nunca** toast único.  
- **Visível:** validade em texto humano + aviso de **relógio local** quando relevante (ARCHITECTURE_SPEC §16.4).  
- **Oculto:** chaves públicas ou detalhes criptográficos — opcional em “detalhes técnicos” colapsados.

### 6.3 Binding de mídia

- **Objetivo:** `binding_pending` → mapa `media_id` → arquivos na workspace.  
- **Urgência:** alta.  
- **Feedback:** lista de slots com estado (ok / faltando / tipo incorreto); ações **por slot** ou import em lote assistido.  
- **Visível:** progresso “X de Y obrigatórios resolvidos”.  
- **Oculto:** paths absolutos; mostrar **relativo à workspace**.

### 6.4 Pre-flight

- **Objetivo:** consolidar bloqueantes e avisos antes de `ready` (seção 16).  
- **Urgência:** muito alta.  
- **Feedback:** grupos de checagens, contagens, **CTA** para corrigir ou revalidar.  
- **Visível:** resumo executivo no topo; lista detalhada abaixo.  
- **Oculto:** logs completos (link para “Ver log”).

### 6.5 Modo pronto para executar (`ready`)

- **Objetivo:** confirmação explícita **pronto para palco**; transição para `executing`.  
- **Urgência:** alta imediatamente antes do show.  
- **Feedback:** mensagem inequívoca; botão primário **grande** mas **calmo** (sem alarmismo visual).  
- **Visível:** último pre-flight OK, hora, identificação do Pack.  
- **Oculto:** opções secundárias em menu ou painel lateral.

### 6.6 Modo execução (`executing`)

- **Objetivo:** operar **Scene** ativa e ações permitidas (sorteio, avançar).  
- **Urgência:** **máxima** — baixa carga cognitiva (seção 2.2, 17).  
- **Feedback:** estado ao vivo **constante**; erros de mídia **visíveis** sem cobrir controles críticos.  
- **Visível:** cena atual, próxima ação sugerida, indicador “ao vivo” discreto.  
- **Oculto:** configuração profunda, lista completa de cenas salvo comando explícito.

### 6.7 Status local

- **Objetivo:** workspace, versão Player, último estado da FSM.  
- **Urgência:** média (suporte).  
- **Feedback:** painel ou seção “Sobre esta sessão”.  
- **Visível:** `export_id`, caminho da workspace (resumido).  
- **Oculto:** até abrir — não poluir execução.

### 6.8 Logs

- **Objetivo:** diagnóstico e pós-mortem (PRODUCT_SPEC §14.5).  
- **Urgência:** baixa durante show; alta pós-incidente.  
- **Feedback:** visão **filtrável**, exportação/cópia se política permitir.  
- **Visível:** transições de estado, pre-flights, erros.  
- **Oculto:** padrão fora do modo suporte ou menu.

### 6.9 Modo operador

- **Objetivo:** consolidar **controles** sem modo “apresentação” confuso — pode ser layout único com **áreas** colapsáveis.  
- **Urgência:** variável.  
- **Feedback:** distinguir **modo montagem** (binding, pre-flight) de **modo palco** (`executing`).  
- **Evitar:** dois apps mentais sem indicação na UI.

---

# 7. Modelo de navegação

## 7.1 TelaFlow Cloud

**Proposta normativa:**

- **Sidebar** **estreita** e **estável** — poucos itens de primeiro nível: Dashboard, Eventos, Organização (ou Organizações se multi-org no usuário), Auditoria, Conta/suporte.  
- **Topbar** — contexto da **organização** ativa, usuário, ambiente (se staging), busca de evento **se** existir.  
- **Navegação contextual:** ao entrar no **editor do evento**, **subnav horizontal ou vertical secundária** fixa: Visão geral | Cenas | Sorteios | Mídia | Branding | Patrocinadores | Exportar (ou ordem lógica de trabalho).  
- **Breadcrumbs:** recomendados para profundidade >2 (Org → Eventos → Evento X → Export).  
- **Evitar:** sidebar com **dezenas** de itens (anti-padrão seção 20).

## 7.2 TelaFlow Player

**Proposta normativa:**

- **Fluxo linear por etapas** alinhado à FSM: Carregar Pack → (Licença) → Binding → Pre-flight → Pronto → Executar.  
- **Checklist** ou **stepper** **só** se **não** ocultar estado real — o **estado normativo** da FSM é fonte de verdade; o stepper é **representação**.  
- **Painel de operação** em `executing`: **uma** coluna ou barra inferior **fixa** com ações primárias; **sem** navegação profunda.  
- **Modo “montagem” vs “palco”:** transição visual clara (cor de fundo sutil ou barra de contexto — **sem** teatralidade).

---

# 8. Densidade de interface e ritmo visual

## 8.1 Quando densidade maior

- Listas de eventos, slots de mídia, auditoria, tabelas de membros.  
- Objetivo: **varredura** e comparação rápida.

## 8.2 Quando áreas mais abertas

- Export de Pack, resultado de pre-flight, confirmação **Pronto para executar**, primeira carga de Pack.  
- Objetivo: **decisão** e **leitura** sem erro.

## 8.3 Equilíbrio sofisticação / produtividade

Sofisticação **não** compete com produtividade: refinamento está em **alinhamento**, **tipo** e **estados** — não em remover informação útil da tabela de mídia.

## 8.4 Evitar apertado e vazio demais

- **Apertado:** padding mínimo em formulários longos + sidebar larga + três colunas — **proibido** no editor.  
- **Vazio:** hero gigante + uma linha de texto — desperdiça vertical em telas de trabalho.

## 8.5 Ritmo editorial

- **Título de página:** uma ideia por linha.  
- **Subtítulo:** contexto (evento, org) **uma vez**, não repetido em cada card.  
- **Agrupamentos:** fieldsets semânticos (“Identidade”, “Roteiro”, “Mídia obrigatória”).  
- **Espaçamento:** maior **entre** grupos do que **dentro** de campos relacionados.  
- **Hierarquia:** H1 raro (nome do evento); H2 para seções do editor; H3 para subseções.

---

# 9. Sistema de layout

## 9.1 Grid e colunas

- **Cloud:** grid de 12 colunas **ou** equivalente; **conteúdo principal** tipicamente **8–10 colunas** com **opcional** painel lateral de **inspector** (4 colunas) no editor.  
- **Player:** em `executing`, preferir **uma coluna principal** + **barra** de ação; evitar três colunas.

## 9.2 Largura de conteúdo

- **Máximo legível** para texto longo: ~65–75 caracteres por linha em formulários de ajuda.  
- **Tabelas** podem usar largura total com **scroll horizontal** responsável — **não** espremer texto crítico.

## 9.3 Margens e gutters

- Margem externa consistente (ex.: múltiplos de 4 ou 8 px em escala de design).  
- **Gutter** maior entre **módulos** do que entre **campos** do mesmo módulo.

## 9.4 Painéis laterais

- **Inspector** no editor: detalhe da Scene selecionada, metadados, atalhos — **não** duplicar lista inteira.  
- **Player:** painel lateral **só** fora de `executing` ou em **modo suporte** colapsado.

## 9.5 Editor do evento (comportamento)

- **Lista de Scenes** à esquerda ou em coluna dedicada; **detalhe** à direita — padrão mestre-detalhe.  
- **Não** é timeline de vídeo; **ordem** é **lista ordenável** com **handles** claros.  
- **Não** é canvas infinito; preview **dentro** de moldura fixa de template.

## 9.6 Telas operacionais (pre-flight, export)

- **Zona de resumo** (topo, largura total).  
- **Zona de lista** (bloqueantes / avisos).  
- **Zona de ação** (rodapé fixo ou barra inferior) com botões primários **sempre** no mesmo lugar.

---

# 10. Tipografia

## 10.1 Postura

Uma família **sans** de alta qualidade, **neutra** mas **caracterizada** — legível em 12–14px corpo, confiante em títulos. **Evitar** display fonts ou geometrias exageradas.

## 10.2 Títulos

- **Peso semibold ou medium** em níveis altos; **não** bold extremo em todo H2.  
- **Escala limitada:** ex. 3–4 tamanhos principais + corpo + legenda.

## 10.3 Subtítulos e corpo

- Subtítulo: tom **descritivo**, cor **secundária** (menos contraste que título).  
- Corpo: altura de linha confortável para leitura de parágrafos curtos em formulários.

## 10.4 Labels

- **Sentence case** ou **title case** consistente na aplicação inteira.  
- Label **liga** ao campo; placeholder **não** substitui label.

## 10.5 Números e dados

- **Tabular figures** quando disponível em tabelas.  
- Datas e ids (`export_id`) em **fonte monoespaçada opcional** ou estilo `code` discreto para escaneabilidade.

## 10.6 Status e legendas

- Legendas **pequenas** mas **legíveis** — mínimo recomendado alinhado à acessibilidade (seção 19).  
- **Badges** de status com **texto**, não só cor.

## 10.7 Cadência

Bloco: **título → uma frase de apoio → conteúdo**. Evitar três frases de apoio redundantes (“Gerencie seus eventos com facilidade”).

---

# 11. Cor, contraste e estados visuais

## 11.1 Cor primária

- **Ação principal** e **foco** — links primários, botão principal, indicador de progresso.  
- **Uso contido:** superfícies grandes **não** saturadas com primária.

## 11.2 Cores de apoio

- Neutros **quentes ou frios** escolhidos uma vez; **superfície**, **borda**, **texto secundário**.  
- **Uma** cor de ênfase secundária no máximo (ex.: informação).

## 11.3 Destaque sem poluição

Destaque = **menos** áreas destacadas. Se tudo chama atenção, nada chama.

## 11.4 Estados semânticos

| Estado | Uso na UI |
|--------|-----------|
| **Sucesso** | Confirmação de export, pre-flight OK — **calmo** (não verde neon em página inteira). |
| **Aviso** | Não bloqueia `ready` mas **visível** — ícone + texto; lista em pre-flight. |
| **Erro recuperável** | Campo ou slot; **inline** + possível banner. |
| **Erro bloqueante** | Impede `ready` ou causa `blocked` — **banner** ou **painel** dominante, **nunca** só toast. |
| **Pronto** | Estado `ready` — semântica **positiva** distinta de “sucesso genérico”. |
| **Execução ao vivo** (`executing`) | Indicador **discreto** mas **constante** (pílula, barra fina) — **não** piscar sem necessidade. |

## 11.5 Pre-flight e Player

- **Bloqueante** e **aviso** **devem** diferir por **forma** (ícone, borda, rótulo) **e** cor — **nunca** só cor (seção 19).  
- Contagem **“N bloqueantes”** **sempre** visível no resumo do pre-flight.

---

# 12. Componentes principais

Para cada um: **quando usar / não usar**, **peso**, **comportamento**, **erro comum**.

### 12.1 Cards

- **Usar:** agrupar **um** conceito (resumo de evento) com **uma** ação primária.  
- **Não usar:** grid de 9 cards iguais sem hierarquia.  
- **Peso:** borda sutil ou sombra mínima; **não** elevação dramática.  
- **Erro:** card para cada linha de tabela.

### 12.2 Tabelas

- **Usar:** mídia, auditoria, listas longas com colunas comparáveis.  
- **Não usar:** 2 colunas e 3 linhas — preferir lista simples.  
- **Peso:** zebra opcional; cabeçalho fixo em scroll.  
- **Erro:** tabela sem estado vazio definido (seção 13).

### 12.3 Listas

- **Usar:** Scenes ordenáveis, slots com ícone de status.  
- **Comportamento:** drag handle **visível**; **feedback** de drop.  
- **Erro:** reorder sem undo claro.

### 12.4 Formulários e campos

- **Agrupar** por contexto; **validação** inline após blur ou submit — política consistente.  
- **Erro:** validação só no servidor sem eco na UI.

### 12.5 Selects e toggles

- **Select:** muitas opções **enum**; busca dentro se > ~15 itens.  
- **Toggle:** **binário** real; **não** substituir rádio de 3 estados.

### 12.6 Tabs

- **Usar:** painéis **ortogonais** no mesmo contexto (ex.: detalhe de sorteio: Regras | Visualização).  
- **Não usar:** esconder passo obrigatório em tab esquecida.  
- **Erro:** mais de ~6 tabs.

### 12.7 Side panels

- **Usar:** inspector no editor; detalhe de item sem perder lista.  
- **Comportamento:** fechar com ESC; **não** cobrir tela inteira em desktop salvo mobile.

### 12.8 Dialogs e modais

- **Usar:** confirmações **destrutivas** ou decisões **curtas**.  
- **Não usar:** formulário longo de export **dentro** de modal.  
- **Erro:** modal sobre modal.

### 12.9 Toasts

- **Usar:** **confirmações leves** (“Cópia de id”) — **não** erro bloqueante.  
- **Erro:** stack de toasts cobrindo pre-flight.

### 12.10 Banners

- **Usar:** licença, `pack_version`, manutenção, bloqueante global.  
- **Peso:** uma linha ou duas; CTA claro.

### 12.11 Badges e status chips

- **Sempre** com texto: `Pronto`, `Rascunho`, `Bloqueante`, `Aviso`.  
- **Erro:** ponto colorido sem legenda.

### 12.12 Stepper / checklist

- **Usar:** Player **se** espelhar FSM **sem** mentir sobre estado interno.  
- **Erro:** stepper que permite clicar em “Executar” sem `ready`.

### 12.13 Timeline

- **Não** é componente central do editor no MVP — **lista ordenada** primeiro.  
- Se timeline existir no futuro, **deve** ser **linear** e **uma** linha — não NLE.

### 12.14 Inspector panel

- **Usar:** propriedades da Scene selecionada, slots de mídia da cena.  
- **Erro:** inspector com scroll infinito sem seções.

### 12.15 Logs view

- **Usar:** fonte monoespaçada legível, níveis, filtro, busca.  
- **Erro:** log colorido sem significado estável.

---

# 13. Estados vazios, loading e erro

Estes estados **são** experiência premium: **clareza** quando não há dados **é** qualidade.

### 13.1 Cloud — vazios

- **Sem eventos:** ilustração **mínima** ou ícone contido + **uma** frase + CTA “Criar evento”.  
- **Sem mídia configurada:** explicar **manifesto** — “Nenhum slot definido ainda” + link para requisitos.  
- **Sem export:** “Nenhum Pack exportado para este evento” + pré-requisitos em lista.

### 13.2 Player — binding

- **Sem arquivo vinculado:** slot com **CTA** “Escolher arquivo” e **tipo esperado**.  
- **Workspace não definida:** estado explícito **antes** de lista de slots.

### 13.3 Loading

- **Preferir** skeleton **estrutural** (mantém layout) a spinner solto no centro.  
- **Export e pre-flight:** barra de progresso ou fases nomeadas **quando** houver etapas mensuráveis.

### 13.4 Validação em andamento

- Debounce visual discreto; **não** bloquear leitura de lista inteira.

### 13.5 Erros

- **Recuperável:** mensagem próximo ao controle + como corrigir.  
- **Bloqueante:** tela ou painel dedicado; **código** ou `export_id` para suporte quando aplicável.  
- **Pack inconsistente / assinatura:** linguagem **técnica calma** — “Pack inválido ou alterado”; **não** “Erro 500”.  
- **Licença inválida:** `blocked` — explicar **expirado** vs **escopo** vs **relógio** quando detectável.  
- **Mídia ausente:** lista **nominal** dos `media_id` faltantes.

### 13.6 Princípio

**Nunca** deixar área em branco sem explicar **por quê** e **o que fazer**.

---

# 14. Microcopy e linguagem da interface

## 14.1 Tom

**Preciso, operacional, sem marketing** — alinhado ao PRODUCT_SPEC §10. **Sem** tom de entusiasmo artificial (“Você está incrível!”). **Sem** vaguidão (“Tente novamente mais tarde” sem contexto).

## 14.2 Títulos de tela

Nome do **objeto** + contexto: “Exportar Pack — {Nome do evento}”. **Evitar:** “Central de exportação”.

## 14.3 Botões

Verbo + objeto: “Executar checagens”, “Vincular mídia”, “Ir para slots faltantes”. **Evitar:** “Continuar”, “OK”, “Submit”.

## 14.4 Sucesso

“Pack exportado.” / “Checagens concluídas — 2 avisos, 0 bloqueantes.” **Evitar:** “Tudo certo!”.

## 14.5 Erro

“Mídia obrigatória ausente: `opening_video`.” / “3 itens bloqueantes precisam ser resolvidos antes de executar.” **Evitar:** “Algo deu errado.”

## 14.6 Labels e ajuda

Label = nome do campo no domínio (org, evento, slot, cena). Ajuda = **uma** frase **quando** o conceito é denso (ex.: workspace relativa).

## 14.7 Avisos e bloqueios

- **Aviso:** “Pode executar, mas…” + consequência.  
- **Bloqueio:** “Não é possível executar até…” + lista acionável.

---

# 15. Direção específica para o Editor do Evento (Cloud)

## 15.1 Estrutura da tela

- **Cabeçalho fixo:** nome do evento, estado (rascunho), atalho **Exportar**.  
- **Subnav** do editor (seção 7.1).  
- **Corpo:** mestre-detalhe — **lista de Scenes** + **inspector** da Scene.  
- **Rodapé opcional:** resumo de completude (slots obrigatórios não satisfeitos na Cloud = checklist conceitual, não binding de arquivo).

## 15.2 Organização de domínios

- **Cenas:** eixo do roteiro — **primeiro** na ordem mental ou **segundo** após “Visão geral” com resumo.  
- **Branding:** tokens e preview — **não** competir com lista de cenas na mesma coluna.  
- **Sorteios:** módulo **separado**; ligação à Scene **visível** na Scene (gatilho opcional).  
- **Mídia:** visão **global** de slots + **atalho** a partir da Scene para slots usados naquela cena.

## 15.3 Metáfora: painel / timeline / wizard / workspace

**Proposta:** **workspace de produção** — **não** wizard linear obrigatório (produção real salta entre mídia e cenas); **não** timeline NLE; **não** canvas livre.  
**Elemento de ordenação:** **lista** de Scenes com ordem explícita = compromisso com ARCHITECTURE_SPEC §5.5.

## 15.4 Evitar canvas cedo

Preview **sempre** dentro de **moldura** de template; edição **por** campos e **slots**, **não** por arrastar pixels.

## 15.5 Poder sem caos

**Atalhos** para usuários avançados (duplicar cena, reordenar em lote) **sem** expor todos os campos ao mesmo tempo. **Validação** na origem antes de export (mensagens **no** editor, não só no backend).

---

# 16. Direção específica para o Pre-flight (Player)

## 16.1 Posicionamento

Tela **dedicada** ou **painel de página inteira** após binding — **não** modal pequeno. É **componente arquitetural** (ARCHITECTURE_SPEC §11) e **deve** parecer **cerimônia de qualidade**, não formulário secundário.

## 16.2 Layout

1. **Resumo** (topo): contagem bloqueantes / avisos / última execução (timestamp).  
2. **Grupos** de checagens: Pack e integridade | Licença | Mídia | Consistência do roteiro | Ambiente (permissões).  
3. **Lista** dentro de cada grupo: item com ícone de severidade + texto + **ação** (“Ir para slot”, “Revalidar”).

## 16.3 Bloqueantes vs avisos

- **Bloqueante:** ícone e cor **inequívocos**; aparece **no** resumo.  
- **Aviso:** distinto visualmente; **não** impede CTA “Iniciar execução” quando política permitir `ready` com avisos (se produto permitir — padrão: **zero** bloqueantes para `ready`).

## 16.4 Progresso

Se checagens forem assíncronas: **lista** que atualiza item a item; **não** spinner único opaco.

## 16.5 Orientação ao operador

Texto curto **acima** da lista: “Resolva os bloqueantes abaixo. Avisos não impedem a execução, mas podem afetar o palco.”

## 16.6 Pronto para executar

Transição visual clara de `preflight_failed` / `binding_pending` → `ready`: **mensagem** “Pronto para executar” + habilitação do botão primário alinhada à FSM.

## 16.7 Revalidação

Após mudança de arquivo ou Pack: **botão** “Executar checagens novamente”; **histórico** do último resultado **acessível** (collapse).

---

# 17. Direção específica para o modo execução (Player)

## 17.1 Metáfora

**Mesa de controle de palco** — não painel de admin nem slide deck.

## 17.2 Controles

- **Avançar** / **voltar** cena (se política permitir) ou **ir para** cena nomeada — **explícito**.  
- **Disparar sorteio** quando a Scene atual tiver gatilho — **um** botão **claro**.  
- **Pausar** (se `paused` no MVP) — **distinto** de parar.  
- **Encerrar** evento — confirmação **modal** curta.

## 17.3 Status visíveis

- **Cena atual** (nome + opcionalmente índice “3 de 12”).  
- **Indicador ao vivo** discreto.  
- **Alertas** não modais **empilhados** — máximo **um** banner + fila **acessível**.

## 17.4 Poluição

**Ocultar:** lista completa de cenas, logs, configurações — **menu** “…” ou tecla de atalho.

## 17.5 Próxima ação

Linha única de texto: “Próximo: intervalo” ou “Próximo: sorteio categoria X” **quando** o Pack fornecer.

## 17.6 Falha durante execução

Erro de mídia: **overlay** ou **banner** com **ação** “Repetir” / “Pular” **se** política — **nunca** falha silenciosa no telão sem feedback ao operador.

---

# 18. Consistência entre Cloud e Player

## 18.1 Compartilhar

- **Linguagem visual:** família tipográfica, escala de neutros, cor semântica de estado.  
- **Semântica de status:** bloqueante, aviso, pronto, ao vivo.  
- **Termos:** Scene, Pack, slot, `media_id`, pre-flight, export — **mesmos** nomes.  
- **Feedback:** padrão de mensagem de erro **estruturado** (o quê / por quê / próximo passo).

## 18.2 Diferir

| Aspecto | Cloud | Player |
|---------|-------|--------|
| **Densidade** | Maior em listas e editor | Menor em `executing` |
| **Prioridade** | Configuração completa | Sobrevivência operacional |
| **Navegação** | Sidebar + subnav | Linear + painel |
| **Exposição** | Todos os módulos do evento | Só o necessário ao estado FSM |

---

# 19. Acessibilidade e legibilidade

## 19.1 Contraste

Texto normal e UI: **cumprir** WCAG 2.1 **AA** como **alvo** para componentes core; estados críticos **não** dependem só de cor.

## 19.2 Tamanho mínimo

Corpo **não** inferior a ~14px equivalente em telas desktop; Player em telas distantes: considerar **escala** ou modo “palco distante” futuro — MVP: **testar** legibilidade a 1,5–2 m em monitor de operador.

## 19.3 Leitura rápida

Títulos **curtos**; listas **escaneáveis**; **não** texto centrado longo.

## 19.4 Foco e teclado

Cloud: formulários e tabelas **navegáveis** por teclado onde aplicável. Player: **atalhos** **documentados** para ações críticas (sem conflito com SO) — spec de atalhos pode ser derivada.

## 19.5 Motion

Respeitar **prefers-reduced-motion** para animações não essenciais.

---

# 20. Anti-padrões visuais e de UX

1. Dashboard de cards iguais sem prioridade.  
2. Excesso de brilho, glow, gradiente de fundo full-screen.  
3. Sidebar com dezenas de entradas.  
4. Modal para fluxos longos (export, pre-flight completo).  
5. Timeline confusa no lugar de lista de Scenes.  
6. Editor sem hierarquia (tudo numa página).  
7. Status só por cor.  
8. Mensagens genéricas de erro.  
9. **Toast** como único canal de **erro bloqueante** ou **licença inválida**.  
10. Interface bonita **sem** ação primária óbvia.  
11. Cloud **teatral** (animações longas, copy emocional).  
12. Player **corporativo demais** = texto minúsculo e 40 campos em `executing`.  
13. Stepper que **desmente** a FSM.  
14. Preview que **simula** canvas livre quando o produto **proíbe**.

---

# 21. Critérios para futuras interfaces e features

Uma nova tela ou componente **só** é adotado se:

1. **Respeita** os princípios da seção 2 e o PRODUCT_SPEC / ARCHITECTURE_SPEC.  
2. **Reduz** ou **mantém** carga cognitiva no contexto de uso (palco vs escritório).  
3. **Mantém** hierarquia e **não** fragmenta o fluxo Cloud → Pack → Player.  
4. **Não** parece template genérico de marketplace de UI (ver seção 4).  
5. **Não degrada** identidade premium (seção 3).  
6. Para o Player: **compatível** com estados formais da FSM — **não** introduzir “modo oculto” sem estado.

---

# 22. Encerramento normativo

Esta **UI_SPEC** é **normativa** para design e implementação frontend do TelaFlow. **Desvios relevantes** — novo padrão visual, novo componente transversal, mudança na semântica de estados na UI — exigem **revisão** deste documento e, quando impactarem produto ou arquitetura, **PRODUCT_SPEC** / **ARCHITECTURE_SPEC** e **ADR** conforme o caso.

Componentes e telas futuros **devem** ser avaliados **explicitamente** contra este documento antes de merge ou release.

---

*Documento interno de interface — TelaFlow. Derivado do PRODUCT_SPEC v1.1 e ARCHITECTURE_SPEC v1.1.*
