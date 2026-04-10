# TelaFlow — Especificação Funcional do Pack Export (PACK_EXPORT_FEATURE_SPEC)

**Versão:** 1.0.2  
**Status:** Documento normativo — referência para **exportação de evento**, **serialização**, **estrutura de artefatos**, **assinatura**, **versionamento**, **integridade** e **consistência mínima pré-export** na **TelaFlow Cloud**  
**Última revisão:** 2026-04-10  
**Domínio SaaS:** app.telaflow.ia.br  

**Hierarquia normativa:** Este documento é **derivado e subordinado** a, **nesta ordem**: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md), [UI_SPEC.md](./UI_SPEC.md), [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md), [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md). Em caso de ambiguidade ou conflito aparente, **prevalece** o documento **mais acima** na lista; o módulo de Pack Export **deve** ser ajustado (via revisão deste arquivo e **ADR** quando couber) para restabelecer alinhamento.

**Escopo:** comportamento funcional e **contrato** do **artefato exportado** — **sem código**, **sem DDL**, **sem algoritmos criptográficos detalhados**. Schemas JSON canónicos, formatos exatos de licença e políticas numéricas de timeout pertencem a **`shared-contracts`** e especificações derivadas, **desde que** obedeçam a este documento e à **ARCHITECTURE_SPEC**.

---

## Prefácio

O **Pack Export** é o **único canal normativo** no MVP pelo qual a TelaFlow Cloud **entrega** ao TelaFlow Player o **contrato operacional** de um evento: roteiro **congelado**, identidade visual **resolvida**, requisitos de mídia **declarados**, sorteios **parametrizados** e licença **ancorada** àquela exportação. Não é um anexo ao produto: é a **materialização** da promessa **“Cloud → Pack → Player”** do [PRODUCT_SPEC.md](./PRODUCT_SPEC.md).

O **Pre-flight** no Player **pressupõe**, entre outras checagens, que o Pack apresenta **integridade** verificável, **schema** consistente com `shared-contracts`, **assinatura** válida sobre o conjunto contratual e **referências internas resolvidas** (grafo executável sem ids quebrados) — conforme [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) e grupo **G1** em particular. O **Event Editor** **pressupõe** que o export **consome** um snapshot **já** disciplinado pelo editor. Este documento **fecha** a responsabilidade da **Cloud** na geração desse artefato.

---

# 1. Papel do Pack Export no produto

## 1.1 Por que é central

Sem export **governado**, o TelaFlow deixa de ser **um sistema**: torna-se **autoria na web** + **ficheiros soltos** no palco. O PRODUCT_SPEC (§5.2, §6) posiciona o Pack como o elo que **congela** o que foi aprovado na Cloud e **transporta** validade comercial e operacional até à máquina local. O Pack Export é o **processo e o resultado** dessa operação na Cloud — **não** opcional, **não** substituível por “copiar pasta do projeto”.

## 1.2 Por que é mais do que um download de ficheiros

Um download **genérico** não **congela** semântica de negócio, não **amarra** licença ao **instante** da exportação, não **garante** que o Player recebe **apenas** o que o schema permite e não **inclui** mecanismo normativo de **integridade**. O Pack Export produz um **snapshot fechado**: identificadores estáveis (`export_id`, `media_id`, `scene_id`, `draw_config_id`), **versão de formato** (`pack_version`), **versões de schema** por artefato e **assinatura** sobre o conjunto **contratual** — isto **diferencia** entrega **auditável** de ficheiros **acoplados por convenção**.

## 1.3 Por que é o contrato operacional do produto

O Player **não** renegocia o evento com a Cloud durante o núcleo offline ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.4, §4.3). Tudo o que o runtime **precisa** para interpretar o roteiro **deve** estar **dentro** do Pack **ou** derivável **localmente** (binding, workspace). O export **define** esse limite: **o que está fora do Pack é, por norma, inexistente para o Player** — salvo fluxos futuros documentados em ADR. Daí o Pack ser **contrato**: direitos, conteúdo lógico e obrigações de mídia **declaradas**, não **inferidas**.

---

# 2. O que o Pack Export precisa resolver

| Necessidade | O que o módulo de export **deve** garantir |
|-------------|-------------------------------------------|
| **Congelar estado exportável** | Transformar o estado **persistido** e **válido** do evento (e dependentes) numa **visão somente leitura** imutável após geração — nova revisão na Cloud **implica** novo export, novo `export_id`. |
| **Serializar dados consistentes** | Emitir JSON (e artefatos associados) que **validam** contra os schemas canónicos em `shared-contracts` **antes** de assinar; **sem** campos “soltos” fora do contrato. |
| **Garantir contrato com o Player** | Incluir **apenas** o que a **ARCHITECTURE_SPEC** §3.2, §9 e §11 descrevem como necessário ao runtime; **alinhar** com o que o **Pre-flight** valida (integridade, licença, referências internas). |
| **Garantir previsibilidade** | Mesmo evento no mesmo estado exportável, mesma política de licença e mesma versão de pipeline de export → **mesmo** conjunto semântico de artefatos (salvo campos **explicitamente** não determinísticos documentados — ex.: timestamp — que **não** podem alterar **decisões** de schema ou de assinatura **sem** novo `export_id`). |
| **Garantir integridade mínima** | **Assinar** o payload contratual acordado; **registar** exportação na Cloud para **auditoria** (PRODUCT_SPEC §7); **recusar** gerar Pack **sem** `pack_version`, `export_id` e trilha mínima. |

