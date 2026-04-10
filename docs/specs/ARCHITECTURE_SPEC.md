# TelaFlow — Especificação de Arquitetura (ARCHITECTURE_SPEC)

**Versão:** 1.1  
**Status:** Documento normativo — referência para implementação, modularização, contratos, persistência, segurança e governança técnica  
**Última revisão:** 2026-04-10  
**Hierarquia normativa:** Este documento é **derivado e subordinado** ao [PRODUCT_SPEC.md](./PRODUCT_SPEC.md). Em caso de ambiguidade ou conflito aparente, **prevalece o PRODUCT_SPEC**; a arquitetura deve ser ajustada (via revisão deste arquivo e ADR) para restabelecer alinhamento.  
**Domínio SaaS principal:** app.telaflow.ia.br  

---

## Prefácio

O TelaFlow é uma **plataforma visual inteligente para eventos ao vivo**, entregue como **TelaFlow Cloud** (autoria e governança), **TelaFlow Pack** (contrato operacional serializado) e **TelaFlow Player** (execução local confiável, com **offline** como capacidade central). Esta especificação **não substitui** o produto: formaliza **como o sistema honra** o PRODUCT_SPEC em termos de fronteiras, dados, mídia, licença, validação e observabilidade.

**Escopo:** arquitetura de produto e de sistema; **sem código**, **sem DDL**. Detalhes de API, esquemas JSON exatos e algoritmos criptográficos podem ser documentados em especificações derivadas, desde que **obedeçam** a este documento.

---

# 1. Objetivo da arquitetura

## 1.1 Por que esta arquitetura existe

A arquitetura existe para **materializar** o fluxo normativo **Cloud → Pack → Player** descrito no PRODUCT_SPEC, de modo que:

- a **autoria** permaneça na nuvem, com **multi-tenant**, **auditoria** e **governança**;
- o **handoff para o palco** seja um **artefato versionado e validável**, não uma cópia informal de estado;
- a **execução no palco** não dependa de chamadas de rede para o núcleo do show;
- **mídia** seja tratada como **obrigação declarada + presença local verificada**, não como upload genérico na Cloud no MVP.

## 1.2 Quais problemas precisa resolver

1. **Improviso técnico** — Evitar que engenharia contorne o Pack ou acople Player à Cloud “para ir mais rápido”.  
2. **Fragmentação de verdade** — Uma única linha de congelamento: o Pack aprovado para aquele evento/versão.  
3. **Risco operacional no palco** — Pre-flight, logs e falhas **explícitas** em vez de comportamento silencioso.  
4. **Dispersão de mídia** — Manifesto como **contrato de o que deve existir**; binding local como **como a máquina do palco resolve** isso.  
5. **Escopo inchado** — Fronteiras claras permitem dizer “não” a atalhos que quebram offline, licença ou integridade.

## 1.3 Compromissos que ela assume

- **Duas stacks conscientes:** Cloud (Next.js App Router + FastAPI + PostgreSQL) e Player (Tauri 2 + React + Vite + estado local leve no MVP). O custo de manutenção é aceito em troca de **adequação** (web rica para autoria; runtime local enxuto para palco).  
- **Sem armazenamento de mídia do usuário na Cloud no MVP** — Reduz superfície de custo, compliance e complexidade; transfere responsabilidade clara para **workspace local controlada** no Player.  
- **Simplicidade local primeiro:** JSON, manifestos e logs no MVP; **SQLite local apenas se** surgir necessidade comprovada (secção 15).  
- **Explicitude sobre “mágica”** — Menos automação opaca; mais validação listável e mensagens acionáveis.

## 1.4 Como protege contra improviso técnico e “vibe coding”

- **Contratos explícitos** entre Cloud, Pack e Player (secção 4): o que é permitido e proibido não fica implícito.  
- **Evento como unidade central** (secção 5): evita CRUD genérico sem domínio.  
- **Pre-flight obrigatório como conceito** (secção 11): não se “assume” que o telão está pronto.  
- **Anti-padrões nomeados** (secção 19): decisões ruins ficam documentadas como **não fazer**.  
- **ADR para mudanças relevantes** (secção 22): arquitetura evolui por decisão registrada, não por acréscimo acumulado sem narrativa.

---

# 2. Princípios arquiteturais do TelaFlow

Cada princípio abaixo **reforça** o PRODUCT_SPEC e **restringe** implementações.

### 2.1 Produto híbrido por intenção

Cloud, Pack e Player não são três produtos opcionais: são **três fases obrigatórias** do mesmo sistema. A arquitetura **não** permite atalho permanente que elimine uma delas sem revisão normativa.

### 2.2 Cloud como sistema de autoria e governança

A Cloud **possui** identidades, organizações, eventos em edição, histórico de exportações e políticas de acesso. Ela **não** é o runtime do palco. Toda regra de negócio que define *o que pode ser exportado* vive **no backend** (FastAPI), não apenas no frontend.

### 2.3 Pack como contrato operacional

O Pack **congela** um snapshot coerente: configuração do evento, branding aplicável ao Player, manifesto de mídia, metadados de versão e **licença** (ou referência + assinatura conforme secção 9–10). É o **único** canal suportado de informação da Cloud para o Player no MVP (salvo fluxos explícitos futuros documentados em ADR).

### 2.4 Player como ambiente confiável de execução

O Player **interpreta** o Pack, **resolve** mídia no contexto local, **valida** licença e integridade, **executa** o roteiro visual e **registra** o que for necessário para suporte e auditoria operacional. Ele **não** redefine regras de negócio que contradigem o Pack assinado/licenciado.

### 2.5 Offline como capacidade central

O **núcleo da execução** (carregar Pack, pre-flight, binding, playback conforme roteiro) **não pode depender** de conectividade com a Cloud. Conectividade futura, se houver, é **melhoria**, não **pré-requisito** para o show.

### 2.6 Manifesto antes de mídia real

O sistema **declara** requisitos de mídia (papéis, obrigatoriedade, formatos esperados, identificadores estáveis) **antes** de exigir que arquivos existam na máquina local. A ordem cognitiva e técnica é: **definir o que é necessário → vincular arquivos reais → validar**.

### 2.7 Pre-flight como controle de qualidade

Pre-flight é **componente arquitetural**, não tela secundária. Ele agrega **integridade do Pack**, **licença**, **presença e forma** da mídia e **consistência mínima** do roteiro. Distingue **bloqueante** vs. **aviso** de forma **estável e documentada** (secção 11).

### 2.8 Explicitude acima de automação mágica

Preferir **listas de problemas**, **códigos de razão** e **estados nomeados** a correções silenciosas. O operador deve **entender** por que algo não passou no pre-flight ou por que a execução está limitada.

### 2.9 Logs como parte do comportamento esperado

Logs **não** são adorno: são **superfície de suporte**, **rastreabilidade de exportação** na Cloud e **diagnóstico de palco** no Player. A ausência de logging planejado é **defeito arquitetural**, não “detalhe depois”.

### 2.10 Modularidade sem fragmentação excessiva

