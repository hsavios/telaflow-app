# TelaFlow — Especificação Funcional do Licenciamento (LICENSING_FEATURE_SPEC)

**Versão:** 1.0.1  
**Status:** Documento normativo — referência para **emissão**, **vínculo ao Pack e export**, **validade**, **validação offline**, **comportamento no Player**, **falhas**, **UX** e **auditoria** do licenciamento no ecossistema TelaFlow  
**Última revisão:** 2026-04-10  
**Domínio:** TelaFlow Cloud (emissão) + TelaFlow Player (consumo)  

**Hierarquia normativa:** Este documento é **derivado e subordinado** a, **nesta ordem**: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md), [UI_SPEC.md](./UI_SPEC.md), [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md), [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md), [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md), [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md). Em caso de ambiguidade ou conflito aparente, **prevalece** o documento mais acima na lista; o módulo de licenciamento deve ser ajustado (via revisão deste arquivo e **ADR** quando couber) para restabelecer alinhamento.

**Escopo:** comportamento funcional e contrato do licenciamento — **sem código**, **sem DDL**, **sem detalhes criptográficos de implementação**. Formatos de arquivo, curvas e rotação de chaves pertencem a especificações derivadas e `shared-contracts`, desde que obedeçam a este documento e à **ARCHITECTURE_SPEC** §10.

---

## Prefácio

No TelaFlow, a licença não é um adereço comercial opcional: é parte do **contrato operacional Cloud → Pack → Player** ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §5). Entra no Pack ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §17), é validada no Pre-flight antes de `ready` ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) — grupo **G2**), e pode bloquear execução ou colocar o runtime em `blocked` ([PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) §4). O núcleo do show deve funcionar **sem** chamadas obrigatórias à Cloud durante o evento ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.5, §4.3). Esta spec define o que a licença garante, como se liga ao export e como o operador experiencia limites sem hostilidade desnecessária.

---

# 1. Papel da licença no produto

## 1.1 Por que a licença é parte do produto

Sem um artefato de **direito de uso** ligado ao Pack fechado, o TelaFlow não fecha o ciclo comercial + operacional: qualquer cópia de arquivos poderia ser apresentada como “o evento”, sem âncora entre contrato, organização e instante de exportação. A licença materializa esse vínculo **dentro** do mesmo handoff que o operador leva ao palco.

## 1.2 Por que não é “só trava comercial”

Trava pura sem semântica operacional gera cinismo no palco e suporte impossível. A licença TelaFlow declara **escopo** (quem pode executar aquele snapshot, quando e em que contexto de identificadores), compatível com auditoria e com a validação técnica da assinatura do Pack. Comércio e integridade andam juntos — não são dois discursos descolados.

## 1.3 Por que precisa parecer elegante

O operador associa bloqueio a frustração no minuto crítico. A UX de licença deve ser **clara, calma e acionável** — alinhada à postura premium do [UI_SPEC.md](./UI_SPEC.md) e ao [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §10 (linguagem): precisão sem paternalismo, sem jargão vazio, sem alarmismo visual como substituto de informação.

---

# 2. O que a licença precisa resolver

| Necessidade | O que o licenciamento deve garantir |
|-------------|-------------------------------------|
| **Autorizar uso do Pack** | O Player só executa o roteiro quando o direito declarado cobre aquele `export_id` e organização (e evento conforme política). |
| **Vincular export à organização** | Cada export que produz um novo `export_id` gera linha de licença coerente com tenant e com o snapshot selado. |
| **Controlar validade** | Janela temporal (e outros limites se houver) compreensível e verificável localmente. |
| **Funcionar offline** | Validação no Player sem dependência de rede no núcleo do evento ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.5). |
| **Impedir adulteração simples** | Assinatura criptográfica sobre claims e alinhamento à cadeia do Pack ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §16). |

---

# 3. O que a licença NÃO deve virar

| Anti-alvo | Por quê |
|-----------|---------|
| **Ativação online obrigatória no palco** | Quebra a promessa offline do núcleo ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §4.3). Exceções futuras só com ADR e opcionalidade relativa ao show. |
| **UX hostil** | Punição visual, culpa genérica ao operador ou labirinto de passos sem “próximo passo” claro degradam confiança e suporte. |
| **Modelo confuso de chaves manuais** | Operador no palco não deve ser sistema de gestão de segredos opacos; a licença via Pack é o caminho normativo. |
| **Dependência da Cloud durante execução** | Não validar licença com API obrigatória em `executing` no fluxo principal ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §4.3). |
| **“Modo oculto” que ignora licença** | Proibido no MVP ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §10.5). |

