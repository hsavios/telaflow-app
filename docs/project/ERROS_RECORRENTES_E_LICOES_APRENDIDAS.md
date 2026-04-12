# TelaFlow — Erros Recorrentes e Lições Aprendidas

Registro de erros reais já ocorridos no projeto para **evitar repetição**.

Sempre que surgir erro importante:

- registrar
- explicar causa
- registrar correção
- registrar prevenção

---

## 1. Variável `NEXT_PUBLIC_CLOUD_API_URL` não refletiu em produção

### Sintoma

Frontend em produção mostrou:

> Falha ao carregar  
> Configure NEXT_PUBLIC_CLOUD_API_URL apontando para a Cloud API.

### Causa

No Next.js, variáveis `NEXT_PUBLIC_*` são resolvidas no **build** da imagem.

Alterar apenas `.env` na VPS **não** muda o frontend já buildado.

### Correção

Passar a variável no **build** Docker (exemplo):

```bash
--build-arg NEXT_PUBLIC_CLOUD_API_URL=https://api.telaflow.ia.br
```

(Ajustar conforme o `Dockerfile` / workflow do repositório.)

### Prevenção

Sempre lembrar:

**`NEXT_PUBLIC_*` = build-time, não runtime.**

---

## 2. Porta ocupada no deploy

### Sintoma

Erro do tipo:

```txt
Bind for 127.0.0.1:8000 failed: port is already allocated
```

### Causa

Outro container ou processo já ocupava a porta (ex.: outro backend).

### Correção

Mover TelaFlow para portas livres no host, por exemplo:

- `API_PORT=8002`
- `WEB_PORT=3002`

### Prevenção

Antes de publicar:

```bash
docker ps
sudo ss -ltnp | grep <porta>
```

---

## 3. Workflow duplicado gerou confusão

### Sintoma

Existiam, por exemplo:

- `deploy.yml`
- `deploy-vps.yml`

### Causa

Criação de workflow novo sem necessidade clara.

### Correção

Manter **apenas** o fluxo oficial acordado (ex.: um único `.github/workflows/deploy.yml`), removendo ou desativando o duplicado.

### Prevenção

Nunca criar workflow novo sem motivo explícito e sem atualizar a documentação do projeto.

---

## 4. GHCR login falhou

### Sintoma

Erro do tipo:

```txt
Username required
```

### Causa

`docker/login-action` (ou equivalente) sem `username` configurado.

### Correção

Usar credenciais explícitas nos secrets, por exemplo:

```yaml
username: ${{ secrets.GHCR_USERNAME }}
password: ${{ secrets.GHCR_TOKEN }}
```

### Prevenção

Revisar login GHCR **antes** do primeiro push de imagem no pipeline.

---

## 5. Divergência Git local × remoto

### Sintoma

Mensagem de branch divergente / push rejeitado (`non-fast-forward`).

### Causa

Commits locais e remotos diferentes na mesma branch.

### Correção

```bash
git pull --rebase origin main
```

(Resolver conflitos se aparecerem, depois `git push`.)

### Prevenção

Antes de push importante:

```bash
git status
git pull --rebase origin main
```

---

## 6. Testar path errado no `git add`

### Sintoma

```txt
pathspec did not match any files
```

### Causa

Executar `git add` com caminho relativo errado a partir da pasta atual (não raiz do repo).

### Correção

Lembrar: paths são relativos à **raiz do repositório** (ou usar caminho absoluto).

### Prevenção

Antes de comandos sensíveis:

```bash
pwd
```

---

## 7. Confusão entre local e VPS

### Sintoma

Comandos executados no host errado (efeitos inesperados ou “não mudou nada”).

### Causa

Mistura mental entre notebook local e servidor VPS.

### Correção

Sempre verificar contexto:

```bash
pwd
hostname
```

### Prevenção

Nunca executar sequência crítica (compose, `rm`, migração) sem saber **em qual máquina** está.

---

## 8. Build passou mas produção não refletiu

### Causa

Build local OK **não** implica deploy concluído ou containers atualizados.

### Regra

Sempre validar, em cadeia:

1. GitHub Actions concluído com sucesso  
2. Imagem publicada no registry  
3. Container na VPS atualizado (`pull` / `up`)  
4. URL final (app + API)  

---

## 9. Store em memória gera “falsa persistência”

### Sintoma

Evento ou scene **some** após reinício do container.

### Causa

Cloud API atual usa armazenamento **em memória** — comportamento esperado nesta fase.

### Correção

Nenhuma “correção” de bug: é limitação conhecida até existir persistência real.

### Prevenção

Documentar e lembrar: [CURRENT_STATUS.md](./CURRENT_STATUS.md); não assumir dados sobrevivendo a restart em produção.

---

## 10. Regra principal aprendida

A IA **acelera** código.

Mas **infra**, **build**, **deploy** e **arquitetura** continuam a exigir **validação humana** consciente.