Módulos (secções 13–14) devem ter **fronteiras claras** e **dependências acíclicas** onde possível. Evita-se tanto o **monólito informe** quanto a **pulverização** em dezenas de microserviços **no MVP**; a Cloud pode ser **monólito modular** (FastAPI com pacotes internos) com evolução futura guiada por ADR.

---

# 3. Visão macro do sistema

## 3.1 TelaFlow Cloud

**Responsabilidades**

- Autenticação, autorização e **isolamento por organização**.  
- CRUD e **edição estruturada** de eventos, cenas, sorteios, patrocinadores, requisitos de mídia e temas de marca.  
- **Geração** de ExportPackage / artefato de Pack e **registro** de exportações (auditoria).  
- Emissão ou **ancoragem** de informações de licença associadas ao Pack (conforme modelo de licenciamento).  
- API server-side como **fonte de verdade** para persistência relacional.

**Limites**

- **Não** armazena blobs de mídia do cliente no MVP.  
- **Não** orquestra tempo real do palco.  
- **Não** substitui o Player na execução.

**Dependências**

- PostgreSQL; infraestrutura de deploy da Cloud; eventual provedor de identidade (se OIDC/Social for adotado — fora do escopo detalhado aqui, mas deve respeitar multi-tenant).

**O que sabe**

- Usuários, membros, papéis, organizações, eventos e todo o **estado editável** antes do export.  
- Histórico de **quem exportou o quê e quando** (mínimo para auditoria comercial).

**O que não deve saber**

- Caminhos de filesystem da máquina do palco.  
- Detalhes de GPU ou layout multi-monitor do venue (salvo extensões futuras explícitas).  
- Estado volátil de “agora está no ar” do Player em tempo real.

## 3.2 TelaFlow Pack

**Responsabilidades**

- Transportar **snapshot imutável** (na prática: imutável após geração; nova versão = novo export) da configuração necessária ao Player.  
- Incluir **manifesto de mídia** com identificadores estáveis e regras de obrigatoriedade.  
- Incluir **branding** serializado adequado ao runtime local.  
- Incluir **metadados de versão** do formato do Pack e do evento.  
- Incluir **dados ou referência de licença** + **mecanismo de integridade** (ex.: assinatura).

**Limites**

- **Não** é banco de dados operacional; é **artefato de entrega**.  
- **Não** substitui a Cloud para edição colaborativa contínua — edição continua na Cloud; novo export gera novo Pack.

**Dependências**

- Definição de **esquema** e **política de versionamento** (secção 9).  
- Serviço de export na Cloud que **valida** consistência mínima antes de assinar/empacotar.

**O que sabe**

- Tudo o que o Player precisa para **reidratar** o modelo de execução **sem** consultar a Cloud.  
- Identificadores lógicos de slots de mídia; **não** sabe paths absolutos do operador.

**O que não deve saber**

- Credenciais de usuário da Cloud.  
- Dados de outras organizações.  
- Estado de execução (sorteio já realizado, logs locais) — isso é **Player**.

## 3.3 TelaFlow Player

**Responsabilidades**

- Carregar e validar Pack (integridade, versão suportada, licença).  
- **Media binder:** associar arquivos locais aos slots do manifesto dentro de **workspace controlada**.  
- **Preflight engine:** consolidar resultados bloqueantes e avisos.  
- **Execution runtime:** conduzir cenas e momentos conforme Pack, com UX operacional mínima.  
- **Logging** local estruturado.

**Limites**

- **Não** altera o Pack “oficial” em disco como meio de corrigir evento; correções voltam à Cloud e novo export.  
- **Não** implementa editor completo do evento como substituto da Cloud no MVP.

**Dependências**

- Runtime Tauri 2; filesystem local; permissões mínimas.  
- Opcionalmente: segunda tela / fullscreen — sem acoplar a protocolos de streaming como núcleo.

**O que sabe**

- Conteúdo do Pack; resultado do binding local; estado de licença; logs locais; resultados de pre-flight.

**O que não deve saber**

- Segredos de outras instalações; dados de API da Cloud **para o núcleo offline** (chamadas opcionais futuras exigem ADR e não podem quebrar o núcleo offline).

---

# 4. Fronteiras e contratos entre as camadas

## 4.1 Cloud → Pack (export)

**Como a informação sai da Cloud**

- O backend agrega entidades do **evento** e dependentes em um **modelo de exportação** (visão somente leitura para serialização).  
- Valida **regras de exportabilidade** (ex.: evento mínimo coerente, licença emitível).  
- Produz arquivos do Pack + **assinatura** ou pacote contendo assinatura (secção 9).

**O que é permitido**

- Incluir apenas dados **pertencentes à organização** e ao **evento** exportado.  
- Incluir **hashes** de arquivos esperados no manifesto **se** a Cloud os tiver recebido como metadado (ex.: operador colou hash); no MVP típico, hash pode ser **opcional** ou preenchido por ferramenta auxiliar — decisão de produto deve manter **simplicidade** (secção 18).

**O que é proibido**

- Embutir **segredos** de API ou tokens de usuário no Pack.  
- Embutir **mídia binária** do cliente na Cloud no MVP (logo, proibido pelo desenho de mídia).  
- Gerar Pack **sem** identificação de versão e **sem** trilha de auditoria na Cloud.

## 4.2 Pack → Player (consumo)

**Como o Player consome**

- **Pack loader** lê o diretório/arquivo do Pack, verifica **formato** e **integridade**.  
- **License validator** aplica política de licença (secção 10).  
- **Media binder** resolve slots usando **paths relativos à workspace** e/ou mapa persistido localmente.  
- **Preflight engine** consolida tudo antes de liberar execução plena.

**O que é permitido**

- Rejeitar Pack **incompatível** com a versão do Player (com mensagem clara).  
- Persistir **apenas** binding e logs localmente (MVP: JSON; futuro: SQLite se necessário).

**O que é proibido**

- Ignorar falha de **integridade** ou licença **inválida** e “executar mesmo assim” em modo público sem decisão explícita de produto (o padrão deve ser **negar** ou **modo degradado claramente rotulado** — preferir **negar** no MVP).

## 4.3 Cloud ↔ Player (relação proibida de acoplamento)

**Direção normativa:** no MVP, **não existe** canal de controle em tempo real da Cloud para o Player como requisito. Qualquer integração futura (telemetria opt-in, atualização de licença) deve:

- ser **opcional** em relação ao núcleo offline;  
- passar por **ADR**;  
- **não** substituir o Pack como veículo de configuração do show.

**O que é proibido**

- Player chamando API da Cloud para **buscar cenas** ou **mídia** durante o show no fluxo principal.  
- Cloud assumindo **estado ao vivo** do Player como verdade operacional.

**O que pode existir sem violar (futuro, não MVP obrigatório)**

- Upload **opt-in** de logs para suporte; **ping** de versão; renovação de licença **antes** do dia do evento.

---

# 5. Unidade principal de modelagem do produto

## 5.1 Event como unidade central

O **Event** é a unidade central porque o PRODUCT_SPEC descreve o valor em termos de **roteiro visual de um evento ao vivo**: cenas, sorteios, mídia exigida, branding e exportação para palco. Organização, usuários e licença existem para **possibilitar e cobrir** eventos — não o contrário.