## 2.1 Determinismo semântico do export

Para **mesmo** snapshot lógico (mesmo evento e dependentes no estado exportável, mesma política de pipeline e mesma `pack_version` / `schema_version`), o export **deve** produzir a **mesma estrutura semântica**: **mesmos** ficheiros contratuais, **mesma** ordem canónica (§6.1), **mesmos** ids de **domínio** (`event_id`, `media_id`, `scene_id`, `draw_config_id`, … — §6.4).

**Diferenças permitidas** entre **duas** exportações **quando** o estado persistido do evento **não** mudou (reexport “a frio”): **`export_id`** (sempre **novo** por operação), **`generated_at`**, o **bloco** de licença **na parte** que referencia `export_id` / instante de emissão, e **`signature.sig`** (e **hashes** do manifesto de ficheiros) **como** consequência. **Todo** o **restante** — `event.json`, `branding.json`, `media-manifest.json`, `draw-configs.json`, e em `pack.json` **todas** as chaves **exceto** `export_id`, `generated_at` e campos **puramente** derivados desses (ex.: checksum agregado **se** definido como hash sobre o conjunto **incluindo** esses metadados) — **deve** ser **idêntico** **byte a byte** **após** normalização de serialização (§6.2–6.3). Desvios **sem** mudança de dados na Cloud são **defeito** de pipeline **salvo** ADR.

**Motivo:** assinatura, hashing, diffs, suporte e testes de regressão **assumem** “mesmo input lógico → mesmo payload **normalizado**”; ruído de serialização (ordem de chaves arbitrária, `null` vs omissão, BOM, newlines mistos) **destrói** essa propriedade.

---

# 3. O que o Pack Export NÃO deve virar

| Anti-alvo | Por quê |
|-----------|---------|
| **Dump bruto da base de dados** | Tabelas internas, chaves surrogate de ORM, histórico de edição e campos de infraestrutura **não** são o contrato do palco; expõem acoplamento e **quebram** evolução. |
| **Arquivo ZIP de ficheiros sem governação** | Sem `pack.json`, sem schema, sem assinatura, o Player **não** tem **norma** para rejeitar adulteração nem para versionamento. |
| **Inferência no Player** | O Player **não** “adivinha” campos omitidos, **não** reconstrói roteiro a partir de convenções implícitas e **não** completa lacunas com defaults **não** escritos no Pack ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) alinhado a **explicitude**). |
| **Export de estados ambíguos** | Cenas em `draft`, referências quebradas, `DrawConfig` exigido mas ausente **não** devem ser **selados** como se fossem executáveis — ver §14. |
| **Canal paralelo de verdade** | Enviar “JSON extra” por email ou API **fora** do Pack **não** substitui o contrato; o MVP **não** admite o Player depender disso para o núcleo do show ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §4.3). |
| **Repositório de mídia binária** | No MVP, a Cloud **não** armazena blobs de mídia do cliente; o Pack **não** embute vídeo/imagens operacionais — só **manifesto** e metadados ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §8.1–8.2). |

---

# 4. Momento correto do export

## 4.1 Quando o evento **pode** ser exportado

Quando **todas** as condições abaixo se verificam **em simultâneo**:

- O utilizador tem **permissão** de exportação na organização (papel / política — detalhe em modelo de autorização, fora desta spec).  
- O backend **validou** o snapshot candidato contra as regras **bloqueantes** de §14 (e política comercial de licença emitível, se aplicável).  
- Não existe **bloqueante agregado** do editor que impeça o selo (ex.: existência de Scene em `draft` ou `blocked` conforme [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §5.2).  
- A operação de exportação **completa** gera `export_id`, artefatos versionados e **registo** de auditoria (§20).

## 4.2 O que precisa estar válido **antes**

- **Roteiro:** lista ordenada de Scenes **persistida** (`sort_order` canónico — EVENT_EDITOR §5.1); cada Scene **exportável** em estado que **não** viole regras bloqueantes.  
- **Referências internas:** `media_id`, `draw_config_id`, referências a patrocínio/slots **resolvem** para entidades **presentes** no snapshot.  
- **Branding:** tema **resolvido** para o evento (snapshot, não ponteiro mutável para biblioteca sem resolver).  
- **Licença:** política comercial permite **emissão** ou **ancoragem** para aquele evento/export (ARCHITECTURE §10 — detalhe de claims em spec derivada).

## 4.3 O que **impede** exportar

- Qualquer violação **bloqueante** de §14.  
- Falha de validação **schema** no pipeline de export.  
- Indisponibilidade de **assinatura** ou de serviço crítico **sem** política de fallback **aprovada** em ADR (o padrão é **não** emitir Pack **sem** assinatura).  
- Tentativa de export **sem** `organization_id` / `event_id` coerentes com o tenant (isolamento — ARCHITECTURE §3.1).

---

# 5. Relação com o estado do Event Editor

## 5.1 O export **depende** da consistência do editor

O Event Editor **define** Scenes, ordem, vínculos a `MediaRequirement`, `DrawConfig` e branding aplicável. O export **lê** esse estado **via** modelo de exportação **somente leitura** agregado no backend ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §4.1) — **não** duplica regras de negócio em “segundo editor”.

