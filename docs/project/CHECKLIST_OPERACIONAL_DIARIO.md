# TelaFlow — Checklist Operacional Diário

Rotina prática antes, durante e depois de trabalhar no repositório — alinhada ao [PROJECT_OPERATING_MANUAL.md](./PROJECT_OPERATING_MANUAL.md).

---

## Antes de começar qualquer sessão

### 1. Entender estado atual

Executar:

```bash
git status
git branch
```

Confirmar:

- branch correta
- se há alterações pendentes
- se existe algo não commitado

---

### 2. Ler o estado do projeto

Consultar:

- [CURRENT_STATUS.md](./CURRENT_STATUS.md)
- [NEXT_STEPS.md](./NEXT_STEPS.md)

---

### 3. Confirmar objetivo do dia

Responder mentalmente:

Hoje vou mexer em:

- frontend?
- backend?
- deploy?
- infra?
- produto?

Nunca entrar sem objetivo claro.

---

## Quando o Cursor entregar código

### 4. Nunca aceitar direto

Executar:

```bash
git diff --stat
```

---

### 5. Ver onde mexeu

Se backend:

```bash
git diff -- apps/cloud-api
```

Se frontend:

```bash
git diff -- apps/cloud-web
```

---

### 6. Perguntar sempre

O que mudou?

- endpoint novo?
- contrato?
- UI?
- env?
- docker?
- workflow?

---

## Validação mínima obrigatória

### Frontend

```bash
npm run build -w cloud-web
```

---

### Backend

```bash
curl -sS http://127.0.0.1:8000/health
```

Se houver endpoint novo: testar o endpoint real (ex.: `curl` ou UI).

---

## Antes de commit

### 7. Só commitar se entendeu o impacto

Perguntar:

Isso muda:

- infra?
- deploy?
- produção?
- Cloudflare?
- Docker?

---

## Commit correto

### 8. Commit pequeno e claro

Exemplo:

```bash
git commit -m "feat: add initial scene management per event"
```

Nunca commit genérico.

---

## Depois do push

### 9. Acompanhar GitHub Actions

Confirmar:

- build API
- build Web
- push GHCR
- deploy VPS

---

## Após deploy

### 10. Validar produção

Aplicação:

https://app.telaflow.ia.br

API (health):

https://api.telaflow.ia.br/health

---

## Se algo falhar

### 11. Nunca sair alterando sem diagnóstico

Primeiro levantar:

- erro exato
- container
- env
- workflow
- log

---

## Comandos principais VPS

```bash
docker ps
docker logs telaflow-cloud-api
docker logs telaflow-cloud-web
cat /opt/telaflow/.env
docker compose up -d
```

*(Ajuste caminhos e nomes de serviço se o ambiente divergir do padrão atual.)*

---

## Regra de ouro pessoal

Nunca deixar a IA decidir sozinha a arquitetura.

Sempre perguntar:

**Isso faz sentido para o estágio atual do produto?**

---

## Regra de crescimento técnico

Todo dia entender pelo menos:

- uma decisão nova  
**ou**
- um erro novo  
**ou**
- um padrão novo  

---

## Meta real

Não virar programador clássico.

Virar **operador consciente de arquitetura** assistido por IA.
