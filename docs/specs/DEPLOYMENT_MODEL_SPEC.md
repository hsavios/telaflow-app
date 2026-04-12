# TelaFlow — Especificação do Modelo de Deployment (DEPLOYMENT_MODEL_SPEC)

**Versão:** 1.0.1  
**Status:** Documento normativo — referência para **implantação da Cloud**, **distribuição e atualização do Player**, **artefato de release**, **naming**, **rollback local**, **backups (BD + Packs)**, **renovação TLS**, **ambientes**, **compatibilidade Pack ↔ Player** e **evolução infraestrutural**  
**Última revisão:** 2026-04-10  

**Hierarquia normativa:** Este documento é **derivado e subordinado** a, **nesta ordem**: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md), [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md), [UI_SPEC.md](./UI_SPEC.md), [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md), [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md), [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md), [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md), [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md), [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md). Em caso de ambiguidade ou conflito aparente, **prevalece** o documento mais acima na lista; mudanças que **alterem** contratos de Pack, domínios públicos ou política de atualização exigem **revisão** deste arquivo e **ADR** quando a decisão for estrutural.

**Escopo:** **modelo** de deployment e distribuição — **sem** playbooks de comando, **sem** IaC obrigatório, **sem** fornecedor de cloud específico além do que o MVP assume (VPS). Detalhes executivos (nomes de serviço systemd, paths) ficam em documentação operacional derivada.

---

## Prefácio

O TelaFlow é **híbrido**: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §5 — **Cloud** em `app.telaflow.ia.br` para autoria e governança, **Player** como **executável local** para palco com **offline** como capacidade central ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.5). O **deployment** não é “infra atrás do site”: é a **materialização** da promessa comercial de que o cliente consegue **autorizar na web**, **transportar um Pack** e **executar sem improviso** — em condições de rede boa, má ou inexistente no momento do show.

Este documento fixa **estratégias distintas** para Cloud e Player, **desacoplamento** entre ambos no runtime do palco, e **políticas mínimas** de versão, segurança e observabilidade alinhadas a [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) e [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md). O [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) define **o quê** construir; este documento define **como** o que foi construído **vive** em produção inicial **sem** overengineering prematuro ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.10).

---

# 1. Papel do deployment no produto

## 1.1 Por que deployment é parte do produto

Sem um modelo de deployment **explícito**, a equipa tende a **três** falhas que quebram a categoria de produto: (1) Cloud e Player **acoplados** por conveniência (o palco depende de API ao vivo); (2) **Pack** tratado como arquivo qualquer (sem rastreio de `pack_version` nem canal oficial de Player); (3) **cliente sem TI** deixado com instaladores opacos ou atualizações que **invalidam** o evento sem narrativa. O deployment **traduz** [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3 em **realidade operacional**: onde corre o SaaS, como chega o binário, como se **atualiza** sem violar **Cloud → Pack → Player**.

## 1.2 Por que Cloud e Player exigem estratégias diferentes

A **Cloud** é **serviço contínuo**: deploy em servidor controlado pela equipa TelaFlow (ou futuro fornecedor), com **sessão**, **base de dados** e **export** no mesmo domínio de negócio. O **Player** é **artefato instalado** na máquina do cliente ou da produção: ciclo de vida **lento**, permissões de SO, **offline**, e **obrigação** de mensagens claras quando `pack_version` ou licença falham ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md); [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md); [UI_SPEC.md](./UI_SPEC.md)). Misturar os dois modelos (ex.: “o Player atualiza-se sempre da Cloud antes de cada Scene”) **viola** o núcleo offline salvo **ADR** e produto explícito.

---

# 2. Dois ambientes oficiais do TelaFlow

| Ambiente | Natureza | Responsabilidade de deployment |
|----------|--------|--------------------------------|
| **Cloud** | SaaS concentrado em **app.telaflow.ia.br** ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md), specs de domínio) | Equipa produto/engenharia TelaFlow: servidores, TLS, backups de base, pipeline de release web e API. |
| **Player** | **Aplicação desktop** (Tauri 2 + React + Vite — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §1.3) distribuída **fora** do fluxo crítico do show | Canal oficial de **download** de binário assinado (conceito); instalação e atualização **no dispositivo** do operador; **sem** dependência de rede para **abrir Pack e executar** após artefatos locais prontos. |