## 5.2 O export **não** corrige o editor

Ambiguidades, referências quebradas ou cenas incompletas **devem** ser **rejeitadas** com mensagens **acionáveis** na Cloud (UI_SPEC §5.10, §9.6) — **não** “corrigidas” silenciosamente no momento do Pack. **Correção** = alteração **persistida** no editor + **novo** export.

## 5.3 O export **consome** snapshot do evento

No instante da exportação, o sistema **materializa** uma **visão fechada**: valores efetivos do evento, cenas ordenadas, manifesto de mídia completo para aquele evento, draw configs necessários, branding resolvido. **Alterações posteriores** na Cloud **não** alteram Packs **já** gerados; produzem **novo** `export_id` na próxima exportação (§19).

---

# 6. Estrutura oficial do Pack (MVP)

A composição **normativa** alinha-se a [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.1. Nomes de ficheiro podem ajustar-se em spec derivada **desde que** os **papéis** abaixo permaneçam **distinguíveis** e o `pack.json` permaneça **raiz semântica**.

| Artefato | Papel | Obrigatoriedade MVP |
|----------|--------|---------------------|
| **`pack.json`** | Manifesto principal do Pack: formato, ids, timestamps, versões, referência ao conjunto assinado. | **Obrigatório** |
| **`event.json`** | Snapshot lógico do evento: metadados exportáveis, **lista ordenada de Scenes** (serialização do roteiro), referências a sorteios/patrocínio conforme schema. | **Obrigatório** |
| **`branding.json`** | Snapshot do **BrandTheme** **resolvido** (tokens e regras aplicáveis ao Player — **não** editor gráfico livre). | **Obrigatório** se o evento tiver branding aplicável; se o produto definir tema **mínimo por defeito**, contém esse **default resolvido**. |
| **`media-manifest.json`** | Lista canónica de **MediaRequirement** serializados (`media_id`, obrigatoriedade, tipos, papéis) — contrato para binding local. | **Obrigatório** (pode ser array vazio **só se** o schema e o evento **permitirem** zero slots — política de produto; na prática típica há **≥1** entrada). |
| **`draw-configs.json`** | Conjunto de **DrawConfig** necessários ao runtime, **sem** duplicar regras dentro de `event.json` além de **referências** por id. | **Obrigatório** se existir **≥1** sorteio no evento; caso contrário conforme schema (array vazio ou omissão **só** se schema o permitir **explicitamente**). |
| **`license.dat`** ou **`license.json`** | Claims de licença: escopo, validade, ligação a org/evento/export. Formato exato: spec derivada ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §10). | **Obrigatório** |
| **`signature.sig`** | Assinatura sobre manifesto de ficheiros contratuais ou payload canônico (§16). | **Obrigatório** |

**Nota sobre `scenes.json`:** a linha base **serializa** as Scenes **dentro** de `event.json` para **um** grafo de evento **coerente**. Um ficheiro **`scenes.json`** separado **só** é admissível com **ADR** e **equivalência** contratual com o schema canónico (evitar duas fontes de verdade **sem** governação).

**O que **não** entra no layout MVP:** binários de mídia do cliente, credenciais de API, PII além do mínimo de licença, histórico completo de edições, logs de execução ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.4).

## 6.1 Ordem canónica de ficheiros e de serialização para assinatura

A ordem abaixo é **normativa** para: (1) **construção** do manifesto de ficheiros cuja lista de hashes alimenta a **assinatura**; (2) **verificação** no Player (loader / pre-flight **G1**); (3) **debug** e ferramentas que comparem Packs.

| # | Ficheiro (nome lógico) |
|---|-------------------------|
| 1 | `pack.json` |
| 2 | `event.json` |
| 3 | `branding.json` |
| 4 | `media-manifest.json` |
| 5 | `draw-configs.json` |
| 6 | `license.dat` **ou** `license.json` (um **único** artefato de licença por Pack — o nome exato segue spec derivada) |
| 7 | `signature.sig` |

**Regras:**

- **`signature.sig` entra por último** na lista **lógica** de “ficheiros do Pack” para documentação e tooling; **não** é incluído no **payload** que a própria assinatura cobre (a assinatura **cobre** os artefatos 1–6 e/ou o manifesto derivado — §16).  
- Qualquer **ficheiro contratual adicional** futuro (ADR) **insere-se** na ordem **com posição documentada** (nunca “no fim sem regra”).  
- **Serialização canónica** de cada JSON para cálculo de hash **deve** seguir §6.2 (encoding, newlines, omissão vs `null` — §6.3).

