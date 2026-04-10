# TelaFlow — Framework de Avaliação de Funcionalidades (FEATURE_EVALUATION_FRAMEWORK)

**Versão:** 1.0  
**Status:** Documento normativo — avaliação de novas funcionalidades **antes** de entrarem em spec formal  
**Última revisão:** 2026-04-10  

**Hierarquia normativa:** Este framework é **derivado e subordinado** ao [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) e ao [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md). Em conflito, prevalecem esses documentos. A ordem de implementação do MVP obedece ao [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md); este framework **não** substitui o plano — **filtra** o que merece virar spec e entrar no roadmap.

**Escopo:** critérios para **decidir** se uma ideia evolui para spec; **sem código**. Specs formais existentes (UI, editor, Pack, runtime, etc.) já passaram pelo produto; **novas** propostas repetem o rigor através deste documento.

---

## Papel deste documento

Nem toda boa ideia merece virar feature.

No TelaFlow, qualquer nova funcionalidade deve ser testada contra:

* realidade operacional de palco  
* coerência arquitetural  
* clareza comercial  
* geração de valor mensurável ou de **sinal** útil (operacional, auditoria ou negócio — ver §6)

Este framework existe para impedir:

* overengineering  
* features sedutoras mas frágeis  
* desvio de categoria de produto ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §1.4, §2)  
* perda de foco do MVP ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §2.2, [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md))

---

# 1. Pergunta zero obrigatória

## Esta feature ainda pertence ao TelaFlow?

Antes de qualquer análise:

A funcionalidade precisa continuar pertencendo à categoria definida no [PRODUCT_SPEC.md](./PRODUCT_SPEC.md):

**plataforma visual inteligente para eventos ao vivo**

Se a feature empurrar o produto para:

* marketing platform genérica  
* social app  
* CRM  
* streaming suite  
* editor criativo livre

a feature deve ser **rejeitada** ou **isolada** (produto derivado, integração externa, roadmap pós-core — sempre com ADR se tocar arquitetura).

---

# 2. Filtro operacional obrigatório

Toda feature deve responder:

## Funciona em evento real sob pressão?

Testar mentalmente:

* operador multitarefa  
* internet ruim ou ausente no núcleo do show ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.5)  
* pouco tempo  
* público heterogéneo  
* falha humana  

Perguntas obrigatórias:

* exige explicação longa?  
* exige atenção demais do operador?  
* quebra o ritmo do palco?  
* depende de rede demais para o **momento crítico**?  
* falha de forma **controlável** e **explicável** ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.8)?  

Se não sobreviver a isso: **não entra** no núcleo.

---

# 3. Filtro do operador

Toda feature deve preservar:

## O operador de mídia continua no controlo

Perguntas obrigatórias:

* o operador consegue **iniciar**?  
* **pausar**?  
* **abortar** ou sair de estado preso?  
* **entender** o estado atual (alinhado a estados nomeados e UI de palco — [UI_SPEC.md](./UI_SPEC.md), [PLAYER_RUNTIME_FEATURE_SPEC.md](./PLAYER_RUNTIME_FEATURE_SPEC.md))?  

Se a feature cria comportamento difícil de prever: **rejeitar** ou **simplificar**.

---

# 4. Filtro visual

Toda feature que produz **saída para telão** precisa funcionar nesse meio.

Perguntas obrigatórias:

* entendimento em poucos segundos?  
* leitura à distância?  
* contraste suficiente?  
* sem poluição visual?  

Se depende de leitura detalhada no telão: **não serve** ao núcleo do produto (pode ser Cloud-only ou secundária com escopo explícito).

---

# 5. Filtro offline-first

Toda feature deve responder:

## O que acontece sem internet estável?

Perguntas:

