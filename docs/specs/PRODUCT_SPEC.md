# TelaFlow — Especificação de Produto (PRODUCT_SPEC)

**Versão:** 1.1  
**Status:** Documento normativo — referência para decisões de produto, roadmap e implementação  
**Última revisão:** 2026-04-10  
**Domínio SaaS principal:** app.telaflow.ia.br  

---

## Prefácio

Este documento define **o que é**, **para quem é**, **o que faz** e **o que não faz** o TelaFlow. Qualquer funcionalidade, comunicação comercial, priorização de engenharia ou extensão de escopo deve ser avaliada em conformidade com esta especificação. Divergências deliberadas exigem **revisão explícita** deste documento e registro de decisão (ADR ou equivalente).

---

# 1. Visão oficial do produto

## 1.1 O que é o TelaFlow

O **TelaFlow** é uma **plataforma visual inteligente para eventos ao vivo**, orientada à **direção e consistência do que aparece no telão** — sorteios, mídia institucional e promocional, identidade do evento, temporização e momentos de palco que exigem leitura clara, repetibilidade e controle operacional.

O produto é **híbrido por design**: combina **criação e gestão na nuvem** (TelaFlow Cloud), **empacotamento auditável do que vai ao local** (TelaFlow Pack) e **execução local no ambiente do palco** (TelaFlow Player), de forma que a equipe possa **montar online**, **transportar o pacote** e **executar com previsibilidade**, inclusive **offline** quando a produção assim o exige.

## 1.2 Que problema resolve

Resolve a fragmentação entre “ferramenta de sorteio”, “pasta de vídeos”, “slides soltos” e improviso na hora do show. Centraliza **roteiro visual**, **regras de exibição**, **mídia declarada**, **branding** e **fluxo operacional** em um único ecossistema com handoff claro entre escritório, produção e palco.

## 1.3 Por que existe

Existe porque **eventos corporativos e institucionais de alto padrão** não toleram falhas de leitura no telão, inconsistência de marca ou dependência frágil de internet no instante decisivo. O mercado tem soluções pontuais ou genéricas; o TelaFlow existe para oferecer **produto integrado**, **postura premium** e **disciplina operacional** alinhadas a quem vende e entrega evento sério.

## 1.4 Categoria de produto

O TelaFlow posiciona-se como **software de direção visual e operação de palco para eventos ao vivo**, com forte componente de **gestão de conteúdo e de fluxo**, **não** como “aplicativo de sorteio” isolado nem como **substituto genérico de vídeo wall** sem narrativa de evento.

**Analogia de mercado (orientação, não cópia):** soluções que unem **clareza de UX**, **confiabilidade em produção** e **identidade visual coerente** — no segmento de eventos, não no de streaming social ou de jogos casuais.

---

# 2. O que o TelaFlow NÃO é

## 2.1 Fora do escopo conceitual

- **Não é** apenas um gerador ou animador de sorteio descontextualizado do restante do evento.  
- **Não é** um editor de vídeo profissional (NLE), DAW ou suite de pós-produção.  
- **Não é** plataforma de transmissão ao vivo (live streaming) como produto principal.  
- **Não é** sistema de venda de ingressos, CRM de patrocinadores ou ERP de eventos.  
- **Não é** substituto de **roteiro criativo** ou **direção artística** — **instrumenta** e **materializa** decisões já tomadas pela produção.  
- **Não é** ferramenta de engajamento de rede social em tempo real como núcleo do valor (ex.: wall de tweets como produto central).

## 2.2 O que não será perseguido no MVP

- Integrações profundas com ecossistemas de terceiros além do necessário para **exportar Pack**, **autenticar Cloud** e **atualizar licença**.  
- Marketplaces de templates de terceiros como prioridade.  
- Modo “qualquer um monta em 30 segundos sem treinamento” que **sacrifique** checklist, versionamento e responsabilidade operacional.  
- Funcionalidades cuja única justificativa seja “concorrente X tem” sem aderência aos princípios da secção 11 nem às premissas operacionais da secção 14.