## 6.2 Codificação normativa dos ficheiros JSON do Pack

Todos os artefatos **JSON** do Pack **devem** ser:

- **UTF-8** codificação de caracteres **exclusiva**;  
- **Sem BOM** (byte order mark **proibido**);  
- **Newline consistente:** **LF** (`\n`) como terminador de linha **em todo** o ficheiro — **não** misturar CRLF/LF no mesmo artefato.

**Motivo:** diferenças invisíveis na UI **alteram** hash e **falham** verificação de integridade **sem** mudança de conteúdo lógico; o Player e a Cloud **devem** alinhar-se a **uma** norma **única**.

## 6.3 Política de nullability no Pack

Quando um campo **não** se aplica ao caso concreto (opcional não usado, ramo de tipo que **não** inclui determinada propriedade), a forma **normativa** no Pack é **omitir** a chave (**ausência**).

- **`null` explícito** **não** é preferido **salvo** o **JSON Schema** canónico desse artefato **exigir** `null` para distinguir semântica (“presente mas vazio” vs “ausente”) — caso **raro**; a **predefinição** do produto é **ausência**.  
- O Player **não** deve **tratar** `null` e “chave ausente” com **comportamentos** divergentes **sem** regra **escrita** no schema.

**Motivo:** simplifica parsers, reduz ramos no runtime e **alinha** o determinismo de §2.1 com **uma** convenção **única**.

## 6.4 Ids estáveis de domínio versus ids efémeros do export

| Classe | Exemplos | Regra |
|--------|----------|--------|
| **Ids de domínio** | `event_id`, `organization_id`, `media_id`, `scene_id`, `draw_config_id` | **Gerados e persistidos** na Cloud **no** ciclo de vida da entidade; o export **copia** esses valores para o snapshot **sem** os **regenerar**. **Reexportar** o **mesmo** evento **sem** criar entidades novas na Cloud **preserva** os **mesmos** ids de domínio. |
| **Ids efémeros do export** | `export_id` (e timestamps como `generated_at`) | **Novos** em **cada** operação de export **bem-sucedida**. |

**Proibição:** o pipeline de export **não** pode “renumerar” `media_id`, `scene_id` ou `draw_config_id` **só** porque é um novo ficheiro — isso **quebra** binding local, relatórios de suporte e correspondência editor ↔ Pack. **Única** exceção: **migração** ou **correção** **explícita** com ADR e **novo** `pack_version`.

## 6.5 Forma do documento: nesting moderado

O Pack **privilegia** **estrutura aninhada moderada**: agrupar por **domínio** (`event.json` com Scenes como array ordenado; draw configs **referenciados** por id **sem** duplicar blocos grandes nas Scenes).

- **Evitar** “JSON achatado” com chaves compostas opacas que **escondem** o modelo (dificulta validação, UI mental e Pre-flight).  
- **Evitar** árvores **profundas** sem necessidade (dificulta diffs e mensagens de erro).  
- **Evitar** **duplicação excessiva** do **mesmo** objeto em vários sítios: **referência por id estável** + **fonte única** no artefato apropriado (ex.: regras de sorteio **só** em `draw-configs.json`).

## 6.6 Nome físico sugerido do artefato de entrega

Quando o export for **entregue** como **ficheiro único** (ex.: arquivo `.zip`), o nome **recomendado** **normativo** para **disciplina operacional** é:

`telaflow-pack-{event_slug}-{export_id}.{extensão}`

- **`event_slug`:** identificador **humano** estável e **seguro para ficheiros** derivado do nome do evento (normalização definida em spec técnica ou UI — **sem** caracteres problemáticos para SO).  
- **`export_id`:** sempre presente **para** correlação com auditoria e licença.  
- **`extensão`:** conforme contêiner (ex.: `.zip`).

[UI_SPEC.md](./UI_SPEC.md) e fluxos de download **devem** **preferir** este padrão **salvo** restrições de plataforma; operador, suporte e organização **identificam** o objeto **sem** abrir o arquivo.

---

# 7. `pack.json` como manifesto principal

## 7.1 O que representa

`pack.json` é o **primeiro** ponto de leitura do **Pack loader** no Player: identifica **formato**, **proveniência**, **instante** de geração e **âncoras** que amarram licença e assinatura ao **conteúdo** exportado. **Sem** ele, o artefato **não** é um TelaFlow Pack **normativo**.

## 7.2 Campos mínimos (conceituais)

