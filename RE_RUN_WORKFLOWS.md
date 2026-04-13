# Como Re-run Workflows Falhados

## 1. Deploy TelaFlow (SSH Timeout)
- URL: https://github.com/hsavios/telaflow-app/actions
- Encontrar workflow "Deploy TelaFlow" com falha
- Clique no workflow
- Botão: "Re-run jobs" -> "Re-run failed jobs"
- **Resultado esperado:** SUCCESS (agora com porta 22)

## 2. CI (Backend passlib/bcrypt)
- URL: https://github.com/hsavios/telaflow-app/actions
- Encontrar workflow "CI" com falha
- Clique no workflow
- Botão: "Re-run jobs" -> "Re-run failed jobs"
- **Resultado esperado:** SUCCESS (com correções aplicadas)

## 3. Verificar Resultados
- CI deve passar (19 testes)
- Deploy deve funcionar (SSH porta 22)
- Aplicação deve atualizar no servidor

## 4. Se Ainda Falhar
- Verificar logs específicos
- Corrigir se necessário
- Re-run novamente
