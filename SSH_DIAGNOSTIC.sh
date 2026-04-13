#!/bin/bash
echo "=== Diagnóstico SSH para Deploy ==="
echo ""

echo "1. Status do serviço SSH:"
sudo systemctl status sshd --no-pager
echo ""

echo "2. Portas SSH em escuta:"
sudo netstat -tlnp | grep -E ":22|:2222"
echo ""

echo "3. Regras do firewall (UFW):"
sudo ufw status verbose
echo ""

echo "4. IP público do servidor:"
curl -s ifconfig.me
echo ""

echo "5. Teste de conexão local SSH:"
ssh -o ConnectTimeout=5 localhost "echo 'SSH local funcionando'" || echo "SSH local com problemas"
echo ""

echo "=== Fim do diagnóstico ==="