| Campo | Função |
|-------|--------|
| **`pack_version`** | Versão **do formato** do Pack; mudanças **breaking** incrementam; governa compatibilidade Player ↔ Pack ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.5). |
| **`schema_version`** (global e/ou por artefato) | Ancoragem ao **shared-contracts**; regras de evolução em ARCHITECTURE §9.6. |
| **`export_id`** | Identificador **único** desta exportação — correlaciona Cloud, licença, auditoria e suporte ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §7; UI_SPEC — labels operacionais). |
| **`event_id`** | Identificador do evento **fonte** na Cloud. |
| **`organization_id`** | Tenant **dono** do evento e da licença. |
| **`generated_at`** | Timestamp **UTC** de conclusão da geração (auditável; **não** substitui política de validade da licença). |
| **`app_min_player`** (ou equivalente) | Versão **mínima** do Player recomendada/suportada para **este** `pack_version` — o Player **pode** recusar formatos **mais novos** que não compreenda ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.5). |
| **Referência ao conjunto assinado** | Ligação explícita ao **manifesto de ficheiros** ou **hash agregado** coberto por `signature.sig` (detalhe em spec técnica). |
| **Checksum agregado (opcional)** | Facilita verificação rápida **antes** de validação criptográfica completa — **não** substitui assinatura. |

## 7.3 Por que é a **raiz** do Pack

Toda a **cadeia de confiança** (assinatura → ficheiros → schemas → ids) **ancora** no `pack.json`: o operador e o suporte identificam **uma** linha de export; o Player decide **cedo** se o formato é **aceitável**; o Pre-flight (grupo **G1**) valida **integridade** e **coerência** com o que este manifesto **declara** ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md)).

---

# 8. Event snapshot exportável

## 8.1 O que **entra**

- Identidade exportável do evento: nome, datas operacionais relevantes ao Player **se** previstas no schema, idioma de UI **se** aplicável.  
- **Lista ordenada** de Scenes com **tipos** enum, metadados operacionais (nome, ordem), composição **tipada** permitida: referências a `media_id`, overlays fechados, slots de patrocinador, **referência** a `draw_config_id` quando houver gatilho ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §5.5, §6.7).  
- Referências **estáveis** a entidades exportadas em paralelo (`draw-configs.json`, `media-manifest.json`) — **ids** que **fecham** o grafo.

## 8.2 O que **não** entra

- Notas internas **puramente** editoriais **se** o produto as marcou como **não exportáveis** ([EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §5 — “observações internas”).  
- Estado de **rascunho** de outras sessões, flags de UI, comentários colaborativos, versões alternativas não escolhidas.  
- Caminhos absolutos de disco, credenciais, dados de utilizadores da Cloud **não** necessários ao runtime.

## 8.3 O que precisa estar **congelado**

Qualquer campo que **influencie** o telão ou a **decisão** do operador no Player **deve** ser o **valor efetivo** no instante do export — em especial: ordem de Scenes, tipo de cada Scene, referências a mídia e sorteios, branding **resolvido** (ficheiro dedicado mas **logicamente** parte do snapshot).

## 8.4 Alinhamento com forma do documento (nesting)

A serialização do evento no Pack **segue** §6.5: **uma** hierarquia **legível** (evento → cenas ordenadas → referências por id), **sem** achatamento arbitrário **nem** aninhamento profundo **desnecessário**.

---

# 9. Export de Scenes

## 9.1 Como entram

Cada Scene exportável é um **objeto** no array **ordenado** dentro de `event.json` (ou estrutura **equivalente** validada pelo mesmo schema). A ordem **persistida** no editor (`sort_order`) é a **única** ordem normativa ([EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §5.1).

## 9.2 Ordem

**Sem empates** na ordenação exportada; duplicidade de `sort_order` persistido é **erro** de export — o pipeline **deve** falhar **antes** de assinar.

## 9.3 Tipos

Apenas tipos **enum** definidos pelo produto (chaves em inglês no contrato: `opening`, `institutional`, `sponsor`, `draw`, `break`, `closing` — EVENT_EDITOR §6). Cada tipo **restringe** combinações de campos; combinações inválidas são **bloqueantes** em §14.

## 9.4 Referências permitidas

- **`media_id`** que existam no `media-manifest.json` **ou** política **explícita** para cena sem mídia principal quando o tipo **permitir**.  
- **`draw_config_id`** que existam em `draw-configs.json` quando a Scene **declarar** gatilho.  
- Slots de patrocinador **previstos** pelo produto — **não** referências livres a “qualquer ativo”.

---

# 10. Export de branding

## 10.1 O que entra

Tokens e regras **resolvidas** que o Player **aplica** na execução: paleta, tipografia **permitida**, regras de uso de logótipo, **sem** canvas livre ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §11.6; ARCHITECTURE §6.5). O export contém **snapshot**, não **ponteiro** a um tema mutável na Cloud **sem** resolução.

## 10.2 O que fica **fora**

- Biblioteca completa de temas da organização **não** usada por este evento.  
- Histórico de alterações de marca, rascunhos de tema, **assets** binários **não** previstos no contrato de branding do MVP (se no futuro houver ficheiros **incluídos** no Pack, **exige** ADR — hoje a linha base **evita** mídia binária na Cloud/Pack para mídia operacional do cliente).

---

# 11. Export de DrawConfig

## 11.1 O que precisa entrar

Todos os **DrawConfig** **referenciados** por **qualquer** Scene exportada **e** quaisquer outros **usos** previstos no schema (ex.: sorteio **não** ligado a Scene mas **executável** no roteiro — se o produto **permitir**, **deve** estar **explícito** no `event.json` ou regra de runtime documentada). Cada registo: identificador estável (`draw_config_id`), tipo de sorteio, parâmetros **necessários** ao Player conforme MVP, regras de **exibição pública** acordadas.

## 11.2 O que **não** precisa entrar

- Dados de participantes **não** modelados para export (no MVP, listas **locais** no Player podem existir por ADR — **não** misturar com o Pack **sem** decisão).  
- Duplicação **verbatim** de regras **dentro** de cada Scene: a Scene **referencia** o id; a **fonte** da regra é `draw-configs.json`.

---

# 12. Export de manifesto de mídia

## 12.1 Papel

`media-manifest.json` é o **contrato declarativo** de tudo o que o operador **deve** (ou pode) colocar na **workspace** local. O Player **não** inventa slots; o **binding** associa ficheiros a `media_id` ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §8.3–8.4).

