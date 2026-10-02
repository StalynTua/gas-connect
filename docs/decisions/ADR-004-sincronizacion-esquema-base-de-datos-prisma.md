# ADR-004: Protocolo de Sincronización y Evolución del Esquema de Base de Datos con Prisma (pnpm prisma:push & PostGIS)

- **Estado:** Aceptado (Accepted)
- **Fecha:** 2026-10-02
- **Autores:** Equipo de Arquitectura e Ingeniería GasConnect Ibarra
- **Decisores:** Desarrollador Principal, Arquitecto de Software
- **Contexto de Conversación:** Resolución y prevención de error P2021 (tabla inexistente en runtime/seed)

---

## 1. Contexto y Problemática

En GasConnect Ibarra, la persistencia de datos reside en una base de datos PostgreSQL 16 con extensión espacial PostGIS:
1. **Tipos Espaciales Nativos PostGIS:** El esquema de Prisma (`apps/api/prisma/schema.prisma`) utiliza tipos declarados como `Unsupported("geometry(Point, 4326)")` para la indexación y cálculo geográfico de camiones y pedidos.
2. **Coexistencia con Evolution API:** En el contenedor Docker, Evolution API (WhatsApp Gateway) comparte el clúster PostgreSQL (`gasconnect_ibarra`). Si no se aísla estrictamente el esquema de migraciones, coexisten registros de migraciones en `_prisma_migrations`, generando falsos positivos de *drift* cuando se utiliza `prisma migrate dev`.
3. **Causa Raíz del Incidente (Error P2021):**
   Durante la adición del bounded context `auth` (modelos `Account`, `AccountSession` y enum `AccountRole`), se actualizó el archivo `schema.prisma` y se ejecutó `prisma generate` (permitiendo que TypeScript y Vitest compilaran con mocks). Sin embargo, el esquema **nunca se aplicó al PostgreSQL físico**.
   Al ejecutar `pnpm prisma:seed`, Prisma arrojó el fallo:
   ```text
   PrismaClientKnownRequestError: The table public.account_sessions does not exist in the current database.
   code: 'P2021'
   ```
4. **Necesidad de un protocolo explícito:** Se requiere una convención inmutable y automatizada para que cualquier desarrollador o agente que modifique o extienda `schema.prisma` sincronice la base de datos de manera determinista y sin romper datos ni extensiones espaciales.

---

## 2. Decisiones Arquitectónicas

### 2.1. Adopción de `prisma db push` como Estándar de Sincronización
Se establece que la sincronización del esquema en desarrollo local e integración continua se gestiona mediante:
```bash
pnpm prisma:push
```
(equivalente a `pnpm --filter @gasconnect/api exec prisma db push`).

**Justificación:**
- **Compatibilidad PostGIS:** `prisma db push` detecta las columnas espaciales `Unsupported` sin intentar revertirlas ni fallar por tipos SQL nativos desconocidos por el parser de migraciones de Prisma.
- **Idempotencia sin colisión de migraciones:** No depende de la tabla `_prisma_migrations` compartida con Evolution API, analizando directamente el catálogo de PostgreSQL (`information_schema` y `pg_catalog`) para aplicar únicamente los DDL faltantes (tablas, columnas, índices, claves foráneas y enums).
- **Auto-generación de cliente:** Ejecuta automáticamente `prisma generate` al concluir el push, garantizando consistencia absoluta entre la base de datos física y el cliente `@prisma/client`.

### 2.2. Estandarización de Scripts en Monorepo
Se integraron en el [`package.json` raíz](../../package.json) y en [`apps/api/package.json`](../../apps/api/package.json) los siguientes scripts de ciclo de vida:

| Script | Comando Interno | Propósito |
|---|---|---|
| `pnpm prisma:push` | `prisma db push` | Sincroniza el esquema DDL directamente con PostgreSQL y regenera `@prisma/client`. |
| `pnpm prisma:generate` | `prisma generate` | Regenera los tipos TypeScript del cliente Prisma sin tocar la base de datos. |
| `pnpm prisma:seed` | `tsx prisma/seed.ts` | Limpia e inserta la distribuidora, camiones piloto con credenciales Argon2id y clientes en Ibarra. |

---

## 3. Protocolo Obligatorio para Cambios de Esquema

Cualquier cambio a `apps/api/prisma/schema.prisma` debe seguir estrictamente este flujo de 5 pasos antes de considerar la tarea terminada:

```
 [1. MODIFICAR]             [2. EMPUJAR]            [3. REPO/TYPES]          [4. SEED & FIXTURES]         [5. VERIFICAR]
schema.prisma       ───▶  pnpm prisma:push   ───▶  DDD Repositories   ───▶   pnpm prisma:seed    ───▶   pnpm check:task
(Modelos/Enums)          (Aplica DDL a BD)       (Dominio e Infra)          (Datos de prueba)          (Gates + Tests)
```

1. **Modificar Esquema:** Editar `apps/api/prisma/schema.prisma` definiendo los nuevos modelos, campos o enums, respetando el mapeo explícito de columnas (`@map("snake_case")`) y tablas (`@@map("table_name")`).
2. **Sincronizar Base de Datos (`pnpm prisma:push`):** Aplicar inmediatamente los cambios a PostgreSQL. Si la consola reporta advertencias de pérdida de datos en desarrollo, evaluar si se requiere `--accept-data-loss`.
3. **Actualizar Repositorios DDD:** Adaptar las entidades de dominio y los repositorios de infraestructura en `apps/api/src/modules/<context>/infrastructure/`.
4. **Actualizar y Ejecutar Seed (`pnpm prisma:seed`):** Si el nuevo modelo requiere datos iniciales o es referenciado en la limpieza previa (`deleteMany`), actualizar `apps/api/prisma/seed.ts` y correr el comando para validar integridad referencial.
5. **Verificación Integral (`pnpm check:task`):** Ejecutar los quality gates (`floor-guard`, `check-ddd-boundaries`, `check:types` y la suite de `pnpm test`).

---

## 4. Consecuencias y Salvaguardas

- **Consecuencias Positivas:**
  - Se erradica por completo el error `P2021` por tablas o columnas faltantes.
  - La sincronización toma $< 500\text{ ms}$ y no requiere lidiar con archivos de migración manuales durante el desarrollo activo.
  - Garantiza que cualquier agente de codificación futuro tenga un paso verificable en el *Definition of Done*.
- **Salvaguardas:**
  - El comando `pnpm prisma:push` ha sido incorporado a la sección de *Definition of Done (DoD)* en [`AGENTS.md`](../../AGENTS.md).
  - Nunca se debe intentar realizar un commit que contenga modificaciones en `schema.prisma` sin haber ejecutado y verificado `pnpm prisma:push` y `pnpm prisma:seed`.