---

# 4. Relação entre licença e Pack

- **Entrada no Pack:** a licença viaja como artefato dedicado (`license.dat` ou `license.json` — [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §6) selado no fluxo de export.  
- **`export_id`:** cada licença emitida no contexto de export referencia o `export_id` daquela operação — ancoragem do direito ao snapshot.  
- **`event_id`:** garante coerência com `event.json` e `pack.json`.  
- **`organization_id`:** âncora comercial / tenant; deve coincidir com o contexto do Pack.  
- **Assinatura do Pack:** a licença participa da cadeia de confiança (§15); não é anexo informal fora do manifesto assinado.

---

# 5. Estrutura conceitual mínima da licença

Campos conceituais mínimos (nomes exatos no schema canônico):

| Campo | Função |
|-------|--------|
| **`license_id`** | Identificador único desta emissão (auditável na Cloud e referenciável em suporte). |
| **`export_id`** | Liga o direito ao snapshot exportado. |
| **`event_id`** | Evento coberto pelo Pack. |
| **`organization_id`** | Organização titular do direito. |
| **`issued_at`** | Instante de emissão (servidor ou política documentada). |
| **`valid_from` / `valid_until`** | Janela de validade para avaliação no Player (relógio local — §8, §10). |
| **`scope`** | Declaração de escopo (ex.: execução do Player para aquele Pack; extensões comerciais em campos opcionais versionados). Ver §5.2. |
| **Âncora à assinatura** | Ligação explícita ao processo que inclui claims na `signature.sig` ou equivalente normativo ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §10.3). |

**Nota:** formato binário vs JSON, encoding e campos opcionais ficam em spec derivada; a semântica acima é normativa.

## 5.1 Estabilidade de identidades (norma de emissão)

| Identificador | Comportamento normativo |
|---------------|-------------------------|
| **`license_id`** | **Novo** em **cada** emissão de licença (cada export que gera licença tem o seu `license_id` distinto). |
| **`export_id`** | **Novo** em **cada** operação de export; a licença **amarra-se** a **esse** `export_id` e **não** é reutilizada entre exports. |
| **`organization_id`** | **Fixo** enquanto o direito se refere **àquela** organização contratual; **não** “renumera” entre emissões — **é** o tenant **do** Pack **exportado**. |
| **`event_id`** | Identifica o evento **daquele** snapshot; novo export após alteração material → novo `event_id` **se** o modelo de dados assim evoluir, **mas** **sempre** coerente com `event.json`. |

**Motivo:** suporte, auditoria e engine **fecham** uma **única** interpretação: **duas** linhas de licença **não** compartilham `license_id`; **dois** exports **não** compartilham `export_id`; **mistura** de org **não** é **“meio** **válida”**.

## 5.2 Evolução reservada do `scope` (não MVP obrigatório)

O campo **`scope`** pode, em evolução comercial, distinguir tipos de uso sem alterar a estrutura base dos claims. Valores conceituais reservados para roadmap (enum ou extensão versionada — detalhe no schema):

- **`event`** — direito ligado ao uso em evento ao vivo (linha base semântica).  
- **`rehearsal`** — ensaio / pré-evento (política comercial e eventual janela temporal distinta).  
- **`internal_demo`** — demonstração interna ou piloto (restrições adicionais se houver).

No MVP basta um escopo mínimo que autorize execução do Player para o Pack — sem obrigar distinção rehearsal vs event na primeira entrega, salvo decisão de produto explícita. Reservar estes valores evita refator contratual quando o comercial pedir SKUs distintos.

---

# 6. Momento de emissão da licença

## 6.1 Quando a licença nasce

A licença é emitida ou selada no **backend** no fluxo de export bem-sucedido, após validação de consistência mínima do Pack e antes ou junto com o cálculo da assinatura do conjunto contratual ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §17–18; [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §4.1).

## 6.2 Relação com export

Uma operação de export que produz um novo `export_id` gera licença nova ligada a esse `export_id` — salvo política comercial explícita diferente documentada em ADR (não MVP por omissão). Não há licença “genérica” válida para qualquer Pack sem vínculo a `export_id`.

---

# 7. Vínculo entre licença e export

## 7.1 A licença não é genérica