## 12.2 Campos por entrada (conceituais)

| Campo | Significado |
|-------|-------------|
| **`media_id`** | Identificador **estável**, gerado na Cloud, **imutável** no Pack; chave primária lógica do slot. |
| **`label`** | Nome humano para UI (Cloud + Player): “Vídeo de abertura”, “Logo patrocinador X”. |
| **`required`** | Se **obrigatório**, ausência no binding → **bloqueante** no Pre-flight; se **opcional**, ausência → **aviso** (salvo política explícita). |
| **`accepted_types`** | Tipos / extensões / MIME **declarativos** aceites — base para validação **leve** no Pre-flight ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §9.3 — MVP **sem** decode profundo). |
| **`semantic_role`** | Papel no roteiro (ex.: `opening_video`, `sponsor_logo_slot_2`) — **alinhado** a referências nas Scenes e a mensagens acionáveis (`actionable_target` no Pre-flight). |

## 12.3 Conversa com **binding** e **Pre-flight**

- **Export (Cloud):** declara **o que** deve existir.  
- **Binding (Player):** declara **onde** está na workspace (paths **relativos**).  
- **Pre-flight:** verifica **presença**, **coerência** de tipo/extensão e **leitura mínima** conforme MVP — **não** substitui a obrigação do export de **emitir manifesto completo** e **consistente** com `event.json`.

---

# 13. O que **NÃO** entra no Pack

Lista **normativa** (reforço de ARCHITECTURE §9.4):

1. **Ficheiros binários** de mídia do cliente (vídeo, imagem, áudio operacional).  
2. **Lixo de edição**: histórico de undo, versões alternativas, comentários internos **marcados como não exportáveis**.  
3. **Estados transitórios** da sessão web (scroll, painel aberto, rascunho não persistido).  
4. **Drafts internos** de entidades **não** promovidas ao snapshot (ex.: Scene em `draft`).  
5. **Credenciais** de API, tokens de utilizador, segredos de Cloud.  
6. **Logs de execução** de instalações anteriores do Player.  
7. **Caminhos absolutos** da máquina de qualquer utilizador.  
8. **Dados pessoais** além do **mínimo** exigido por licença ou lei — preferir **ids opacos** ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.4).

---

# 14. Consistência mínima obrigatória antes do export

## 14.1 Regras **bloqueantes** (export **não** prossegue)

- **≥1** Scene em estado `draft` ou `blocked` ([EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §5.2).  
- Referência **quebrada**: `media_id`, `draw_config_id`, slot de patrocinador ou overlay aponta para **ausência** no snapshot agregado.  
- **Matriz tipo × campos** violada (ex.: Scene tipo `sorteio` **sem** trigger quando a regra exige).  
- **Ordem** inválida (empates, lista vazia se o produto **exigir** ≥1 Scene exportável).  
- **Branding** obrigatório **em falta** quando a política do evento **exige** tema.  
- Falha de validação **JSON Schema** em qualquer artefato do Pack.  
- Incoerência entre **`event_id` / `organization_id`** no `pack.json` e o conteúdo dos demais ficheiros.

## 14.2 Regras de **aviso** (export **pode** prosseguir **se** política explícita)

- Scene em `warning` ([EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) §5.2 — export permitido ou negado **globalmente**; o documento do editor **delega** a decisão **global** ao **módulo de export**; a **predefinição** recomendada é: **avisos** **não** bloqueiam **salvo** configuração organizacional **documentada**).  
- Slots opcionais **não** referenciados em nenhuma Scene (manifesto pode listar **mais** do que o roteiro **usa** — **aviso** de “mídia declarada mas não referenciada”).  
- Metadados recomendados **em falta** (ex.: duração sugerida **não** preenchida) — **não** elevam a bloqueante **salvo** regra de produto.

**Separação clara:** **Bloqueante** = não assinar, não entregar Pack. **Aviso** = registar na UI de export e na **auditoria** (§20), **sem** falsear o snapshot.

---

# 15. Versionamento do Pack

## 15.1 `pack_version`

Identifica a **versão do formato** do conjunto: mudanças **incompatíveis** com leitores anteriores **devem** incrementar `pack_version` e ser **documentadas** com ADR ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.5–9.6).