## 2.3 O que não deve contaminar a proposta

- Linguagem de **gimmick** ou **hype** desconectado de operação real.  
- Complexidade de interface que **exija** técnico dedicado só para navegar telas básicas do evento.  
- Promessas de **100% à prova de erro humano** — o produto reduz risco; não anula responsabilidade da produção.

---

# 3. Público-alvo inicial

## 3.1 Segmentos prioritários

| Segmento | Necessidade típica alinhada ao TelaFlow |
|----------|----------------------------------------|
| **Empresas de eventos / produtoras** | Padronizar entregáveis de palco, reduzir improviso, repetir formato entre clientes com governança. |
| **Convenções e congressos** | Comunicação institucional clara, cronogramas visíveis, momentos formais com leitura à distância. |
| **Feiras e ativações** | Loops de mídia e patrocínio com ritmo controlado no stand ou palco auxiliar. |
| **Assembleias** | Resultados e comunicados com autoridade visual e rastreabilidade operacional. |
| **Premiações corporativas** | Sequência de categorias, mídia de marca e revelações com timing previsível. |

## 3.2 Quem compra vs. quem opera

- **Comprador / decisor (economic buyer):** diretoria de eventos, operações, marketing B2B ou TI que patrocina ferramenta de palco; critérios: **confiabilidade**, **imagem da marca**, **redução de incidente**, **suporte a múltiplos eventos**.  
- **Operador (user):** produtor de palco, técnico de vídeo, coordenação de evento; critérios: **clareza de fluxo**, **pre-flight**, **offline**, **poucos cliques no momento crítico**.  
- **Influenciador:** agência que exige que o fornecedor de palco use ferramenta **auditável** e **profissional**.

O produto deve satisfazer **operador** no dia do evento e **comprador** na renovação e expansão de uso.

---

# 4. Problemas reais que resolve

1. **Improviso de palco** — Última hora com arquivos soltos, nomes inconsistentes e “alguém acha o vídeo”.  
2. **Falta de controle visual** — Transições e hierarquia de informação que competem com a mensagem do evento.  
3. **Dependência de internet** — Queda de link no momento de sorteio ou vídeo crítico.  
4. **Mídia dispersa** — Vídeos, logos e regras espalhados em drives sem manifesto único validado.  
5. **Falta de checklist operacional** — Nada que force “está tudo no pack e validado antes de sair do escritório”.  
6. **Ausência de produto integrado** — Pilha de ferramentas desconectadas sem narrativa Cloud → Pack → Player.

---

# 5. Arquitetura conceitual oficial do produto

## 5.1 TelaFlow Cloud (SaaS — app.telaflow.ia.br)

**Papel:** Ambiente web onde a organização **cria eventos**, **define branding**, **estrutura cenas e momentos**, **configura sorteios e mídia exigida**, **revisa e versiona** antes da exportação. É a fonte de verdade **antes** do pacote fechar.

**Promessa funcional:** “Tudo o que o palco precisa ver está declarado, revisado e exportável.”

## 5.2 TelaFlow Pack

**Papel:** Artefato exportado que **congela** configuração, **manifesto de mídia**, **identidade visual aplicada** e **licença** (validade e escopo de uso acordados). É o **contrato operacional** entre o que foi aprovado na Cloud e o que o Player pode executar.

**Promessa funcional:** “O que desce para o local é fechado, transportável e implantável.”

## 5.3 TelaFlow Player

**Papel:** Aplicação **local** que consome o Pack e **executa** o roteiro visual no telão, com ênfase em **desempenho**, **previsibilidade** e **modo offline** quando configurado. É o instrumento da **hora H**.

**Promessa funcional:** “No palco, o telão obedece ao roteiro — não ao improviso.”