## 5.2 Organização das demais entidades

- **Organization** delimita **tenant** e políticas comerciais/agrupamento de eventos.  
- **BrandTheme**, **Scene**, **DrawConfig**, **MediaRequirement**, **Sponsor** (quando usado) orbitam o **Event** como **filhos ou associações dependentes**.  
- **ExportPackage** é **snapshot de exportação** de um **Event** (e metadados de licença) em um instante.  
- **User** e **Membership** existem no nível **Organization** (e opcionalmente escopos no Event, se o produto exigir — preferência MVP: papéis na org + ownership do evento).

## 5.3 Dependentes do evento

- Cenas e ordem/navegação entre momentos de palco.  
- Configurações de sorteio **daquele** evento.  
- Requisitos de mídia **daquele** evento.  
- Referências de patrocínio **quando** modeladas como exibição no contexto do evento.

## 5.4 Entidades em nível de organização

- Organization, Membership, Role, usuários convidados à org.  
- **BrandTheme** pode ser **biblioteca da org** **reutilizável** por vários eventos; ao exportar, o Pack contém o **tema resolvido** (snapshot) efetivo para o evento, para imutabilidade no palco.

## 5.5 Cena (Scene): domínio arquitetural — unidade mínima executável no telão

Sem esta definição, **Scene** degenera em “saco de coisas” e arrasta **editor**, **timeline**, **Pack** e **Player** para modelagem impossível de validar. Vale o seguinte **contrato normativo**:

| Questão | Decisão |
|---------|---------|
| Scene é apenas “container” vazio? | **Não.** É **unidade mínima de execução visível**: cada Scene representa **um estado executável** do telão que o Player **ativa** como passo do roteiro (com composição **tipada**, não buraco genérico). |
| Scene contém “blocos internos” arbitrários? | **Não** no sentido de árvore livre ou canvas. Pode conter **apenas** o que o **schema** de Scene permitir: referências a **mídia principal** (slots `media_id`), **overlays** previstos pelo produto (tipos fechados), **slots de patrocinador** previstos, e **gatilho opcional de sorteio** (referência a `DrawConfig`). Nada disso é **layout livre** nem timeline keyframe. |
| Scene já é a unidade mínima de execução? | **Sim.** O **Player** avança o show **por Scene** (ordem definida no evento/Pack). Não há, na linha base, “sub-cena” executável sem ser Scene — se no futuro existirem variantes, serão **tipos enumerados** ou **Scene filha** com regra explícita em ADR, não composição ad hoc. |
| Canvas livre? | **Explicitamente excluído** (PRODUCT_SPEC, customização por templates). |

**Implicações:** o **editor** na Cloud **ordena e configura** Scenes dentro do Event; o **export** serializa lista ordenada e conteúdo declarativo de cada Scene; o **runtime** do Player **mapeia** “Scene ativa” → **um** conjunto autorizado de camadas/slots/referências, **sem** interpretar desenho arbitrário. **DrawConfig** permanece entidade do evento; a Scene **opcionalmente referencia** qual sorteio pode ser disparado **naquele** momento, sem fundir regra de sorteio com descrição visual solta.

---

# 6. Modelo conceitual de dados do Cloud

Abaixo: entidades principais, **propósito**, **escopo**, **relações** e **nível** (organização / evento / sistema).

### 6.1 User

- **Propósito:** identidade de login e perfil mínimo.  
- **Escopo:** sistema (identidade global); dados sensíveis conforme política de privacidade.  
- **Relações:** participa de **Membership** em **Organizations**.  
- **Nível:** sistema (conta), **não** pertence a um único evento.

### 6.2 Organization

- **Propósito:** tenant comercial e operacional — “quem paga e quem agrupa eventos”.  
- **Escopo:** isolamento de dados; limites de licenciamento podem aplicar-se aqui.  
- **Relações:** possui **Events**, **Memberships**, biblioteca opcional de **BrandThemes**.  
- **Nível:** organização.

### 6.3 Membership / Role

- **Propósito:** autorização dentro da organização (ex.: admin, editor, viewer).  
- **Escopo:** par (User, Organization).  
- **Relações:** referencia **User** e **Organization**; **Role** define permissões.  
- **Nível:** organização.

### 6.4 Event

- **Propósito:** unidade central de trabalho — o “show” lógico.  
- **Escopo:** sempre dentro de uma **Organization**.  
- **Relações:** possui **Scenes**, **DrawConfigs**, **MediaRequirements**; referencia **BrandTheme** (direto ou via resolução); pode referenciar **Sponsors** conforme modelagem.  
- **Nível:** evento.

### 6.5 BrandTheme

- **Propósito:** conjunto de tokens visuais permitidos (cores, fontes, regras de logo) **sem** editor gráfico livre.  
- **Escopo:** tipicamente **organização**, **aplicado** a eventos.  
- **Relações:** reutilizável por múltiplos **Events**; exportado como **snapshot** no Pack.  
- **Nível:** organização (com uso no evento).

### 6.6 Sponsor

- **Propósito:** entidade de patrocinador para exibição ordenada / slots de marca em cenas (alinhado a eventos corporativos).  
- **Escopo:** pode ser **organização** (cadastro mestre) com **uso** no **Event**, ou **somente evento** no MVP — decisão de flexibilidade: **cadastro na org** com **ligação ao evento** evita duplicação.  
- **Relações:** associado a **Event**; pode referenciar **MediaRequirement** para logo/animação.  
- **Nível:** primariamente org, **uso** em evento.

### 6.7 Scene

- **Propósito:** **unidade mínima de execução visível** no telão — um **estado executável** do roteiro (ver secção **5.5**). Nome operacional (abertura, intervalo, premiação) é metadado; o que importa arquiteturalmente é que o Player **ativa** uma Scene de cada vez (salvo políticas futuras documentadas).  
- **Escopo:** sempre pertence a um **Event**; ordenada em relação às demais Scenes do mesmo evento.  
- **Conteúdo permitido (composição tipada, não canvas):** referência a **mídia principal** (slots); **overlays** de tipos **fechados** pelo produto; **slots de patrocinador** previstos; **gatilho opcional** de sorteio (**referência** a `DrawConfig`, sem duplicar regras de sorteio dentro da Scene).  
- **Relações:** referencia **MediaRequirements** / `media_id`; referencia **DrawConfig** quando houver disparo naquele momento; associação a **Sponsor** via slots previstos.  
- **Nível:** evento.  
- **Anti-padrão:** usar Scene como recipiente de “qualquer JSON” ou lista heterogênea sem schema — **proibido** na linha base.

### 6.8 DrawConfig

- **Propósito:** parâmetros de sorteio **naquele** contexto (tipo, pools, regras de exibição pública).  
- **Escopo:** **Event** como dono lógico; **Scene** referencia **opcionalmente** qual `DrawConfig` pode ser acionado **naquele** passo do roteiro (não obrigatório que todo sorteio esteja amarrado a uma Scene, mas **disparo** no palco é **sempre** contextualizado ao roteiro — via Scene ou regra explícita no Pack).  
- **Relações:** **Event**; referências a dados de participantes **se** existirem como entidade futura — MVP pode limitar a listas importadas localmente no Player **sem** Cloud (ADR se cruzar com Cloud).  
- **Nível:** evento (recomendado).