## 15.2 `schema_version`

Por artefato ou agregado em `pack.json`: permite **evolução aditiva** (campos opcionais) **sem** necessariamente subir `pack_version` — **desde que** a política de compatibilidade **forward** esteja **explícita**; caso contrário, tratar como **breaking**.

## 15.3 Compatibilidade com o Player

- Player **recusa** Packs com `pack_version` **superior** à suportada — mensagem **clara** (não falha genérica).  
- Packs **mais antigos**: política de **retrocompatibilidade** mantida por matriz **Pack ↔ Player** publicada internamente; extensões **exigem** ADR.  
- **Testes** de regressão de carga de Pack são **obrigação** de engenharia, não desta spec — mas o **comportamento** “recusar com diagnóstico” é **normativo**.

## 15.4 Ordem canónica e versionamento

Mudanças de **`pack_version`** ou de **schema** que **alterem** a **ordem canónica** de ficheiros (§6.1) ou as **regras** de codificação (§6.2) / nullability (§6.3) são **breaking** **por defeito** e **exigem** ADR e atualização da matriz Player ↔ Pack.

---

# 16. Assinatura do Pack

## 16.1 O que **deve** ser assinado

O **conjunto** de artefatos **contratuais** acordado: tipicamente `pack.json` (metadados relevantes), `event.json`, `branding.json`, `media-manifest.json`, `draw-configs.json`, e o **corpo** de claims de licença — via **manifesto de ficheiros** com hashes **ou** **serialização canónica** única ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.3). A **ordem** em que os ficheiros entram no manifesto de hashes **deve** seguir **estritamente** §6.1 (itens 1–6); cada entrada é processada com **UTF-8 sem BOM**, newlines **LF** e política de omissão de §6.2–6.3. **Não** assinar blobs de mídia **que não estão** no Pack; **opcionalmente** incluir hashes **esperados** no manifesto de mídia **se** existirem (política futura). O ficheiro **`signature.sig`** **não** se auto-inclui no payload assinado.

## 16.2 Por que a assinatura existe

- **Integridade:** detetar **alteração** acidental ou maliciosa **após** saída da Cloud.  
- **Proveniência:** provar que o Pack **passou** pelo pipeline **oficial** de export.  
- **Alinhamento licença–conteúdo:** amarrar direito de uso ao **payload** **exato** exportado.

## 16.3 Proteção **conceitual** (sem profundidade criptográfica)

A assinatura **não** “esconde” o conteúdo do Pack para o operador legítimo: o Player **lê** os JSON em claro. Ela **impede** que **terceiros** **passem** por export válido **ou** que **edição manual** silenciosa **pareça** Pack **oficial**. Detalhes de curva, tamanho de chave e rotação **ficam** fora desta spec.

---

# 17. Relação com licença

## 17.1 A licença **entra** no Pack

Sim — como artefato **dedicado** (`license.dat` / `license.json`) **emitido** ou **selado** no **mesmo** fluxo de export ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §10.3).

## 17.2 **Como** entra

Gerada **no backend**, **após** validação de consistência, **antes** ou **junto** com o cálculo da assinatura — de modo que **`export_id`**, `event_id`, `organization_id` e **janela de validade** **correspondam** ao `pack.json` e ao conteúdo assinado.

## 17.3 O que **referencia**

No mínimo (conceitualmente): organização, evento, exportação (**`export_id`**), **validade temporal**, **escopo** de uso do Player. O Player **valida** correspondência entre claims e ficheiros **e** assinatura ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §10.4).

---

# 18. Resultado do export

## 18.1 Artefato **único** na semântica de entrega

A **operação** de export **produz** **um** **Pacote** **identificável** (`export_id`) contendo **todos** os ficheiros normativos §6 — quer **entregue** como diretório, arquivo contêiner ou transferência em stream, o **contrato** é **o mesmo**.

## 18.2 Snapshot **fechado**

Após geração **bem-sucedida**, o conteúdo **lógico** **não** é **alterado** pela Cloud **sem** nova exportação; correções **são** novo `export_id`.

## 18.3 `export_id`

Identificador **imutável** da operação; **correlaciona** UI ([UI_SPEC.md](./UI_SPEC.md) §5.10, §6.2), auditoria §20, licença §17 e diagnóstico no Player / Pre-flight.

---

# 19. Reexportação

## 19.1 **Quando** reexportar

Sempre que o evento **mudar** de forma que o palco **deva** refletir nova verdade (roteiro, mídia declarada, sorteios, branding) **ou** quando a **licença** / política comercial **exija** novo selo.

## 19.2 Export **antigo** continua **válido**?