**Relação entre os três:** Cloud **autoriza e produz** o conteúdo lógico; Pack **empacota e licencia**; Player **realiza** no ambiente físico.

## 5.4 Unidade central: o Evento

O **Evento** é a **unidade principal de negócio** e a **âncora de produto** do TelaFlow. Quase tudo que o cliente configura, exporta, licencia e executa **deriva do Evento**: branding aplicado àquele show, requisitos de mídia, cenas e roteiro de palco, sorteios, **exportação de Pack**, **validade e escopo de licença** vinculados à exportação, e **execução** no Player. A **Organização** agrupa eventos, usuários e contrato; o **Pack** é snapshot de **um** evento (e metadados de exportação); o **Player** interpreta **um** Pack. Esta hierarquia **deve** orientar modelagem de dados, UX e modelo comercial — evitando entidades “órfãs” ou CRUD genérico desconectado de um evento concreto. Detalhamento de **customização** e **modelo comercial** está na **secção 14**.

---

# 6. Fluxo principal do produto (jornada ideal)

1. **Criar evento** na Cloud (metadados, datas, responsáveis).  
2. **Configurar branding** (paleta, tipografia permitida, regras de uso de logo — dentro dos limites do produto).  
3. **Definir cenas** (estrutura de momentos do palco: abertura, blocos, encerramento, etc.).  
4. **Definir sorteios** (regras, visualização pública, ordem — conforme capacidades do MVP).  
5. **Definir mídia exigida** (arquivos referenciados, formatos aceitos, checklist de presença).  
6. **Revisar** (validações automáticas + revisão humana).  
7. **Exportar Pack** (geração do pacote com manifesto e licença).  
8. **Transportar / entregar** o Pack ao local (mídia física ou transferência segura conforme política do cliente).  
9. **Executar localmente** no Player (carregar Pack).  
10. **Validar pre-flight** (Player + operador confirmam integridade, versão e prontidão).  
11. **Rodar offline** (quando aplicável — execução sem dependência de internet para o núcleo do show).

Este fluxo é a **espinha dorsal** narrativa do produto; variações futuras não o invalidam sem revisão deste documento.

---

# 7. MVP oficial — o que entra (obrigatório)

O MVP deve permitir, de ponta a ponta (com qualidade utilizável em evento real):

- **Cloud:** criação de evento; branding básico; estrutura de cenas/momentos; configuração de pelo menos **um** tipo de sorteio com critérios claros; associação de mídia ao roteiro; checklist de mídia faltante; exportação de Pack.  
- **Pack:** formato estável; manifesto de mídia; metadados de versão; **licença com validade** (mesmo que regra simples no MVP).  
- **Player:** abertura de Pack; reprodução conforme roteiro; **modo offline** para o núcleo da execução; **pre-flight** explícito (indicação de erros bloqueantes vs. avisos).  
- **Confiabilidade:** comportamento previsível em falha parcial (mensagens claras, sem silêncio visual no telão sem intenção).  
- **Observabilidade mínima:** **logs e trilhas de auditoria** como parte do produto, não opcional — na Cloud, registro de **exportação de Pack** (quem, quando, qual evento/export); no Player, registro de **abertura de Pack**, resultado de **validação de mídia / pre-flight** e marcos de **execução** (transições relevantes, erros recuperáveis ou não), com escopo e retenção definidos na [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md), sem violar privacidade. Valor **operacional** (suporte, pós-mortem) e **comercial** (governança, prova de uso).

Detalhamento técnico de APIs, stack e UX fica fora deste documento, mas **deve obedecer** aos princípios, às **premissas operacionais (secção 14)** e ao MVP aqui delimitado.

---

# 8. O que fica fora do MVP (explícito)

Sem exclusão de roadmap permanente — apenas **não obrigatório** na primeira entrega comercial coerente com esta spec:

