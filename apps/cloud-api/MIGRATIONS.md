# Database Migrations - TelaFlow Cloud API

## Overview

Este documento descreve o processo de migrações de banco de dados para o TelaFlow Cloud API, usando Alembic para versionamento e suporte a SQLite (desenvolvimento) e PostgreSQL (produção).

## Setup Inicial

### 1. Instalação do Alembic

```bash
# Alembic já foi adicionado ao pyproject.toml
pip install alembic
```

### 2. Configuração

O Alembic foi configurado em:
- `alembic.ini` - Configuração principal
- `alembic/env.py` - Environment com import dos models
- `alembic/versions/` - Migration files

### 3. Migration Baseline

Foi criada a migration inicial `ba77ed883ca0` com todas as tabelas da Fase 1:
- organizations
- users  
- memberships
- events
- scenes
- draw_configs
- media_requirements
- export_packages
- draw_registration_sessions
- draw_registrations

## Comandos Alembic

### Criar Nova Migration
```bash
# Autogenerate baseado nos models
alembic revision --autogenerate -m "Descrição da migration"

# Migration manual (vazia)
alembic revision -m "Descrição da migration"
```

### Aplicar Migrations
```bash
# Aplicar todas as migrations
alembic upgrade head

# Aplicar migration específica
alembic upgrade +1

# Aplicar até versão específica
alembic upgrade ba77ed883ca0
```

### Reverter Migrations
```bash
# Reverter última migration
alembic downgrade -1

# Reverter para versão específica
alembic downgrade ba77ed883ca0

# Reverter tudo (baseline)
alembic downgrade base
```

### Status
```bash
# Verificar versão atual
alembic current

# Verificar histórico
alembic history

# Verificar migrations pendentes
alembic heads
```

## Migração SQLite -> PostgreSQL

### Pré-requisitos
1. PostgreSQL instalado e rodando
2. Database e usuário criados
3. psycopg instalado (`pip install psycopg[binary]`)

### Processo Automatizado

```bash
# 1. Configurar environment variable
export DATABASE_URL="postgresql://telaflow:password@localhost:5432/telaflow_cloud"

# 2. Atualizar alembic.ini para PostgreSQL
# Editar sqlalchemy.url em alembic.ini

# 3. Rodar script de migração
python scripts/migrate_to_postgresql.py
```

### Processo Manual

```bash
# 1. Exportar dados do SQLite
python scripts/migrate_to_postgresql.py --export-only

# 2. Criar database PostgreSQL
createdb telaflow_cloud

# 3. Rodar migrations
alembic upgrade head

# 4. Importar dados
python scripts/migrate_to_postgresql.py --import-only
```

## Environment Variables

```bash
# SQLite (desenvolvimento)
DATABASE_URL="sqlite:///telaflow_cloud_api.db"

# PostgreSQL (produção/staging)  
DATABASE_URL="postgresql://user:password@localhost:5432/telaflow_cloud"
```

## Boas Práticas

### 1. Sempre Autogenerate
Use `--autogenerate` sempre que possível para evitar erros manuais.

### 2. Review das Migrations
Sempre revise o arquivo gerado antes de aplicar:
```bash
alembic revision --autogenerate -m "Add new table"
cat alembic/versions/xxxxx_add_new_table.py
```

### 3. Testes em Development
Teste migrations em ambiente de desenvolvimento antes de produção.

### 4. Backup Sempre
Faça backup antes de migrations em produção:
```bash
pg_dump telaflow_cloud > backup_before_migration.sql
```

### 5. Nomenclatura
Use nomes descritivos nas migrations:
- "Add user_profile table"
- "Add index on events.organization_id" 
- "Fix scene.sort_order constraint"

## Troubleshooting

### Erro: "target_metadata is None"
Verifique se os models estão sendo importados corretamente em `alembic/env.py`.

### Erro: "No changes detected"
Verifique se há diferenças entre os models e o database atual.

### Erro: "Relation already exists"
Pode ser que a migration já foi aplicada. Verifique com `alembic current`.

### Erro de PostgreSQL
Verifique se o database existe e se as permissões estão corretas.

## Histórico de Migrations

| ID | Descrição | Data |
|----|-----------|------|
| ba77ed883ca0 | Initial baseline - create all tables for Fase 1 | 2026-04-12 |
| b247d7245896 | Add PostgreSQL compatibility and timezone support | 2026-04-12 |

## Próximos Passos (Fase 2)

Para a Fase 2, esperamos as seguintes migrations:
- Add OAuth provider tables
- Add session management
- Add audit logs
- Add branding themes
- Add pre-flight results