**Como artefato:** sim, **até** violar **validade** da licença **associada** ou **revogação** comercial **documentada** — o Player **valida** licença + assinatura no **momento** da carga. **Como “última verdade” na Cloud:** o **último** export **não** invalida **magicamente** ficheiros **já** descarregados; a **governança** é **organizacional** (qual `export_id` **levar** ao palco).

## 19.3 **Como** diferenciar versões

Por **`export_id`**, **`generated_at`** e **`pack_version`**. A UI da Cloud **deve** listar histórico **legível** (UI_SPEC §6.2) — operador **nunca** depende só do nome de ficheiro.

---

# 20. Relação com logs e auditoria na Cloud

**Normativo mínimo** (PRODUCT_SPEC §7; ARCHITECTURE §2.9, §6.10):

- **Quem** disparou o export (identidade de utilizador).  
- **Quando** (`generated_at` **e** timestamp de registo servidor).  
- **`export_id`**, **`event_id`**, **`organization_id`**.  
- **`pack_version`** (e, se aplicável, versões de schema).  
- **Resultado:** sucesso **ou** falha **com** código de razão **estável** (não só stack trace).  
- **Checksum** ou hash do pacote **se** política comercial / suporte **exigir** prova de integridade **na Cloud**.  
- **Correlação** com emissão / ancoragem de **licença**.

**O que **não** é obrigatório nesta spec:** retenção exata em dias — definido em política de produto / compliance, **desde que** exista **trilha** mínima acima.

---

# 21. Anti-padrões do Pack Export

1. Gerar Pack **sem** assinatura **ou** sem `export_id`.  
2. Incluir **segredos** ou **tokens** de Cloud no artefato.  
3. **Serializar** entidades **fora** do schema **shared-contracts** “porque é mais rápido”.  
4. **Corrigir** silenciosamente dados inválidos no export **em vez de** falhar **no** editor.  
5. **Embutir** mídia binária do cliente **no** MVP **sem** ADR e mudança de **PRODUCT_SPEC**.  
6. Produzir **dois** formatos paralelos **sem** versionamento claro (confusão de Player).  
7. Depender de **inferência** no Player para **reparar** grafo **incompleto**.  
8. **Omitir** `media-manifest.json` **ou** exportar manifesto **inconsistente** com `event.json`.  
9. Exportar Scene como **JSON livre** (violação de ARCHITECTURE §5.5 / §6.7).  
10. **Assinar** **apenas** `pack.json` **sem** cobrir os **JSON** de payload **acordados**.  
11. Tratar export como **cache** editável — o operador **não** “patcha” Pack **oficial**; **reexporta** na Cloud.  
12. **Ordem** de ficheiros no manifesto de assinatura **arbitrária** ou **diferente** de §6.1.  
13. JSON com **BOM**, encodings mistos ou **newlines** inconsistentes (viola §6.2).  
14. Uso **generalizado** de `null` **onde** o schema **permite** omissão (viola §6.3 **salvo** exceção explícita no contrato).  
15. **Regenerar** `media_id` / `scene_id` / `draw_config_id` no export **sem** alteração de entidade na Cloud (viola §6.4).

---

# 22. Evolução futura segura

- **Mudanças aditivas:** novos campos **opcionais** + política de **ignorar** desconhecidos em Players antigos **só** se **ADR** e **matriz de compatibilidade** **o** **permitirem** ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.6).  
- **Mudanças breaking:** novo `pack_version`, ADR, atualização coordenada **Player** + **Cloud**.  
- **Novos artefatos** (ex.: `sponsors.json` dedicado): **entram** no **manifesto assinado** e no schema — **nunca** “ficheiro extra” **não** coberto pela assinatura.  
- **Hashes de mídia** no manifesto: **opcionais** no MVP; se **obrigatórios** no futuro, **Pre-flight** e export **devem** **evoluir** em conjunto (PRE_FLIGHT §22.1).  
- **Split** de `event.json` / `scenes.json`: **só** com **equivalência** contratual e **uma** fonte de verdade na validação.

---

# 23. Critério normativo final

O **TelaFlow Pack** é **contrato normativo** entre a Cloud e o Player: **tudo** o que o runtime **precisa** para **honrar** o roteiro e a licença **deve** estar **explícito**, **versionado** e **integrado** na **cadeia de assinatura** — **salvo** extensões **futuras** **ADR-aprovadas**.

O Player **não** deve **adivinhar** intenção, **reparar** grafo **nem** **completar** configuração **fora** do que o Pack **e** os schemas **declaram**. Onde o contrato **cala**, o comportamento **correcto** é **falha explícita** ou **aviso** **documentado** — **não** suposição silenciosa.

---

*Documento interno de feature — TelaFlow. PACK_EXPORT_FEATURE_SPEC v1.0.2 — ordem canónica §6.1, encoding §6.2, nullability §6.3, ids §6.4, determinismo §2.1, nesting §6.5–8.4, nome de ficheiro §6.6. Derivado do [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) v1.1, [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) v1.1, [UI_SPEC.md](./UI_SPEC.md) v1.0, [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) v1.1 e [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) v1.1.*
