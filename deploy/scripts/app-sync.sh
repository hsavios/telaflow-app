#!/usr/bin/env bash
# Roda na VPS: git pull na branch main e build/verificação do monorepo TelaFlow (telaflow_app).
#
# Uso (a partir da raiz do repositório clonado na VPS):
#   ./deploy/scripts/app-sync.sh
#   ./deploy/scripts/app-sync.sh --force
#
# Opcional:
#   FORCE_APP_REBUILD=1 ./deploy/scripts/app-sync.sh
#   TELAFLOW_APP_SYNC_REPO=/caminho/absoluto/telaflow_app ./deploy/scripts/app-sync.sh

set -euo pipefail

FORCE=0
for arg in "$@"; do
	case "$arg" in
	--force) FORCE=1 ;;
	-h | --help)
		sed -n '2,15p' "$0"
		exit 0
		;;
	esac
done
if [[ "${FORCE_APP_REBUILD:-0}" == 1 ]]; then
	FORCE=1
fi

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT="${TELAFLOW_APP_SYNC_REPO:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

cd "$REPO_ROOT"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
	echo "Erro: não é um repositório git: $REPO_ROOT" >&2
	exit 1
fi

OLD=$(git rev-parse HEAD)
git pull --ff-only origin main
NEW=$(git rev-parse HEAD)

if [[ "$OLD" == "$NEW" && "$FORCE" -ne 1 ]]; then
	echo "$(date -Iseconds) TelaFlow app: nada novo em origin/main."
	echo "  Para rodar o build mesmo assim: ./deploy/scripts/app-sync.sh --force"
	exit 0
fi

if [[ "$FORCE" -eq 1 && "$OLD" == "$NEW" ]]; then
	echo "$(date -Iseconds) TelaFlow app: --force → build sem commits novos."
else
	echo "$(date -Iseconds) TelaFlow app: atualizado ($OLD → $NEW). Build."
fi

if ! command -v npm >/dev/null 2>&1; then
	echo "Erro: npm não encontrado no PATH (instale Node.js 20+ na VPS)." >&2
	exit 1
fi

npm ci
npm run verify

echo "$(date -Iseconds) TelaFlow app: build OK."