### 6.9 MediaRequirement

- **Propósito:** declara **o que** deve existir (slot lógico): papel, obrigatoriedade, formato esperado, **id estável** (`media_id`).  
- **Escopo:** **Event** (e opcionalmente amarrado a **Scene** ou **Sponsor**).  
- **Relações:** referenciado pelo manifesto exportado; **não** contém blob.  
- **Nível:** evento.

### 6.10 ExportPackage

- **Propósito:** registro de uma **exportação** (metadados, versão, autor, timestamp, checksum do pacote, vínculo ao **Event**).  
- **Escopo:** **Organization** / **Event**.  
- **Relações:** **Event**; possivelmente **License** emitida na mesma operação.  
- **Nível:** evento (com tenant implícito).

### 6.11 License

- **Propósito:** direito de uso do Player para **escopo** definido (organização, evento, janela temporal — ver secção 10).  
- **Escopo:** emitido **no contexto** comercial; armazenado na Cloud para **auditoria** e embutido ou referenciado no Pack.  
- **Relações:** **Organization**; opcionalmente amarrado a **Event** ou **ExportPackage**.  
- **Nível:** sistema + org (política); conteúdo visível ao Player via Pack.

---

# 7. Modelo conceitual do Player local

## 7.1 LocalEventSession

- **Propósito:** estado da sessão corrente: Pack carregado, identificadores de versão, workspace associada, e **fase** alinhada à **máquina de estados do runtime** (secção **14.0**), persistida de forma mínima quando útil.  
- **Persistência MVP:** preferencialmente **sim** (JSON) para recuperação após reinício **durante montagem**; durante show, política pode ser **não sobrescrever** automaticamente estados críticos sem confirmação.  
- **Memória vs. disco:** hot state em memória; **checkpoint** mínimo em disco.

## 7.2 LocalMediaBinding

- **Propósito:** mapa `media_id` → **path relativo** à **workspace root** (ou hash + nome canônico).  
- **Persistência MVP:** **sim** — sem isso, o operador refaz binding a cada abertura.  
- **Nunca** como verdade única em path absoluto opaco: relativo + root declarada.

## 7.3 LicenseState

- **Propósito:** resultado da validação: válida, expirada, inválida, relógio suspeito (se política futura), modo offline de verificação.  
- **Persistência MVP:** pode ser **derivado** do Pack + relógio local; **cache** opcional em JSON **sem** contornar expiração indevida.  
- **Política:** Player **não** “estende” licença sem novo Pack ou fluxo autorizado.

## 7.4 ExecutionLog

- **Propósito:** sequência de eventos de execução (cena ativada, sorteio disparado, erro de mídia, operador confirmou X).  
- **Persistência MVP:** **sim** em arquivo(s) rotacionados ou append-only JSONL — formato exato é especificação derivada; **existência** é obrigatória arquiteturalmente.  
- **Memória:** buffer limitado com flush.

## 7.5 PreflightResult

- **Propósito:** snapshot do último pre-flight: lista de erros bloqueantes, avisos, timestamp, versão do Pack.  
- **Persistência MVP:** **recomendado** (JSON) para o operador **mostrar** ao suporte sem reproduzir passos.  
- **Memória:** estrutura ativa durante UI de pre-flight.

## 7.6 Sobrevivência a reinício

| Dado | Reinício app | Observação |
|------|----------------|------------|
| Pack em disco (somente leitura) | Sim | Fonte externa trazida pelo operador |
| LocalMediaBinding | Sim | Essencial para UX |
| ExecutionLog | Sim | Suporte pós-evento |
| PreflightResult | Recomendado | Diagnóstico |
| Estado volátil de “ao vivo” | Opcional | Política de produto: retomada controlada |

---

# 8. Estratégia oficial de mídia

## 8.1 Por que a Cloud não armazena mídia no MVP

- Alinha-se ao PRODUCT_SPEC e reduz **custo**, **LGPD/complexidade** e **superfície de ataque**.  
- Reforça narrativa **manifesto antes de arquivo**: a produção **declara** o que é necessário; o palco **prove** que existe.  
- Evita que o Player desenvolva dependência oculta de CDN/cloud para **playback**.

## 8.2 O que a Cloud armazena no lugar da mídia

- **MediaRequirement:** papel, `media_id`, obrigatoriedade, tipo esperado (vídeo, imagem, áudio), restrições simples (extensões permitidas, duração máxima se aplicável via metadado declarado).  
- **Metadados opcionais:** nome sugerido, notas, hash **se** fornecido pelo usuário (não obrigatório no MVP).  
- **Nenhum** binário de cliente na Cloud no MVP.

## 8.3 Como o manifesto de mídia funciona

- No Pack, `media-manifest.json` lista **todos** os slots que o Player deve resolver, com **referências** às cenas ou usos.  
- Cada entrada contém **`media_id` estável** (gerado na Cloud, imutável no Pack), **obrigatoriedade**, **tipo**, e **zero ou mais** hints (nome sugerido, extensões).  
- O manifesto é **contrato**; o binding é **cumprimento** local.

## 8.4 Como o Player localiza ou importa mídia

- O operador define uma **workspace root** (pasta do projeto de palco).  
- **Importação assistida:** cópia ou referência de arquivos para layout canônico **dentro** da workspace (ex.: `workspace/media/<media_id>/file.ext`) — política de cópia vs. symlink fica como decisão de implementação **desde que** relativa à root.  
- **Matching:** por `media_id` + validação de tipo/extensão; **não** por “qualquer arquivo com nome parecido” como comportamento silencioso padrão (pode existir sugestão com **confirmação** explícita).

## 8.5 Como o binding local é salvo

- Arquivo `local-binding.json` (nome ilustrativo) na workspace ou perfil da sessão, contendo **apenas** referências relativas à root.  
- Ao abrir Pack + workspace existente, Player **revalida** que arquivos ainda existem e **hashes** se houver.

## 8.6 Por que caminhos absolutos não devem ser base

- Trocam entre máquinas, drives removíveis, usuários Windows/macOS/Linux.  
- Quebram **reproducibilidade** e **suporte**.  
- Contradizem o handoff “leve o Pack + pasta workspace” como unidade operacional.

## 8.7 Relativos + workspace controlada

- **Workspace** é o **único** ancoral para paths.  
- Pack **não contém** `C:\Users\...` ou `/home/...`.  
- Estrutura interna documentada para operadores reduz erro humano.

## 8.8 Obrigatoriedade, opcionalidade e validação

- **Obrigatório ausente** → **bloqueante** no pre-flight.  
- **Opcional ausente** → **aviso**; execução pode prosseguir se política assim definir **explicitamente**.  
- **Tipo/extensão incorretos** → tipicamente **bloqueante** para arquivos obrigatórios.  
- **Duração/resolução** fora do recomendado → **aviso** (MVP), salvo regra de produto que eleve a bloqueante.

