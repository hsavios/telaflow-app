# ADR-001: Usar Alembic para Database Migrations

## Status
Accepted

## Context
A PHASE_1_EXECUTION_SPEC §10.1 exige migrations versionadas desde a primeira tabela. O código atual usa `create_all_tables()` do SQLAlchemy, que não permite versionamento nem rollback controlado. Isso viola a spec e cria risco de drift entre ambientes.

## Decision
Adotar Alembic como sistema oficial de migrations para o TelaFlow Cloud API. Alembic é o padrão de fato para SQLAlchemy, oferece autogeneration, rollback controlado e funciona com SQLite e PostgreSQL.

## Consequences
**Benefícios:**
- Versionamento de schema conforme spec
- Rollback controlado e seguro
- Autogeneration baseado nos models
- Suporte para SQLite (dev) e PostgreSQL (prod)
- Histórico auditável de mudanças
- CI/CD integration facilitado

**Custos:**
- Complexidade adicional no setup
- Necessidade de aprender comandos Alembic
- Tempo extra para criar migrations

## Alternatives Considered
1. **SQL manual:** Mais flexível mas propenso a erros e sem autogeneration
2. **Custom migration system:** Overkill e reinvenção da roda
3. **Manter create_all_tables():** Simples mas viola spec e não é production-ready

## Implementation Notes
- Alembic configurado com target_metadata = Base.metadata
- Environment variable DATABASE_URL suporta SQLite e PostgreSQL
- Script de migração SQLite -> PostgreSQL criado
- Documentação completa em MIGRATIONS.md

## Impact on Contracts

| Componente | Impacto | Ação Necessária |
|------------|---------|-----------------|
| shared-contracts | None | Nenhuma |
| cloud-api | Non-breaking | Adicionar Alembic, manter API igual |
| cloud-web | None | Nenhuma |
| player | None | Nenhuma |

## Migration Strategy
1. Criar migration baseline com schema atual
2. Configurar Alembic para PostgreSQL
3. Criar script de migração de dados
4. Atualizar documentation

## Testing Strategy
- Testar upgrade/downgrade em ambiente dev
- Validar que dados são preservados
- Testar com SQLite e PostgreSQL
- Incluir no CI pipeline

## Documentation Updates
- MIGRATIONS.md criado
- .env.example atualizado
- FASE_1_ACCEPTANCE.md atualizado

## Related ADRs
- Template: [ADR-000](000-template-adr.md)

## Date
2026-04-12

## Authors
Equipe TelaFlow