- QR interativo, votação ao vivo, gamificação complexa como **núcleo** (podem existir como visão, não como compromisso do MVP).  
- Multi-tenant avançado com white-label completo por cliente (além do necessário para operar a Cloud).  
- Integração nativa com cada plataforma de streaming ou hardware de vídeo do mercado.  
- Editor gráfico livre estilo canvas infinito.  
- IA generativa de conteúdo de palco como feature central.  
- App mobile do operador como substituto do Player desktop (se existir mobile, é **complementar**, não substituto no MVP salvo decisão futura documentada).

---

# 9. Diferencial competitivo real

1. **Produto híbrido intencional** — Cloud + Pack + Player como **um** sistema, não três vendas desconectadas.  
2. **Offline como valor**, não como exceção — desenhado para a **hora H**, não só para demo com Wi-Fi estável.  
3. **Direção visual com propósito** — cada elemento de interface de palco serve **clareza e marca**, não efeito gratuito.  
4. **Checklist e manifesto** — disciplina operacional **nativa**, não PDF anexo.  
5. **Posicionamento premium** — recusa explícita de ser “mais um sorteador”.

---

# 10. Linguagem do produto

- **Premium:** vocabulário preciso, sem jargão vazio; confiança por clareza.  
- **Confiável:** promessas alinhadas ao que o Player e o Pack **garantem** de fato.  
- **Elegante:** visual e texto da marca TelaFlow e da Cloud **sóbrios**, nunca gritantes.  
- **Operacional:** textos de UI orientados a **ação e consequência** (“validar pack”, “bloqueante”, “pronto para palco”).  
- **Sem excesso futurista:** evitar “revolucionário”, “IA em tudo”, “disruptivo” como substituto de benefício concreto.

---

# 11. Princípios de produto

1. **Simplicidade operacional** — O operador no palco não negocia com a ferramenta; ela **reduz** carga cognitiva.  
2. **Confiabilidade primeiro** — Melhor falhar **explicitamente** com mensagem do que “parecer ok” e quebrar no ar.  
3. **Visual com propósito** — Cada escolha de UI de palco tem **função** (leitura, marca, tempo).  
4. **Operação offline como valor** — Conectividade é **otimização**, não **dependência** para o núcleo.  
5. **Clareza acima de excesso** — Menos features mal integradas; mais fluxo **inteiro** confiável.  
6. **Composição controlada, não liberdade criativa irrestrita** — O TelaFlow **prioriza** montar o palco a partir de **templates, tokens e regras** definidos pelo produto, **não** um estúdio gráfico aberto. Liberdade excessiva (canvas livre, animação arbitrária, layout pixel a pixel) **desvia** a categoria do produto, **explode** complexidade de UX, dados e QA, e tende a reproduzir “Canva + evento + player” — **explicitamente fora** do que se pretende construir (alinhar com secções 2, 8 e 14.3).

---

# 12. Riscos de produto

| Risco | Mitigação orientadora |
|-------|------------------------|
| **Escopo do MVP inchado** | Gate formal contra secção 8; ADR para qualquer expansão. |
| **Player instável em hardware heterogêneo** | Pre-flight rigoroso; matriz de suporte explícita ao cliente. |
| **Pack corrompido ou adulterado** | Integridade criptográfica ou validação forte (definir em spec técnica derivada). |
| **Expectativa de “zero treinamento”** | Comunicação honesta; materiais de onboarding mínimos premium. |
| **Concorrência por preço em sorteio isolado** | Manter narrativa **sistema**, não **feature única**. |
| **Dependência excessiva de internet na Cloud** | Aceitável para authoring; **nunca** como desculpa para falha no Player em modo offline prometido. |
| **Modelo comercial indefinido** | Precificação pode variar; **unidade econômica e vínculo licença ↔ evento/org** devem estar claros (secção 14) antes de comprometer arquitetura. |
| **Customização sem teto** | Secção 14.3 como gate; ADR para ampliar o que é “permitido” além de templates e tokens. |

---

# 13. Critérios para evolução futura

Uma feature ou epic entra no roadmap prioritário somente se:

1. **Reforça** pelo menos um dos princípios da secção 11 **sem** violar outro de forma grave **e** **respeita** as **premissas operacionais** da secção 14.  
2. **Serve** um segmento da secção 3 ou abre segmento **adjacente** com mesmo perfil de seriedade operacional.  
3. **Encaixa** na arquitetura conceitual (secção 5) — se exigir quarto “produto”, exige **revisão deste PRODUCT_SPEC**.  
4. Possui **critério de sucesso mensurável** (ex.: redução de incidente, tempo de pre-flight, NPS operacional).  
5. **Não** reclassifica o TelaFlow como algo da secção 2 sem decisão explícita de reposicionamento.

Features que falhem em (1)–(3) ficam em **backlog de exploração** ou são recusadas.

---

# 14. Premissas operacionais do produto

Esta secção fixa **decisões de produto** que **orientam** modelo de dados, UX, licenciamento e arquitetura (vide [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md)). **Prevalecem** sobre interpretações soltas de outras secções em caso de dúvida comercial ou de escopo de customização.

## 14.1 Evento como unidade central de negócio e de operação

- O **Evento** é a unidade em torno da qual se organizam: **branding** (para aquele show), **mídia requerida**, **cenas** e roteiro, **sorteios**, **exportação de Pack**, **validade e escopo de uso** associados à licença daquela exportação, e **execução** no Player a partir **dum** Pack **daquele** evento.  
- A **Organização** é o **tenant** comercial e de acesso; não substitui o Evento como unidade de **configuração completa** nem de **entrega** ao palco.  
- Funcionalidades que “flutuam” sem Evento **devem** ser tratadas com suspeita; exceções exigem **ADR** e revisão desta spec.

## 14.2 Modelo comercial primário e unidade econômica

O TelaFlow **vende** capacidade de **autorar na Cloud**, **exportar Packs licenciados** e **executar no Player** com previsibilidade. Para **alinhar produto e arquitetura cedo**, adotam-se as seguintes **premissas normativas** (preços e SKUs exatos ficam fora deste documento; **a lógica de vínculo** não):

| Elemento | Decisão de produto |
|----------|-------------------|
| **Unidade econômica primária** | **Evento exportado** — o direito de execução relevante para o palco amarra-se ao **Pack** gerado a partir de **um Evento** (identificadores de evento e exportação na licença), salvo evolução documentada. |
| **Âncora comercial agregadora** | **Organização** — contrato, faturamento recorrente ou pool de eventos opera no nível **Organization**; usuários e eventos pertencem a uma organização. |
| **Assinatura / recorrência** | **Admissível** como **acesso à Cloud** (lugares, features, volume de eventos ativos) **em complemento** à lógica **por evento/export**, não como substituto da necessidade de **licença de execução** coerente com cada Pack. |
| **Licença por evento** | **Sim** — cada exportação relevante carrega claims que identificam o **evento** (e a **organização**) e a **janela de validade** acordada. |
| **Export / Pack controlado por validade** | **Sim** — Packs **não** são “binários eternos” sem contexto: validade (e escopo) faz parte do **contrato operacional** e da **proposta de valor** (governança, renovação, suporte). |
| **Licença somente por organização, sem evento** | **Não** como modelo **único** no MVP — esvazia rastreabilidade e alinhamento com a unidade central; **pacotes enterprise** futuros podem combinar termos por org **desde que** o Pack continue a refletir **escopo** inequívoco (ADR). |

**Implicação:** engenharia de **licenciamento**, **export** e **auditoria** deve assumir **sempre** vínculo **Organization + Event (+ Export)** na origem, evitando Packs ambíguos.

## 14.3 Nível de customização permitido

Sem este teto, o editor torna-se **infinito** e o produto **deriva** para software criativo genérico. **No MVP e na linha base do produto**, vigoram os limites abaixo; **ampliar** qualquer linha exige **ADR** e revisão desta secção.

