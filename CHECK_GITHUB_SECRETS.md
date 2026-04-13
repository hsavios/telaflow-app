# Checklist de Secrets para GitHub Actions

## Secrets Obrigatórios no Repository → Settings → Secrets and variables → Actions

### Para Deploy
- `SSH_HOST` = "191.249.186.129"
- `SSH_USER` = "helio" 
- `SSH_PRIVATE_KEY` = (sua chave privada SSH)
- `SSH_PORT` = "2222"  ← **IMPORTANTE!**
- `GHCR_TOKEN` = (token do GitHub Container Registry)

### Para SSH Known Hosts (Opcional)
- `SSH_KNOWN_HOSTS_LINE` = (saída de: ssh-keyscan -H 191.249.186.129)

## Como Gerar Secrets

### SSH Private Key
```bash
# No servidor
cat ~/.ssh/id_ed25519
# Copiar e colar como secret SSH_PRIVATE_KEY
```

### GHCR Token
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token → Classic
3. Scopes: `write:packages`
4. Copiar token como secret GHCR_TOKEN

## Verificação
Depois de adicionar os secrets:
1. Faça um push qualquer
2. Verifique se o deploy funciona
3. Se falhar, cheque os logs em Actions → Deploy TelaFlow