---

# 9. Estrutura conceitual do TelaFlow Pack

## 9.1 Composição proposta (arquivos)

| Artefato | Papel |
|----------|--------|
| `pack.json` | Metadados do formato: `pack_version`, `app_min_player`, ids de **event** e **export**, timestamp, **checksum** agregado opcional. |
| `event.json` | Modelo lógico do evento: cenas, referências a sorteios, ordem, metadados de patrocínio conforme export. |
| `branding.json` | Snapshot do **BrandTheme** resolvido (tokens, não editor livre). |
| `media-manifest.json` | Lista de **MediaRequirement** serializados para o Player. |
| `draw-configs.json` | Configurações de sorteio necessárias ao runtime (separado para clareza de versionamento e validação). |
| `license.dat` (ou `license.json`) | Claims de licença: escopo, validade, subject (org/event), ids. Formato exato em spec derivada. |
| `signature.sig` | Assinatura criptográfica sobre um **manifesto de arquivos** (lista de paths internos + hash) ou sobre payload canônico. |

Nomes exatos podem ajustar-se desde que **papéis** permaneçam distinguíveis.

## 9.2 O que serializar

- Somente dados **necessários** ao Player e **já resolvidos** (ex.: tema efetivo, não “link para tema mutável na Cloud”).  
- Identificadores estáveis (`media_id`, `scene_id`, `draw_config_id`).  
- Versões de **esquema** embutidas nos JSON (`schema_version` por arquivo se útil).

## 9.3 O que assinar

- **Conteúdo** dos arquivos de configuração (`event.json`, `branding.json`, `media-manifest.json`, `draw-configs.json`) e metadados de `pack.json`.  
- **Não** assinar blobs de mídia do cliente **que não estão no Pack**; opcionalmente assinar **hashes esperados** se existirem no manifesto.

## 9.4 O que não entra no Pack no MVP

- Binários de mídia do cliente.  
- Credenciais ou PII além do **mínimo** exigido por licença (preferir ids opacos).  
- Histórico completo de edição da Cloud (apenas snapshot).  
- Logs de execução anteriores.

## 9.5 Versionamento

- **`pack_version`:** versão do **formato** do Pack (breaking changes incrementam).  
- **`export_id` / hash:** identifica **esta** exportação.  
- Player recusa formatos **mais novos** que não suporta; para **mais antigos**, política de compatibilidade retroativa documentada em ADR.

## 9.6 Governança de versionamento de schemas

Os artefatos JSON do Pack (`event.json`, `media-manifest.json`, `branding.json`, `draw-configs.json`, etc.) carregam **`schema_version`** (por arquivo e/ou em `pack.json`, conforme spec derivada) como parte do **contrato**. A governança é **centralizada**:

| Regra | Conteúdo |
|-------|-----------|
| **Onde vive a verdade do schema** | Pacote **`packages/shared-contracts`** (ou equivalente no monorepo): **JSON Schema** canônico por artefato do Pack. **Nenhum** time “inventa” campo sem passar pelo contrato versionado. |
| **Mudança compatível (additive)** | Novos campos **opcionais**, sem quebrar leitura de Packs antigos: **ADR** recomendado; `schema_version` ou política de **forward compatibility** documentada; Players antigos **ignoram** o que não entendem **somente se** o PRODUCT_SPEC/ADR assim permitir. |
| **Mudança breaking** | **Obrigatório:** **ADR**; incremento de **`pack_version`**; atualização da **matriz mínima de compatibilidade** **Player ↔ Pack** (quais versões de app leem quais `pack_version`). |
| **Quem valida** | **Cloud (export):** validação contra schema **antes** de assinar o Pack. **Player (load):** validação na importação; rejeição clara se incompatível. |
| **OpenAPI** | Contrato das **APIs** da Cloud (serviço HTTP), **não** substitui JSON Schema do Pack — ver secção **21.3**. |

Sem este processo, evolução do formato vira **compatibilidade implícita** e **bugs de palco** em escala.

---

# 10. Estratégia oficial de licenciamento

## 10.1 O que a licença protege

- Uso do **Player** para executar **Packs** da organização **dentro** do escopo contratado.  
- **Limites** comerciais: tempo, número de eventos ativos, ou evento específico — conforme política de negócio (a arquitetura deve suportar **pelo menos** licença **amarrada ao evento exportado** e/ou **org + validade** no MVP).

## 10.2 Escopo: evento, período ou organização

**MVP recomendado (simples e evolutivo):**

- Claims incluem: `org_id`, `event_id`, `export_id`, `valid_from`, `valid_until` (ou `valid_until` + tolerância de relógio documentada).  
- **Organização** como âncora comercial; **evento** como âncora operacional do Pack.

## 10.3 Como entra no Pack

- Gerada ou **selada** no momento da exportação na Cloud, **anexada** ao Pack como `license.dat` + validação por `signature.sig` que inclui claims.

## 10.4 Como o Player valida

- Verifica **assinatura** com chave pública embutida no Player (ou chain mínima).  
- Verifica **validade temporal** usando o **relógio do sistema local** (ver **16.4** — risco de relógio adulterado ou incorreto).  
- Política MVP sugerida: **bloqueante** se licença **expirada** segundo o relógio local; **aviso** (ou estado `blocked` com mensagem explícita) se relógio **suspeito** — sem exigir solução pesada de NTP/attestation no MVP, mas **sem esconder** a dependência do relógio.  
- Verifica **correspondência** entre claims e conteúdo do `event.json` / `pack.json` (ids).

## 10.5 Expiração ou violação

- **Inválida / adulterada:** recusar execução; mensagem clara; log local.  
- **Expirada:** mesma recusa; orientação “gerar novo Pack na Cloud” se ainda dentro do contrato comercial.  
- **Sem “modo oculto”** que ignore licença no MVP.

## 10.6 Simplicidade no MVP sem travar evolução

- Claims **extensíveis** com campos opcionais ignorados por Players antigos **somente se** compatibilidade forward for política explícita; caso contrário, versionar `license` schema.  
- Renovação: novo export com nova licença embutida — **não** hot-patch opaco.

---

# 11. Conceito arquitetural de pre-flight

## 11.1 Por que é central

O PRODUCT_SPEC exige pre-flight **explícito** e comportamento previsível em falha. Pre-flight é o **único gate** que transforma “arquivos numa pasta” em **garantias** antes de expor o telão.

## 11.2 O que valida

1. **Pack:** formato suportado, integridade criptográfica, versão.  
2. **Licença:** assinatura, escopo, validade.  
3. **Mídia:** todo `media_id` obrigatório com binding resolvido; arquivo existe; tipo/extensão coerente; leitura possível (smoke check opcional).  
4. **Consistência do modelo:** cenas referenciam ids existentes; sorteios referenciados existem; sem ciclos proibidos.  
5. **Ambiente:** permissões mínimas de leitura na workspace (e escrita só onde necessário para logs/binding).

## 11.3 Bloqueante vs. aviso

