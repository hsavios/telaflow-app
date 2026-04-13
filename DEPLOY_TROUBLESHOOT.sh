#!/bin/bash

echo "=== Verificação de Deploy TelaFlow ==="
echo ""

echo "1. Status dos containers no servidor:"
echo "ssh -p 2222 helio@191.249.186.129 'cd /opt/telaflow && docker compose ps'"
echo ""

echo "2. Logs dos containers:"
echo "ssh -p 2222 helio@191.249.186.129 'cd /opt/telaflow && docker compose logs --tail=20'"
echo ""

echo "3. Teste de conectividade externa:"
echo "De sua máquina local:"
echo "telnet 191.249.186.129 2222"
echo "Ou:"
echo "nc -zv 191.249.186.129 2222"
echo ""

echo "4. Verificar secrets no GitHub:"
echo "Repository → Settings → Secrets and variables → Actions"
echo "Precisa ter: SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, SSH_PORT, GHCR_TOKEN"
echo ""

echo "=== Fim ==="