**Proibição normativa:** licença emitida sem correspondência 1:1 clara com um `export_id` (e ids de evento/org coerentes) não cumpre o modelo TelaFlow para o MVP. Evita direitos flutuantes impossíveis de auditar e de explicar ao operador.

## 7.2 Ancoragem ao snapshot

A licença autoriza uso do Player em relação **àquele** snapshot — não ao “evento” como abstração mutável na Cloud sem novo export. Alteração material do evento → novo export → nova licença ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §19).

---

# 8. Validade temporal

## 8.1 Como funciona conceitualmente

A validade define a janela em que o Player trata a licença como vigente para fins de execução. **`valid_from` e `valid_until` são instantes normalizados em UTC** nos claims (ou convertidos de/para UTC de forma **única** e **documentada** no schema). A comparação com o **relógio** do sistema **deve** **traduzir-se** **para** **o** **mesmo** **referencial** **(instante** **UTC** **atual** **derivado** **do** **relógio** **local)** **antes** **de** **decidir** **vigência** — **evita** **o** **bug** **clássico** **de** **meia-noite** **“no** **fuso** **do** **servidor”** **vs** **“no** **fuso** **do** **operador”** **sem** **regra**.

O Player continua a depender do **relógio local** como fonte de “agora” ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §10.4, §16.4); **o** **que** **esta** **regra** **fixa** **é** **a** **normalização** **semântica** **dos** **limites** **gravados** **na** **licença** **e** **o** **modo** **de** **comparar** **com** **“agora”**.

## 8.2 Por que existe

Alinha direitos a contratos comerciais (evento em data X, ensaio em Y se política existir) e reduz uso indefinido de artefatos exportados sem renovação governada.

## 8.3 Como a expiração afeta o Player

- Antes de `valid_from` ou após `valid_until` (segundo comparação UTC normalizada — §8.1): licença não considerada vigente para **novo** `ready` ou **nova** carga de Pack — bloqueante conforme §13.  
- Política de tolerância de relógio (margem em minutos): opcional — se existir, documentada em produto/ADR; não exigida no MVP como complexidade alta.

## 8.4 Grace operacional mínima no MVP (expiração durante `executing`)

**Regra conceitual:** se o instante “agora” (após normalização §8.1) **ultrapassa** `valid_until` **enquanto** o runtime já está em **`executing`**, o Player **deve** **permitir** **concluir** **a** **sessão** **corrente** **de** **forma** **ordenada**: **transição** **para** **`finished`** **(ou** **fluxo** **de** **encerramento** **equivalente)** **sem** **cortar** **o** **telão** **no** **meio** **de** **uma** **ação** **sem** **decisão** **de** **produto**.

**Em** **paralelo:** **não** **é** **permitido** **iniciar** **nova** **sessão** **de** **execução** **nem** **tratar** **novo** **`ready`** **com** **a** **mesma** **licença** **já** **expirada** **(novo** **Pack** **/** **nova** **licença** **/** **renovação** **comercial** **—** **fora** **do** **âmbito** **técnico** **mínimo** **aqui).** **Refinamentos** **(margem** **pós-`valid_until`,** **avisos** **antecipados)** **ficam** **em** **§19** **sem** **contradizer** **esta** **regra** **base.**

**Motivo:** **evita** **decisão** **improvisada** **em** **produção** **(“cortamos** **ou** **não?”)** **e** **alinha** **UX** **a** **palco** **real**: **terminar** **o** **que** **começou** **com** **licença** **válida** **à** **entrada** **em** **`executing`**.

---

# 9. Operação offline

## 9.1 Validação no Player sem Cloud obrigatória

O validador de licença usa apenas o conteúdo do Pack, chaves públicas (ou cadeia mínima) embutidas no Player e o relógio local ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §10.4). Nenhuma chamada HTTP é pré-requisito para decidir vigência técnica no núcleo offline.

## 9.2 Cloud não é obrigatória no evento

Reforço: durante montagem, pre-flight e execução do show, a ausência de internet não deve impedir validação de licença se o Pack e o Player forem adequados. Melhorias online futuras (§19) são complementares.

---

# 10. Relação com relógio local

## 10.1 Risco conhecido

O Player depende do relógio do sistema operacional para `valid_from` / `valid_until` ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §16.4). Relógio errado ou adulterado pode fazer a licença parecer válida quando não deveria ou inválida quando o contrato ainda vigoraria.