- **Bloqueante:** impede **início da execução pública** ou transição para modo “ao vivo” até resolução ou override documentado (override **não** recomendado no MVP).  
- **Aviso:** não impede; deve ser **visível** e **registrado** em `PreflightResult` e logs.

## 11.4 Influência na execução

- Transição para o estado formal **`executing`** da máquina de estados do Player (secção **14.0**) **só** ocorre com último pre-flight **sem bloqueantes** e licença/integridade válidas.  
- Rebinding após mudança de arquivo: **reexecutar** pre-flight ou subconjunto **validado** (decisão: mudança de mídia exige **revalidação**); estado pode regressar a `binding_pending` ou `preflight_failed` conforme resultado.

## 11.5 Redução de risco operacional

- Operador e suporte compartilham **mesma linguagem** (lista de checagens).  
- Reduz “funcionou no escritório” sem **workspace** no local: pre-flight falha cedo.

---

# 12. Fluxo técnico completo do produto

Visão **sistema + operação** ponta a ponta:

1. **Autenticação** na Cloud; seleção da **Organization**.  
2. **Criação do Event** (PostgreSQL via FastAPI).  
3. **BrandTheme** escolhido ou criado (org); **associado** ao evento.  
4. **Scenes** criadas e ordenadas.  
5. **DrawConfigs** definidas e vinculadas ao roteiro do evento.  
6. **Sponsors** (se usados) ligados a slots de mídia ou cenas.  
7. **MediaRequirements** declarados por evento/cena; checklist na UI alimentado por **obrigatoriedade**.  
8. **Validação server-side** antes de export (consistência mínima).  
9. **Export:** montagem dos JSON do Pack; geração de **licença**; **assinatura**; registro de **ExportPackage** + auditoria.  
10. **Distribuição:** operador transfere artefato Pack + instruções de workspace para máquina do palco.  
11. **Player:** **Pack loader** → **license validator** → **media binder** (operador coloca arquivos ou importa para workspace).  
12. **Preflight engine** executa validações; UI mostra bloqueantes/avisos.  
13. **Execution runtime:** navegação de cenas, sorteios, playback de mídia conforme Pack.  
14. **ExecutionLog** contínuo; exportação ou cópia para suporte **se** política permitir.  
15. **Pós-evento:** logs retidos localmente; novo ciclo na Cloud para próximo evento ou revisão.

---

# 13. Arquitetura do Cloud (módulos)

**Stack fixa:** frontend **Next.js (App Router)**; backend **FastAPI**; banco **PostgreSQL**.

| Módulo | Responsabilidades | Dependências principais |
|--------|-------------------|-------------------------|
| **auth** | Sessão/token, integração com identidade; **não** embute regras de evento. | User, sessão, config de segurança |
| **organizations** | CRUD org, convites, quotas básicas futuras. | auth, DB |
| **events** | Ciclo de vida do Event, metadados, permissões por role. | organizations |
| **event_editor** | Orquestração de telas/fluxo de edição; **não** substitui validação server-side. | events, demais domínios |
| **scenes** | CRUD e ordenação; validações de referência. | events |
| **draw_configs** | Regras de sorteio; validação de consistência. | events, scenes (opcional) |
| **sponsors** | Cadastro e uso no evento. | organizations, events, media_requirements |
| **media_requirements** | Slots de mídia, obrigatoriedade, ids estáveis. | events (scenes) |
| **export** | Montagem Pack, checksum, assinatura, registro ExportPackage; **falha** se pré-condições não atendidas. | todos os domínios de conteúdo, licensing |
| **licensing** | Emissão de claims, integração com export. | organizations, events |
| **audit_logs** | Exportações, logins relevantes, mudanças críticas (MVP: mínimo viável comercial). | auth, export |

**Modularidade:** pacotes Python por domínio + routers FastAPI; schemas Pydantic por fronteira. **Evitar** “um único CRUD genérico” para Event/Scene/Draw sem validações — cada write path deve carregar **regras de domínio**.

**Risco de CRUD genérico:** perda de **pre-flight na origem** (export inconsistente), bugs silenciosos no Player, impossibilidade de auditoria significativa.

---

# 14. Arquitetura do Player (módulos)

**Stack fixa:** **Tauri 2**; UI **React + Vite**.

## 14.0 Máquina de estados do runtime (comportamento normativo)

O runtime de palco **deve** implementar uma **máquina de estados explícita** — não é detalhe de implementação oculto, é **comportamento do produto**: evita estados impossíveis (“executando sem pack”, “ao vivo com pre-flight falho”) e uniformiza UI, logs e suporte.

**Estados formais (nomes normativos):**

| Estado | Significado |
|--------|-------------|
| **`idle`** | Aplicação pronta; **nenhum** Pack carregado em sessão ativa (ou sessão explicitamente resetada). |
| **`pack_loaded`** | Pack lido e parseado; integridade/formato aceitos até aquele ponto; pode faltar binding ou pre-flight completo. |
| **`binding_pending`** | Pack válido, mas **mídia obrigatória** ainda não totalmente vinculada na workspace. |
| **`preflight_failed`** | Última execução do pre-flight retornou **bloqueantes**; execução pública **não** permitida até correção ou novo ciclo. |
| **`ready`** | Pre-flight **sem** bloqueantes; licença e integridade OK; operador pode iniciar **execução** do roteiro. |
| **`executing`** | Telão sob controle do roteiro; **Scenes** ativadas conforme Pack (secção 5.5). |
| **`paused`** | Execução **suspensa** explicitamente pelo operador (reservado; pode ser opcional no MVP, mas o **estado** existe no modelo para não improvisar depois). |
| **`finished`** | Evento **encerrado** pelo fluxo operador ou término explícito do roteiro. |
| **`blocked`** | **Impasse fatal** até ação corretiva: licença inválida/expirada, assinatura quebrada, `pack_version` incompatível, ou erro irrecuperável definido pelo produto. Distinto de `preflight_failed` quando o bloqueio **não** se resolve só com binding (ex.: Pack inválido). |

**Regras:**

- Transições **só** por eventos nomeados (carregar pack, binding atualizado, pre-flight concluído, operador inicia/pausa/encerra, erro fatal).  
- Toda mudança de estado **relevante** para operação **deve** ser **logada** (secção 17).  
- O módulo **execution_runtime** **implementa** esta máquina; UI e **local_state** **refletem** o mesmo enum — **proibido** duplicar “estado fantasma” só no React sem alinhar ao núcleo.

## 14.1 Módulos

| Módulo | Responsabilidades | Dependências |
|--------|-------------------|--------------|
| **pack_loader** | I/O do Pack, parse, verificação de `pack_version` e schema (contrato **shared-contracts**). | filesystem |
| **license_validator** | Cripto + claims + **relógio local** (com consciência do risco 16.4). | pack_loader |
| **preflight_engine** | Orquestra checks; produz PreflightResult; **alimenta** transições para `ready` / `preflight_failed`. | pack_loader, license_validator, media_binder |
| **media_binder** | UI + persistência de LocalMediaBinding; import para workspace; transições para/do `binding_pending`. | filesystem, local_state |
| **execution_runtime** | **Máquina de estados** da secção 14.0; ativação de **Scene**; playback; displays. | preflight_engine |
| **local_state** | Leitura/gravação JSON (MVP); persistência de fase atual coerente com 14.0; futura migração SQLite. | filesystem |
| **logging** | ExecutionLog, mudanças de estado do runtime, níveis, rotação, correlação com `export_id`. | local_state |