**Regra de desacoplamento:** no **núcleo** do evento, o Player **não** depende da Cloud estar acessível ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.5, §4.3). A Cloud **produz** o Pack; **não** orquestra frame a frame o palco ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3.1 **Limites**).

---

# 3. Deployment oficial da Cloud no MVP

## 3.1 Infraestrutura inicial

- **VPS** (máquina virtual dedicada ou equivalente simples) como **alojamento inicial** de produção — suficiente para Next.js, FastAPI e PostgreSQL em topologia coerente com §4, **sem** exigir orquestração distribuída no MVP.  
- **Domínio principal da aplicação:** **app.telaflow.ia.br** — único **canônico** para o SaaS de autoria e export ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) cabeçalho; [UI_SPEC.md](./UI_SPEC.md) cabeçalho).  
- **Produção:** ambiente **nomeado** e **isolado** de credenciais e dados reais de clientes; deploy **controlado** (§10).  
- **Staging mínimo:** **recomendado** — réplica **funcional** (não necessariamente escala idêntica) para validar export, auth e regressões **antes** de promover a produção; se **ausente** por restrição temporária, o risco deve ser **consciente** e **mitigado** por checklist de release (fora do âmbito normativo detalhado aqui).

## 3.2 O que o MVP não exige

Multi-região, Kubernetes obrigatório, filas geridas enterprise ou CDN **global** — previstos apenas como **evolução** (§18).

---

# 4. Topologia inicial recomendada da Cloud

Conceitualmente, a Cloud **MVP** organiza-se em camadas **lógicas** (implementação concreta: monólito modular FastAPI — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.10):

| Camada | Papel |
|--------|--------|
| **Frontend** | Next.js (App Router): UI de autoria, listagens, export — fala com API **via** HTTPS; **não** é fonte de verdade de negócio ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.2). |
| **Backend** | FastAPI: autenticação, multi-tenant, regras de export, licenciamento, auditoria de export — **fonte de verdade** relacional. |
| **Banco** | PostgreSQL: persistência de organizações, eventos, histórico de exportações, dados de licença conforme modelo. |
| **Reverse proxy** | Terminação TLS, roteamento de pedidos para frontend e API (paths ou hosts distintos **definidos** em implementação), cabeçalhos de segurança mínimos. |
| **SSL/TLS** | Certificados **válidos** para **app.telaflow.ia.br**; renovação **monitorada** — §15.1. |

**Observação:** frontend e backend **podem** residir no mesmo VPS com portas internas distintas atrás do proxy; o modelo **não** impõe microserviços.

---

# 5. Papel do domínio oficial

- **app.telaflow.ia.br** — **único** domínio normativo do **SaaS** TelaFlow Cloud no MVP: autenticação, API pública estável, downloads **oficiais** do Player quando expostos por essa origem (§7).  
- **Landing institucional** — **separada** do app (outro host ou subdomínio de marketing): comunicação, SEO, contato; **não** confundir com o painel de evento. Redirecionamentos e cookies devem respeitar **política de segurança** (sem compartilhar sessão de app com site público de forma negligente).  
- **Clareza para o cliente:** documentação e suporte referem **explicitamente** o domínio de **trabalho** (app) vs **marketing** (landing).

---

# 6. Deployment do Player

## 6.1 Forma de entrega

- **Executável local** gerado pelo pipeline de build Tauri (Windows, macOS, Linux conforme roadmap de produto — o MVP **deve** declarar **quais** plataformas são suportadas na primeira onda).  
- **Distribuição controlada:** binários **apenas** por **canal oficial** (§7) — não depender de links efémeros em chat ou drives não governados.  
- **Instalação simples:** fluxo reconhecível pelo operador (instalador ou pacote); **sem** pré-requisitos ocultos que exijam equipa técnica avançada para o **caso feliz** ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §3.2).

## 6.2 O que o Player não é no deployment

Não é extensão de browser obrigatória para o show; não é PWA como **substituto** do runtime desktop no MVP salvo decisão normativa futura (ADR).