## 10.2 Como tratar sem paranoia excessiva

- Documentar a dependência do relógio em mensagens internas e playbook de suporte ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §16.4).  
- Preferir comportamento conservador claro: recusar com mensagem explicativa quando a validade for inconsistente de forma detetável (ex.: `valid_until` anterior a `valid_from`).  
- Relógio “suspeito” (fora de faixa absurda vs `issued_at`): política MVP sugerida na ARCHITECTURE — aviso ou `blocked` com copy calma — sem NTP forçado no MVP.

---

# 11. Validação no Pre-flight

## 11.1 Checks de licença (G2)

Alinhado ao [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) §8 (grupo **G2**): presença do artefato de licença, assinatura sobre claims, coerência de ids com `pack.json` / `event.json`, janela temporal face ao relógio local, escopo mínimo para execução.

## 11.2 Severidades

- **Bloqueante (recuperável ou fatal):** ausência de arquivo esperado, assinatura inválida, expiração, mismatch de ids — conforme matriz do Pre-flight (fatalidade `recuperável` só se houver ação real no local; caso contrário fatal `blocked`).  
- **Aviso:** tipicamente relógio suspeito ou campo opcional de política — sem impedir `ready` se o produto assim definir explicitamente (alinhar Pre-flight e esta spec).

---

# 12. Validação no Runtime

## 12.1 O que ainda observa após `ready`

O runtime não revalida a Cloud; pode assumir licença já aceite no último pre-flight bem-sucedido. Contudo:

- **Cruzamento de `valid_until` durante `executing`:** **obedecer** **§8.4** **(permitir** **concluir** **sessão** **atual;** **bloquear** **novo** **`ready`** **/** **nova** **execução** **com** **licença** **expirada).**  
- Troca de Pack ou deteção de adulteração em disco → novo ciclo de carga / pre-flight, não “hot swap” silencioso.

---

# 13. Falhas de licença

## 13.1 Tipos e classificação

| Situação | Descrição |
|----------|-----------|
| **Licença ausente** | Arquivo esperado não lido no Pack. |
| **Licença inválida** | Formato ilegível, claims incoerentes com schema, ou dados corrompidos. |
| **Licença expirada** | Fora da janela `valid_from`–`valid_until` após comparação normalizada (§8.1); durante `executing` ver §8.4. |
| **Assinatura inválida** | Falha criptográfica na verificação dos claims ou desalinhamento com `signature.sig`. |
| **Vínculo incompatível** | `export_id` / `event_id` / `organization_id` da licença ≠ conteúdo do Pack. |

## 13.2 Mismatch parcial entre claims e Pack

Qualquer dessincronização entre claims da licença e `pack.json` / `event.json` — **incluindo** o caso em que `export_id` coincide mas `organization_id` (ou outro id obrigatório) não — é **bloqueante fatal** (`blocked` ou estado que impede `ready` até Pack íntegro e coerente). **Não** há gradação “meio compatível” no MVP.

**Motivo:** a engine e o Pre-flight G2 aplicam **uma** regra: correspondência completa ou falha fatal; evita ramos especiais por campo e reduz superfície de ataque (troca seletiva de claims).

## 13.3 Bloqueante fatal vs recuperável

| Classificação | Quando |
|---------------|--------|
| **Fatal `blocked`** | Assinatura inválida, Pack adulterado em cadeia, `pack_version` incompatível combinado com licença — sem remediar sem novo Pack ou atualização do Player (Pre-flight §13; [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) `blocked`). |
| **Recuperável** | Cenários em que existe ação local clara (ex.: operador substitui arquivo de Pack por versão íntegra nova) — ainda assim bloqueiam `ready` até resolvidos. |

**Nota:** “Recuperável” não significa “aviso” — significa que existe caminho operacional sem mudar a lei do produto.

---

# 14. UX de licença no Player

## 14.1 Como avisar

- Avisos não bloqueantes (ex.: relógio suspeito): painel ou linha de estado discreta — não banner vermelho de pânico para condição não fatal ([UI_SPEC.md](./UI_SPEC.md) Pre-flight, consistência Cloud/Player).  
- Bloqueios: tela ou painel dedicado com código `LICENSE_*` estável e `export_id` visível para suporte.

## 14.2 Como bloquear

- Sem toast único como único canal para falha que impede `ready` ([UI_SPEC.md](./UI_SPEC.md) §20.9).  
- Mensagem: o quê / por quê / próximo passo (ex.: “Obtenha um Pack atualizado na Cloud” quando aplicável).

## 14.3 Como não assustar o operador

- Evitar culpar o operador por falha de contrato ou relógio sem explicar dependência.  
- Manter tom institucional e calmo ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §10).  
- Não usar linguagem punitiva ou acusações de “pirataria” como substituto de diagnóstico.

## 14.4 Visibilidade de `valid_until` (e janela de validade)

O operador não deve descobrir a expiração só quando o sistema bloqueia. `valid_until` (e, quando útil, `valid_from`) deve estar visível em pelo menos um destes contextos: resumo ao carregar Pack / pré-execução, painel de estado pré-`ready`, ou seção acessível a partir do fluxo de pre-flight (alinhado ao [UI_SPEC.md](./UI_SPEC.md) — densidade calma, não alarme). Formato legível: data/hora em UTC com rótulo, ou hora local com indicação explícita do fuso — decisão de produto, desde que não haja ambiguidade.

**Proibição:** omitir intencionalmente a data limite na UI do Player para forçar contato com suporte sem necessidade operacional.

---

# 15. Relação com assinatura do Pack

A licença faz parte da **cadeia de confiança**: claims incluídos ou cobertos pelo processo de assinatura do Pack ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §16; [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §10.3). Alterar licença sem invalidar assinatura deve ser impossível ou detetável como adulteração.

---

# 16. Relação com auditoria na Cloud

- Cada emissão ligada a um `export_id` deve ser registada (quem, quando, evento, org, resultado) ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §7; [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §20).  
- `license_id` correlaciona suporte entre Cloud e Player (logs locais com `export_id` e códigos).

---

# 17. Reexportação e nova licença

Novo export → novo `export_id` → nova licença ligada àquele snapshot ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §19). Packs antigos mantêm as suas licenças até expirarem ou serem invalidadas por política comercial futura (fora do MVP obrigatório).

---

# 18. Anti-padrões do licenciamento

1. Exigir login na Cloud para cada abertura de Pack no palco.  
2. Chaves manuais longas como passo obrigatório rumo ao `ready`.  
3. Mensagens de licença genéricas (“Erro 403”) sem `export_id` ou código estável.  
4. Ignorar licença em modo debug acessível ao operador no MVP.  
5. Licença desligada do `export_id` (direito flutuante).  
6. Renovação opaca sem trilha na Cloud.  
7. Assustar com fullscreen vermelho por aviso não bloqueante.  
8. Validação apenas online no runtime principal.  
9. Tratar mismatch parcial de claims como aviso ou “compatível a meio” (viola §13.2).  
10. Esconder `valid_until` ao operador até o bloqueio (viola §14.4).  
11. Comparar `valid_until` em fusos mistos sem normalização UTC (viola §8.1).

---

# 19. Evolução futura segura

**Não obrigatório no MVP** — evolução por ADR:

- Refinar a grace operacional (§8.4): margem após `valid_until`, avisos antecipados, política para eventos multi-dia — sem contradizer a regra base de permitir concluir sessão em `executing`.  
- Revalidação online opcional antes do show (renovação sem novo arquivo físico — se algum dia existir, não pode tornar-se obrigatória para o núcleo offline).  
- Revogação remota de licenças (lista de revogação opcional no Player — com cuidado de não introduzir dependência de rede no instante do show sem decisão explícita).

---

# 20. Critério normativo final

A licença protege o produto e o contrato comercial **sem hostilizar** o operador no palco: linguagem clara, bloqueios honestos, diagnóstico acionável. Respeita a **natureza offline** do núcleo TelaFlow: validação local do Pack e da licença embutida, sem tornar a Cloud um ponto único de falha operacional no evento.

Desvios relevantes — novo modelo de claims, novo momento de emissão, ou mudança na relação online/offline — exigem revisão desta spec e dos documentos superiores na hierarquia, com ADR quando couber.

---

*Documento interno de feature — TelaFlow. LICENSING_FEATURE_SPEC v1.0.1 — identidades §5.1, scope reservado §5.2, UTC §8.1, grace §8.4, mismatch §13.2, visibilidade §14.4. Derivado do [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) v1.1, [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) v1.1, [UI_SPEC.md](./UI_SPEC.md) v1.0, [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) v1.1, [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) v1.1, [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) v1.0.2 e [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) v1.0.1.*