**Ordem de inicialização sugerida:** `idle` → loader → `pack_loaded` ou `blocked` → license → binder → `binding_pending` conforme gaps → preflight → `ready` ou `preflight_failed` → operador → `executing` / `paused` / `finished`.

**Previsibilidade:** estados nomeados na UI **idênticos** ao modelo normativo; **não** misturar edição de Pack com execução no mesmo modo sem fricção intencional.

---

# 15. Persistência e estado

## 15.1 PostgreSQL (Cloud)

- **Users, Organizations, Memberships, Roles.**  
- **Events, Scenes, DrawConfigs, MediaRequirements, Sponsors, BrandThemes.**  
- **ExportPackages, License records, Audit log entries.**

## 15.2 JSON local (Player, MVP)

- `local-binding.json`, `session.json`, `preflight-last.json`, logs em JSONL ou equivalente.  
- **Sem SQLite no MVP inicial**, conforme decisão fixa.

## 15.3 Logs locais

- **ExecutionLog** append-only; política de rotação e tamanho máximo (spec derivada).  
- **Não** logar segredos; **não** logar dados pessoais desnecessários de participantes de sorteio além do necessário para compliance interno.

## 15.4 O que não precisa persistir ainda

- Cache de renderização pesada; previews gerados automaticamente **se** não forem promessa do MVP.  
- Estado remoto do Player na Cloud.

## 15.5 Quando SQLite local faz sentido

Sinais de maturidade:

- Volume de bindings, múltiplos Packs e histórico longo **inviável** em JSON plano com performance aceitável.  
- Consultas complexas locais (ex.: “últimos 50 eventos nesta máquina”) viram requisito de suporte.  
- Necessidade de **transações** entre binding + logs + flags de execução.  
- **ADR obrigatório** antes de introduzir SQLite; migração de JSON → SQLite planejada **uma vez**, não ad hoc.

---

# 16. Segurança e integridade

Postura **pragmática**, alinhada a SaaS B2B sério — sem paranoia performática.

## 16.1 Cloud

- **Autenticação:** padrão da stack (sessão segura, HTTPS obrigatório).  
- **Autorização:** toda rota com **escopo de organização**; testes de **IDOR** entre tenants são requisito de qualidade.  
- **Multi-tenant:** segregação lógica no PostgreSQL com `organization_id` em todas as tabelas de dados de cliente.  
- **Validação server-side:** o backend **revalida** o que o Next.js envia; frontend **não** é fonte de verdade.  
- **Rastreabilidade de exportações:** quem, quando, qual `export_id`.  
- **Proteção entre clientes:** políticas de acesso + logs de auditoria mínimos.

## 16.2 Pack

- **Integridade:** hashes + assinatura; recusa de tampering.  
- **Versionamento:** recusa de formato incompatível sem atualização do Player.  
- **Adulteração simples:** assinatura cobre manifesto de arquivos; alteração quebra assinatura.

## 16.3 Player

- **Permissões mínimas** no Tauri (filesystem scope à workspace e diretório do Pack).  
- **Leitura controlada:** APIs de filesystem apenas nos módulos **pack_loader** e **media_binder**.  
- **Validação de integridade** antes de confiar no conteúdo.  
- **Execução imprópria:** não carregar Pack de fontes arbitrárias sem confirmação do operador; **não** executar scripts embutidos não previstos no spec (Pack **não** contém lógica Turing-completa arbitrária no MVP).  
- **Licença inválida:** negar execução; mensagem e log claros; transição para estado **`blocked`** (secção 14.0).

## 16.4 Relógio local como risco operacional (licença e validade)

O Player **offline** (ou mesmo online sem relógio confiável) **depende** do **relógio do sistema operacional** para avaliar `valid_from` / `valid_until` e afins. Isso é **risco conhecido**, não edge case obscuro:

- **Relógio adulterado ou errado** pode fazer licença **parecer** válida quando não deveria, ou **inválida** quando o contrato ainda vigora — impacto direto em **suporte** e **disputa comercial**.  
- **Não** é obrigatório no MVP implementar NTP forçado, hardware attestation ou rede de confiança — mas a arquitetura **deve:** (1) **documentar** a dependência do relógio local em mensagens internas/playbook de suporte; (2) **preferir** comportamento **conservador** (ex.: recusar com mensagem clara em caso de inconsistência detectável, como validade “impossível”); (3) permitir **evolução** futura (janela de tolerância, verificação opcional online **antes** do show) via **ADR**, **sem** quebrar o núcleo offline.

Este item **complementa** a secção 10; não substitui política comercial de tolerância de relógio, que deve ser **explícita** no produto quando necessário.

---

# 17. Observabilidade e auditoria

## 17.1 Cloud — o que logar (MVP mínimo)

- Autenticações falhas/sucesso (com moderação de PII).  
- Exportações: `export_id`, `event_id`, `user_id`, timestamp, resultado.  
- Erros server-side com correlação `request_id`.  
- Mudanças administrativas críticas (membro adicionado, role alterada).

## 17.2 Player — o que logar

- Carregamento de Pack, resultado de integridade e licença.  
- **Transições da máquina de estados do runtime** (secção 14.0), no mínimo quando sair de `idle` / entrar em `blocked` / `ready` / `executing` / `finished`.  
- Cada pre-flight com resumo de contagem bloqueante/aviso.  
- Ativação de **Scene** e ações de sorteio (nível de detalhe conforme privacidade).  
- Erros de mídia (arquivo sumiu, decode falhou).

## 17.3 Uso operacional

- Suporte pede `export_id`, versão do Player, trecho de log e último PreflightResult.  
- Comprador vê na Cloud **trilha de export** para governança.

## 17.4 MVP vs. depois

- **MVP:** logs locais arquivo + Cloud audit mínimo.  
- **Depois:** pipeline centralizado (SIEM), telemetria opt-in, dashboards — apenas com ADR e privacidade.

---

# 18. Decisões de MVP e simplificações inteligentes

| Simplificação | Por que é aceitável | Como evoluir |
|---------------|---------------------|--------------|
| Sem upload de mídia na Cloud | Reduz escopo e custo; manifesto cobre o handoff | CDN/objeto com ADR + opcionalidade |
| Sem SQLite local | Menos superfície no Player inicial | ADR ao atingir sinais da secção 15.5 |
| Sem white-label complexo | PRODUCT_SPEC exclui para MVP | Temas adicionais e custom domains |
| Sem editor visual irrestrito | Evita virar produto errado (PRODUCT_SPEC §2) | Templates controlados crescentes |
| Licença simples por claims | Desbloqueia comercialização | Entitlements ricos, offline grace policy documentada |
| Hash de mídia opcional na Cloud | Menos fricção na autoria | Campo obrigatório para clientes enterprise |

Cada evolução **preserva** o fluxo Cloud → Pack → Player salvo revisão do PRODUCT_SPEC.

