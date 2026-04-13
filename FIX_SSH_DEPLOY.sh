#!/bin/bash
echo "=== CORRIGIR DEPLOY SSH ==="
echo ""

echo "1. Configurar SSH para porta 22:"
echo "sudo nano /etc/ssh/sshd_config"
echo "# Mudar: Port 22"
echo "# Remover/comentar: Port 2222"
echo ""

echo "2. Reiniciar SSH:"
echo "sudo systemctl restart sshd"
echo ""

echo "3. Verificar porta SSH:"
echo "ss -tlnp | grep :22"
echo ""

echo "4. Configurar firewall:"
echo "sudo ufw allow 22/tcp"
echo "sudo ufw reload"
echo ""

echo "5. Testar conectividade:"
echo "ssh helio@191.249.186.129"
echo ""

echo "6. No GitHub:"
echo "- Remover secret SSH_PORT"
echo "- Fazer push para testar deploy"
echo ""

echo "=== FIM ==="