* o **núcleo** do show continua funcionando? ([ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.5)  
* degrada de forma elegante?  
* bloqueia o evento de forma injustificada?  

Se depende **totalmente** de internet para o que o [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) trata como execução de palco: **não pertence** ao núcleo MVP.

---

# 6. Filtro de dados

Toda feature deve gerar **pelo menos um sinal ou artefacto útil** — não necessariamente métrica de marketing.

Pergunta obrigatória:

## Que dado ou registo nasce automaticamente disso?

**Exemplos válidos (negócio / engagement):** taxa de participação, tempo de resposta, picos de uso declarados, distribuição por rodada — quando a feature for de interação mensurável.

**Exemplos válidos (operacional / auditoria — TelaFlow):** resultado de pre-flight, transição de FSM registada, `export_id` / `run_id` correlacionáveis, linha de auditoria Cloud ([AUDIT_LOGGING_SPEC.md](./AUDIT_LOGGING_SPEC.md)) — quando a feature for de **confiabilidade** ou **governança**.

Se **não** gera dado, registo ou estado auditável que justifique manutenção e suporte: **avaliar** se ainda justifica existir; forte candidato a **adiar** ou fundir noutra feature.

---

# 7. Filtro comercial

Toda feature deve responder:

## Isto vende ou retém?

Perguntas:

* ajuda fechar contrato?  
* ajuda cobrar mais ou justificar preço premium?  
* ajuda diferenciar em RFP / comparação com improviso?  

Se não melhora venda nem retenção **e** falha nos filtros operacionais: **forte candidato a adiar**.

---

# 8. Filtro patrocinador

**Quando aplicável** (mídia de patrocínio, slots, relatórios para marca):

## O patrocinador entende valor rápido?

Perguntas:

* há métrica ou narrativa clara?  
* há história executiva curta?  
* cabe em relatório pós-evento sem laboratório de dados?  

Se a feature é “para patrocinador” mas não fecha este filtro: **simplificar** ou **adiar**.

---

# 9. Filtro arquitetural

Toda feature deve respeitar:

**Cloud → Pack → Player** ([PRODUCT_SPEC.md](./PRODUCT_SPEC.md) §5, [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) §2.1–§2.3)

Perguntas:

* o que entra na **Cloud** (autoria, governança)?  
* o que entra no **Pack** (congelado, assinável, transportável)?  
* o que entra no **Player** (execução, validação local)?  
* **exige quebrar contrato** já congelado numa fase fechada do [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) §14.1?  

Se quebra contrato: **não entra** sem **ADR** e atualização das specs afetadas.

---

# 10. Filtro MVP

Pergunta obrigatória:

## Isto precisa nascer agora?

Classificação:

### Core MVP

Sem isso o produto **perde força** essencial ou viola promessa do [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) / [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md).

### Near MVP

Importante **logo após** o núcleo vertical (§3.1 do plano de MVP).

### Future

Bom mas **não essencial**; não desviar energia da primeira vertical e das fases fechadas.

---

# 11. Critério de complexidade

Toda feature deve ser classificada:

## Baixa

## Média

## Alta complexidade

Se **alta complexidade**: precisa **justificar valor** frente a §2–§7 e §10; caso contrário **adiar** ou **decompor**.

---

# 12. Critério de risco

Classificar explicitamente:

## Risco operacional

Impacto no palco, no operador, na recuperação de falha.

## Risco técnico

Acoplamento, superfície de segurança, dívida contratual (Pack/API).

## Risco comercial

Expectativa de cliente, posicionamento, suporte e SLA implícito.

---

# 13. Resultado obrigatório de avaliação

Toda análise deve terminar com **uma** classificação principal (e notas de condição):

| Símbolo | Significado |
|---------|-------------|
| ✅ **manter** | Segue para especificação formal / backlog priorizado com escopo fechado. |
| ⚠️ **ajustar** | Ideia válida com condições: reduzir escopo, mudar camada (Cloud vs Pack vs Player), adicionar pre-flight ou logging obrigatório, etc. |
| ❌ **adiar / remover** | Não entra; documentar motivo breve para não reabrir sem nova avaliação. |
| 🔥 **oportunidade premium** | Diferenciação forte **e** passa filtros 1–5 e 9; ainda assim exige §10–§12 antes de spec. |

---

# 14. Regra normativa final

**Nenhuma feature entra em spec formal sem passar por este framework.**

**Spec nasce depois da avaliação. Nunca antes.**

Exceções **documentadas** (correção de bug, alinhamento a spec já aprovada, segurança crítica) não são “novas features”: tratam-se via revisão da spec existente ou ADR, sem contornar §9.

---

# 15. Prompt oficial para testar novas ideias

Ao analisar uma nova funcionalidade (humano ou assistido por IA), usar:

> Analise esta feature segundo o **FEATURE_EVALUATION_FRAMEWORK** do TelaFlow.  
> Considere: palco real; operador no controlo; offline-first no núcleo; geração de **sinal ou dado útil** (operacional ou comercial); coerência com **Cloud → Pack → Player**; alinhamento ao **PRODUCT_SPEC** e **MVP_IMPLEMENTATION_PLAN**.  
> Responder com **uma** conclusão: ✅ manter | ⚠️ ajustar | ❌ adiar | 🔥 oportunidade premium — e bullets curtos de raciocínio por filtro aplicável.

---

*Documento interno de governança de produto — TelaFlow. FEATURE_EVALUATION_FRAMEWORK v1.0. Relacionado: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) v1.1, [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) v1.1, [MVP_IMPLEMENTATION_PLAN.md](./MVP_IMPLEMENTATION_PLAN.md) v1.0.3, [MASTER_CONTEXT.md](../context/MASTER_CONTEXT.md).*