---

# 19. Anti-padrões e riscos arquiteturais

1. **Acoplar Player diretamente à Cloud** para dados de show.  
2. **Persistir path absoluto** como única fonte de verdade de mídia.  
3. **Editor canvas livre** cedo demais — desvia categoria de produto.  
4. **CRUD genérico** sem validação de domínio por tabela.  
5. **Lógica sensível só no frontend** Next.js.  
6. **Pular logs e validações** “para ganhar velocidade”.  
7. **Gerar Pack sem versionamento** claro de formato.  
8. **Silenciar falhas** de licença ou integridade.  
9. **Embutir segredos** no Pack.  
10. **Executar mídia de fora da workspace** sem trilha e sem revalidação.  
11. **Múltiplas verdades** — editar evento na Cloud e no Player concorrentemente.  
12. **Feature solta** sem atravessar export e pre-flight.  
13. **Scene como “saco de coisas”** sem schema — viola secção 5.5.  
14. **Runtime de palco sem máquina de estados explícita** — flags booleanas esparsas no lugar do modelo 14.0.  
15. **Regras de negócio pesadas em `shared-contracts`** — viola secção 21.4.  
16. **Alterar schema do Pack** sem ADR, sem incremento de `pack_version` e sem matriz Player ↔ Pack.

---

# 20. Critérios arquiteturais para aceitar futuras features

Uma feature só é aceita se:

1. **Respeita** princípios das secções 2 e o PRODUCT_SPEC.  
2. **Encaixa** nas fronteiras da secção 4 — se cruzar Cloud↔Player em tempo real, exige **ADR** e atualização desta spec.  
3. **Não corrói** o fluxo Cloud → Pack → Player como narrativa principal.  
4. **Impacto arquitetural** documentado (dados novos, novos módulos, migrações).  
5. **Não reclassifica** o TelaFlow como item excluído no PRODUCT_SPEC §2 sem decisão de produto explícita.

---

# 21. Estrutura sugerida de repositório e documentação

## 21.1 Documentação

```
docs/
  specs/
    PRODUCT_SPEC.md          # normativo produto (raiz pode apontar para cá)
    ARCHITECTURE_SPEC.md
  adr/
    0000-template.md
```

## 21.2 Código (monorepo sugerido para coerência de contratos)

```
apps/
  cloud-web/                 # Next.js App Router
  cloud-api/                 # FastAPI (ou cloud-api como pacote único)
  player/                    # Tauri 2 + React (Vite)
packages/
  shared-contracts/          # Tipos / JSON Schema / OpenAPI client gerado — sem lógica de negócio pesada
  shared-constants/          # Versões de pack, códigos de erro de pre-flight
```

**Lógica:** um único repositório facilita **versionar Pack format** e **gerar clientes** alinhados; multi-repo só se **processo de release** maduro garantir sincronização de `shared-contracts`.

**Alternativa multi-repo:** `telaflow-contracts` versionado semântico consumido por Cloud e Player — exige disciplina de release **maior** que o MVP típico tolera.

## 21.3 Estratégia oficial de contratos (Pack vs API)

Separação **intencional** — evita misturar **artefato** com **serviço**:

| Artefato | Contrato canônico | Uso |
|----------|-------------------|-----|
| **TelaFlow Pack** (arquivos JSON no disco) | **JSON Schema** versionado em **`packages/shared-contracts`** | Validação na **exportação** (Cloud) e no **carregamento** (Player); geração de tipos auxiliares se desejado. |
| **TelaFlow Cloud APIs** (HTTP) | **OpenAPI** (espelhando FastAPI ou fonte gerada) | Cliente Next.js, testes de contrato, documentação de integração; **não** substitui o schema do Pack. |

**Por quê:** o Pack **viaja** fora do servidor, pode ser armazenado em mídia removível e lido **anos** depois com versão antiga de Player — o contrato **deve** ser **declarativo, portável e validável** sem runtime da Cloud. A API é **efêmera** e **orientada a serviço**; OpenAPI é a ferramenta natural.

## 21.4 Regra formal: `shared-contracts` não carrega domínio pesado

O pacote **`shared-contracts`** (e pacotes irmãos **estreitos** como `shared-constants`, se existirem) **deve** conter **apenas**:

- **JSON Schema** (e metadados) dos artefatos do Pack;  
- **Fragmentos / especificação OpenAPI** ou artefatos **gerados** a partir dela, quando compartilhados;  
- **Enums** e **constantes** estáveis (códigos de erro de pre-flight, nomes de estados do runtime, versões de formato);  
- **Tipos** auxiliares gerados (ex.: TypeScript) **derivados** dos schemas, sem lógica.

**Nunca** (na linha base normativa):

- Regras de **sorteio**, **licenciamento**, **quem pode exportar**, **validade comercial**;  
- Algoritmos de **composição de Scene** ou **playback**;  
- Qualquer lógica que **deveria** viver no **FastAPI** (autoridade) ou no **Player runtime** (execução).

**Motivo:** caso contrário, `shared` vira **monólito distribuído** com dependências circulares, duplicação de verdade e testes impossíveis. **Domínio** fica em **cloud-api** e **player**; **shared** é **contrato e vocabulário**.

---

# 22. Encerramento normativo

Esta **ARCHITECTURE_SPEC** é **normativa** para implementação do TelaFlow. Código, módulos, persistência e integrações **devem obedecer** às fronteiras, ao modelo de mídia, ao Pack, à licença, ao pre-flight, à **definição de Scene (5.5)**, à **máquina de estados do Player (14.0)** e à **governança de schemas (9.6)** aqui definidos.

**Mudanças relevantes** — novo canal Cloud↔Player, armazenamento de mídia na Cloud, mudança no formato do Pack, relaxamento de offline para o núcleo, **mudança na semântica de Scene**, **novos estados de runtime** — exigem **ADR** e **revisão** desta especificação e, quando aplicável, do **PRODUCT_SPEC**.

---

# 23. Premissas operacionais do runtime

Resumo **operacional** para **congelamento** de versão e alinhamento produto–engenharia:

1. **Scene** é a **unidade mínima executável** no telão — estado visível tipado; **não** canvas livre nem recipiente genérico (secção **5.5**).  
2. O **Player** opera com **máquina de estados explícita** (`idle` … `blocked`, secção **14.0**); transições e falhas **não** são improvisadas com flags soltas.  
3. **`shared-contracts`** contém **schemas, enums, constantes e códigos** — **não** regras de negócio pesadas (secção **21.4**).  
4. O **schema do Pack** é **governado centralmente**; toda mudança **breaking** exige **ADR**, **`pack_version`** e **matriz Player ↔ Pack** (secção **9.6**).  
5. **JSON Schema** governa o **Pack**; **OpenAPI** governa as **APIs** da Cloud (secção **21.3**).  
6. **Relógio local** é **dependência operacional conhecida** para licença e validade; risco documentado (**16.4**), comportamento conservador e evolução por ADR.

---

*Documento interno de arquitetura — TelaFlow. Derivado do PRODUCT_SPEC v1.1.*