| Área | O que o cliente **pode** fazer | O que **não** é permitido como núcleo do MVP |
|------|--------------------------------|---------------------------------------------|
| **Cores** | Ajustar dentro de **tokens** e **paletas** permitidas pelo **BrandTheme** (cores de marca, fundos, acentos definidos pelo produto). | Paleta livre infinita sem validação de contraste/leitura a distância; import arbitrário de design system completo sem curadoria. |
| **Logos e mídia de marca** | **Vincular arquivos** (imagens, vídeos) aos **slots** declarados no manifesto; cumprir formatos e obrigatoriedade. | Biblioteca de edição de bitmap/vetor **na Cloud**; composição gráfica livre na plataforma. |
| **Layouts de palco** | Escolher entre **templates** e **variantes** oferecidos pelo TelaFlow; preencher **campos** e **slots** previstos (texto, mídia, ordem dentro do template). | **Layout livre** estilo apresentação genérica ou **canvas** arrasta-e-solta sem grade de produto. |
| **Templates** | Selecionar entre **conjunto curado** oficial; combinar com branding tokenizado. | Upload de template de terceiros ou “tema HTML/CSS” arbitrário no MVP. |
| **Transições e motion** | Usar **conjunto fechado** ou **parâmetros limitados** (ex.: cortes, fades, durações prescritas) quando existirem. | Timeline keyframe, efeitos arbitrários ou pipeline de motion irrestrito. |
| **Cenas** | **Compor** o roteiro **ordenando e agrupando** **tipos de cena** suportados (momentos de palco definidos pelo domínio). | **Cenas livres** no sentido de **qualquer** composição visual ou lógica não prevista — isso é **fora** da linha base. |

**Regra de ouro:** o cliente **personaliza dentro do que o produto já sabe validar e executar**; não **redefine** o motor visual.

## 14.4 Mídia: validada, não armazenada na Cloud no MVP

- A Cloud guarda **requisitos**, **manifesto lógico** e **checklist** — **não** o binário da mídia do cliente (MVP).  
- O Player **valida presença, forma e binding** localmente; **pre-flight** é obrigatório como conceito de produto.  
- Alinhado à [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) (estratégia de mídia e Pack).

## 14.5 Observabilidade mínima e logs como parte da confiabilidade

- **Logs e eventos auditáveis** não são “extra técnico”: sustentam **suporte**, **pós-mortem**, **governança comercial** e **confiança** do comprador.  
- **Mínimo normativo:** rastrear **exportação de Pack** na Cloud; no Player, **abertura de Pack**, **resultado de validação de mídia / pre-flight** e **marcos de execução** (e falhas) em nível útil ao diagnóstico, sem coleta desnecessária de dados pessoais.  
- Detalhe de implementação permanece na ARCHITECTURE_SPEC; **ausência** de logging planejado para estes pontos é **lacuna de produto**, não apenas de engenharia.

## 14.6 Síntese operacional

| Premissa | Enunciado |
|----------|-----------|
| Unidade central | **Evento** — negócio, configuração e Pack derivam dele. |
| Licença | Vinculada ao **evento exportado** e à **organização**, com **validade** explícita no Pack. |
| Mídia (MVP) | **Validada** localmente; **não** hospedada na Cloud. |
| Layout / criatividade | **Templates** e **tokens**; **não** estúdio criativo livre. |
| Confiabilidade | **Logs** e trilhas mínimas **fazem parte** do produto. |

---

## Encerramento

O TelaFlow é definido como **plataforma visual inteligente para eventos ao vivo**, entregue como **Cloud + Pack + Player**, com **MVP** focado em **fluxo completo**, **offline no palco**, **postura premium**, **unidade econômica e de modelagem claras (Evento)** e **premissas operacionais** da secção **14**. Este documento permanece a **fonte normativa** até nova versão numerada e aprovada.

---

*Documento interno de produto — TelaFlow.*