## 6.3 Primeiro artefato operacional de release (norma comercial)

A **primeira entrega oficial** do Player ao cliente **deve** adotar **um** dos formatos abaixo (escolha declarada em release notes e mantida no canal oficial — §7); **não** distribuir “pasta de build” sem contrato de instalação.

| Modo de entrega | Artefato | Notas |
|-----------------|----------|--------|
| **Preferido (release oficial)** | **Instalador versionado por plataforma** (ex.: `.msi` / `.exe` no Windows, `.dmg` ou pacote assinado no macOS, conforme plataformas suportadas) | Caminho **padrão** para primeira venda: operador reconhece o fluxo; versão **visível** no instalador e na app. |
| **Aceitável (fase inicial controlada)** | **Arquivo compactado com executável e metadados** (ex.: `.zip` **oficial**, checksum publicado, conteúdo **congelado** por release) | Apenas enquanto o instalador **não** estiver pronto **ou** para canal piloto **explícito**; mesmo assim **obrigatório** naming §7.1, checksum e página de download sob **app.telaflow.ia.br**. |

**Regra:** o formato escolhido para o **primeiro** release comercial **não** pode ser ambíguo (“peça o binário por email”); deve existir **artefato único nomeado** por plataforma e versão, rastreável pelo suporte.

---

# 7. Estratégia oficial de distribuição do Player

- **Download oficial:** página ou endpoint sob **app.telaflow.ia.br** (ou subpath documentado) que lista **versão**, **notas mínimas** e **checksum** ou assinatura **quando** política de segurança exigir.  
- **Versão controlada:** cada build público tem **identificador de release** (semver ou equivalente) **visível** na UI “Sobre” do Player e **registado** em changelog interno.  
- **Vínculo com release:** o **mesmo** pipeline que produz o binário **etiqueta** a versão consumida por suporte e por matriz de compatibilidade Pack (§8).  
- **Rastreabilidade:** correlacionar release do Player com commits ou tags **repositório** — detalhe operacional fora desta spec, obrigação **conceitual** presente.

## 7.1 Convenção oficial de naming dos artefatos do Player

Cada arquivo publicado no canal oficial **deve** seguir padrão **estável** para suporte, tickets e scripts internos:

**Padrão normativo:** `telaflow-player-{semver}-{os}-{arch}.{ext}`

**Exemplos (ilustrativos):**

- `telaflow-player-1.0.0-win-x64.exe` (instalador ou bundle Windows)  
- `telaflow-player-1.0.0-macos-aarch64.dmg`  
- `telaflow-player-1.0.0-linux-x64.AppImage` ou `.deb` conforme política de plataforma

**Regras:**

- `{semver}` alinhado à versão em “Sobre” no Player e ao changelog (§7).  
- `{os}` e `{arch}` em **minúsculas** e vocabulário **fixo** (`win`, `macos`, `linux`; `x64`, `aarch64`, …) — lista fechada definida em documentação operacional derivada.  
- **Extensão** `.ext` reflete o artefato real (instalador vs zip oficial §6.3).  
- **Não** reutilizar o **mesmo** nome de arquivo para duas builds **diferentes** (evita cache CDN/browser e confusão forense).

---

# 8. Relação entre versão do Player e versão do Pack

## 8.1 Contrato normativo

- **`pack_version`** — versão do **formato** do Pack ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §15.1, §6; [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.5). O Player **suporta** um conjunto de `pack_version` **declarado**; Packs **acima** da capacidade do leitor **devem** ser **recusados** com mensagem **clara** ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §15.3; [UI_SPEC.md](./UI_SPEC.md) alinhamento a falhas explicáveis).  
- **`app_min_player`** (ou campo equivalente no Pack) — indica versão **mínima** de Player para aquele formato ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md); [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §9.5). A Cloud **pode** emitir Packs que **exigem** Player atualizado; o operador **precisa** de mensagem acionável (“atualize o Player” / “reexporte com formato compatível”), não erro genérico ([PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) G1; estado **`blocked`** no runtime — [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md)).

## 8.2 Compatibilidade e incompatibilidade

- **Compatível:** Player ≥ mínimo exigido e `pack_version` ≤ máximo suportado pelo Player; licença e assinatura válidas.  
- **Incompatível:** `pack_version` **não suportada** → tratamento **bloqueante** / **`blocked`** conforme specs de pre-flight e runtime — **não** tentar “interpretar na mesma” adulterando o Pack.  
- **Evolução coordenada:** mudanças **breaking** em formato exigem **novo** `pack_version`, **ADR** e **atualização** do Player antes ou em simultâneo com Cloud a emitir novo formato ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §15.3).

## 8.3 Mensagens ao operador

Derivadas de estado e códigos — [UI_SPEC.md](./UI_SPEC.md); **não** log bruto no telão ([AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §17).

---

# 9. Estratégia de update do Player

## 9.1 MVP — atualização manual (norma inicial)

- O operador ou TI **descarrega** nova versão **oficial** e **instala** por cima ou segundo guia; **sem** obrigatoriedade de auto-update silencioso no MVP.  
- **Documentação** mínima: o que muda na compatibilidade Pack, se há **migração** de workspace local.

## 9.2 Evolução — update assistido (opcional futuro)

- Notificação **in-app** “há nova versão” com link para download oficial ou canal **opt-in**; **nunca** substituir o núcleo offline por **pull** obrigatório em cada abertura de Pack salvo ADR.  
- Qualquer **auto-update** futuro exige **assinatura** de pacote, **reversão** ou fallback documentado, e **privacidade** (§18).

## 9.3 Rollback local do Player

**Política mínima:** se uma **atualização** falhar (instalação corrupta, incompatibilidade não antecipada, regressão bloqueante no palco), o operador **deve poder** voltar à **release anterior** **sem** depender da equipa TelaFlow em tempo real.

**Meios (conceituais):**

- Manter **no canal oficial** as **últimas N releases** anteriores (N definido em produto — mínimo **uma** major/minor anterior estável) com **mesmo** naming §7.1.  
- **Documentação** de suporte: passos para desinstalar / instalar versão anterior ou, no caso de zip §6.3, substituir pasta **controlada**.  
- **Não** assumir que “só existe a última build”: rollback é parte da **operação** em eventos reais.

Isto aplica-se **em especial** enquanto o update for **manual** (§9.1); permanece válido quando existir update assistido (§9.2), que **deve** prever fallback.

---

# 10. Estratégia de update da Cloud

- **Deploy controlado:** promoção **staging → produção** (quando staging existir) ou checklist equivalente; **janela** comunicada se houver risco de indisponibilidade.  
- **Sem quebrar contrato Pack:** deploy da Cloud **não** altera Packs **já exportados** no disco do cliente; altera apenas **futuros** exports. Mudanças que **exijam** novo `pack_version` **seguem** [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) e **ADR**.  
- **Rollback:** capacidade **conceitual** de reverter versão de API/frontend **ou** de desativar feature flag **sem** corromper dados — profundidade técnica fora desta spec, **obrigação** de planeamento presente.  
- **API estável** para clientes que integrem (futuro): versionamento de API documentado; no MVP o cliente principal é o **próprio** frontend Next.js.

---

# 11. Compatibilidade entre versões

| Componente | Pode evoluir como | Limite |
|-------------|-------------------|--------|
| **Cloud** | Deploy frequente de UI e API | **Não** reescreve Packs antigos; novos exports obedecem a `pack_version` e política de licença. |
| **Pack** | **Imutável** após geração; nova revisão = novo `export_id` ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md)) | Contrato **congelado** no arquivo. |
| **Player** | Releases menos frequentes; matriz explícita `pack_version` ↔ build | **Deve** recusar o que não entende; **deve** declarar versão visível ao suporte ([AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §16). |

**Regra:** a **verdade** do que vai ao palco está no **Pack** + **Player** instalado + **workspace** local; a Cloud **não** participa da decisão frame a frame.

---

# 12. Ambientes mínimos oficiais

| Ambiente | Finalidade |
|----------|------------|
| **dev** | Máquinas de desenvolvimento; dados fictícios; **sem** misturar credenciais de produção. |
| **staging mínimo** | Espelho **funcional** para validar export, auth, licença em condições próximas de prod; **recomendado** antes de cada promoção relevante (§3). |
| **prod** | **app.telaflow.ia.br** com dados reais; backups (§15.2–15.3), TLS (§15.1) e logs Cloud conforme [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §5, §15. |

**Player:** builds **dev** (unsigned / debug) **não** são canal de distribuição ao cliente; apenas builds de **release** pelo fluxo oficial (§7).

---

# 13. Relação com VPS inicial real

O produto **começa** em **VPS simples** — alinhado a [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) e a [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.10: **monólito modular**, não pulverização.

**Princípios:**

- **Capacidade** dimensionada para **carga inicial** de SaaS B2B (poucos tenants, picos de autoria previsíveis), não para hipótese de viralidade de consumidor.  
- **Observabilidade mínima** da VM (disco, CPU, falhas de processo) — sem exigir suite enterprise no MVP.  
- **Escala horizontal** ou **multi-AZ** como **decisão futura** com ADR (§18), **não** pré-requisito para declarar MVP **implantável**.

**Anti-tendência:** justificar cluster ou serviços geridos **antes** de ter tráfego e operação medidos.

---

# 14. Logs em produção

## 14.1 Cloud

- Logs de aplicação e **auditoria** de export, licença e ações administrativas — [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §5, §15; armazenamento e retenção **proporcionais** (mesma spec §18).  
- **Não** tratar logs como substituto de métricas de produto; são **superfície de suporte e compliance** operacional.

## 14.2 Player

- Logs **locais** no dispositivo — [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §6, §14, §14.1 (extrato sob demanda).  
- **Não** envio automático de logs completos para a Cloud no MVP (privacidade, offline, superfície de dados — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3.3). **Sync** opcional futuro só com ADR e opt-in explícito ([AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §20).

---

# 15. Relação com segurança operacional

## 15.1 TLS / SSL e renovação operacional

- **TLS** em todo o tráfego público da Cloud (§4); **HSTS** e cabeçalhos razoáveis conforme prática da equipa.  
- **Renovação de certificados:** **não** pode depender **apenas** de ação manual **esquecível** (calendário pessoal sem alerta). **Obrigatório** haver **pelo menos um** dos seguintes (ou equivalente documentado): renovação **automatizada** (ex.: ACME com monitorização), ou **alertas** proativos de expiração com tempo de reação **antes** do break, ou serviço gerido que inclua renovação com SLA conhecido.  
- **Objetivo:** evitar indisponibilidade de **app.telaflow.ia.br** e erros de confiança no browser que **bloqueiem** export e download oficial do Player.

## 15.2 Backups da base de dados (PostgreSQL)

- Cadência e retenção **definidas** (fora de números nesta spec); **teste de restauro** periódico como obrigação **conceitual**.  
- Conteúdo inclui metadados de eventos, **registros de export** (`export_id`, atores, ligações a licença — [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md), [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md)).

## 15.3 Artefatos de export (Pack) na Cloud

A Cloud **não** armazena **mídia binária** do cliente no MVP ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3.1); o **artefato Pack** (arquivo exportado — tipicamente arquivo com JSON, manifesto, assinatura) **é** entretanto **ativo operacional e comercial** distinto da mídia do show.

**Política mínima:**

- **Rastreio** de cada export emitido na BD e logs de auditoria — **obrigatório** (já normativo nas specs de export e logging).  
- **Retenção do arquivo Pack** gerado pela operação de export: a Cloud **deve** poder **recuperar** o artefato exportado por um período **definido** (produto/compliance) — disco gerido no VPS, object storage, ou política equivalente — para **suporte** (“reenviar o mesmo `export_id`”), **disputas** e **reprodução** de incidentes **sem** exigir que o cliente seja a única cópia.  
- **Não** substitui o Pack na mão do operador no palco; **complementa** a governança na origem.

Prazos e custo de armazenamento ficam fora desta spec; a **obrigação conceitual** é: **BD sozinha não basta** se o suporte não conseguir aceder ao **blob** do export dentro da política acordada.

## 15.4 Segredos

Variáveis de ambiente ou cofre **mínimo** — chaves de assinatura de Pack, JWT/session, credenciais DB **nunca** em repositório; **rotação** documentada quando comprometimento.

## 15.5 Player (assinatura e workspace)

Assinatura de binário **quando** plataforma o permitir; política de **workspace** local (permissões de leitura de Pack) sem exigir admin desnecessário no SO.

---

# 16. Relação com licensing em produção

- **Emissão / selagem** na **Cloud** no momento (ou fluxo) de export — [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md); [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md); trilha auditável [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md).  
- **Consumo e validação** no **Player**, **offline** — claims, assinatura, expiração em UTC, estados `blocked` / grace conforme spec de licenciamento.  
- **Deployment** **não** pode exigir que o Player **telefone para casa** a cada validação de licença no núcleo do show salvo produto e ADR decidirem o contrário.

---

# 17. Anti-padrões de deployment

1. **Player dependente da Cloud** para carregar roteiro ou mídia no momento do show ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.5).  
2. **Distribuir Player** por link não oficial ou build não rastreado.  
3. **Deploy da Cloud** que **altera silenciosamente** semântica de export **sem** novo `pack_version` e ADR.  
4. **Forçar telemetria** do Player para a Cloud **sem** base legal e produto explícitos ([AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) §20).  
5. **Staging inexistente** **e** deploy direto em prod **sem** qualquer mitigação consciente de risco.  
6. **Certificados** inválidos ou misturar **cookies** de sessão entre domínios de marketing e app sem política.  
7. **Packs** servidos por **canal paralelo** (email de JSON “extra”) como substituto do export governado ([PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) §3).  
8. **Kubernetes** ou multi-região **antes** de VPS simples justificar limites.  
9. **Apenas backup de BD** sem política de **retenção do artefato Pack** exportado quando o suporte precisa do arquivo (§15.3).  
10. **Renovação TLS** confiada a lembrete humano **sem** monitorização nem automatismo (§15.1).  
11. **Remover** releases antigas do Player do canal oficial de forma que **rollback** (§9.3) seja impossível sem pedido manual à engenharia.

---

# 18. Evolução futura segura

**Não exigido no MVP;** permitido **depois** com ADR e atualização desta spec:

- **CDN** para assets estáticos do frontend ou downloads do Player (latência global).  
- **Object storage** se a Cloud passar a servir artefatos grandes **oficiais** (não confundir com armazenamento de mídia do cliente — [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §3.1).  
- **Update assistido** ou auto-update do Player com canal assinado (§9.2).  
- **Alta disponibilidade** (réplicas DB, load balancer) quando métricas e SLA o exigirem.  
- **Regiões** ou **DR** para continuidade do SaaS — sempre **sem** quebrar imutabilidade de Packs já entregues.

---

# 19. Critério normativo final

**Todo deployment e toda distribuição** do TelaFlow **respeitam** **Cloud → Pack → Player**: a Cloud **implanta-se** para **autorizar e empacotar**; o Player **distribui-se** para **consumir o Pack** com **previsibilidade**, **versão explícita** e **desacoplamento** operacional do palco. Infraestrutura **simples** no início é **compatível** com produto premium **desde que** contratos, TLS, backups e canais oficiais **não** sejam negligenciados.

Toda implantação deve **obedecer** a este documento e à hierarquia normativa no cabeçalho.

---

*Documento interno de arquitetura de implantação — TelaFlow. DEPLOYMENT_MODEL_SPEC v1.0.1. Derivado de [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) v1.1, [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) v1.1, [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) v1.0.3, [UI_SPEC.md](./UI_SPEC.md) v1.0, [EVENT_EDITOR_FEATURE_SPEC.md](./EVENT_EDITOR_FEATURE_SPEC.md) v1.1, [PRE_FLIGHT_FEATURE_SPEC.md](./PRE_FLIGHT_FEATURE_SPEC.md) v1.1, [PACK_EXPORT_FEATURE_SPEC.md](./PACK_EXPORT_FEATURE_SPEC.md) v1.0.2, [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md) v1.0.1, [LICENSING_FEATURE_SPEC.md](./LICENSING_FEATURE_SPEC.md) v1.0.1 e [AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md) v1.0.1.*
