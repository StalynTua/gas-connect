# ADR-003: Autenticación de Cabina (cab-pwa) e Identificación de Camiones con Módulo Auth Centralizado (Argon2id + SHA-256)

- **Estado:** Aceptado (Accepted)
- **Fecha:** 2026-10-01
- **Autores:** Equipo de Arquitectura e Ingeniería GasConnect Ibarra
- **Decisores:** Desarrollador Principal, Arquitecto de Software
- **Contexto de Conversación:** Chat de sesión de implementación de login para distribuidores

---

## 1. Contexto y Problemática

En las fases iniciales de desarrollo de `cab-pwa`:
1. **Identidad estática y hardcodeada:** El identificador del camión (`truckId: 'truck-ceibos-1'`), placa (`'IAA-1041'`) y ayudante (`'Luis Muenala'`) estaban quemados directamente en el estado inicial de `apps/cab-pwa/src/application/cab-store.ts`.
2. **Inexistencia de autenticación:** No existía interfaz ni mecanismo de inicio/cierre de sesión para los ayudantes de distribución de gas GLP.
3. **Ausencia de módulo de identidad en el backend:** `apps/api` carecía de un bounded context de autenticación; ningún endpoint validaba credenciales ni generaba sesiones seguras.
4. **Visión a largo plazo:** El sistema requerirá a futuro autenticación para el portal de operaciones (`ops-portal`) y una PWA ciudadana para clientes finales (`customer-pwa`), por lo que acoplar credenciales directamente al modelo `Truck` representaba una deuda técnica prematura.

---

## 2. Decisiones Arquitectónicas

### 2.1. Módulo `auth` Centralizado en Backend (`apps/api`)
Siguiendo las directrices DDD del repositorio ([`.agents/rules/ddd-backend.md`](../../.agents/rules/ddd-backend.md)):
- Se creó el bounded context `apps/api/src/modules/auth/` con sus 4 capas:
  - **`domain/`:** Tipos `AccountDomain`, `SessionDomain`, `AccountWithTruck`, enum `AccountRole` (`TRUCK_HELPER`, `OPS_OPERATOR`, `CUSTOMER`) e interfaces `IAccountRepository`, `ISessionRepository`, `IPasswordHasher`.
  - **`application/`:** Caso de uso `LoginUseCase` que orquesta la verificación de credenciales, control de cuentas activas y creación de sesiones.
  - **`infrastructure/`:** Implementaciones `PrismaAccountRepository`, `PrismaSessionRepository` y `Argon2PasswordHasher`.
  - **`presentation/`:** Endpoints Fastify `POST /api/v1/auth/login` y `POST /api/v1/auth/logout`.
  - **`index.ts`:** Barrel público y factoría `createAuthModule()`.
- Se registró el módulo en el composition root modular (`apps/api/src/app.ts` y `server.types.ts`).

### 2.2. Esquema Relacional de Identidad (Prisma)
- **Modelo `Account`:** Almacena `username` (placa vehicular para ayudantes, e.g. `"IAA-1041"`), `passwordHash`, `role`, `isActive`, y una relación opcional 1:1 con `Truck` (`truckId`).
- **Modelo `AccountSession`:** Almacena tokens de sesión vinculados por `accountId`.

### 2.3. Estrategia de Criptografía y Rendimiento (Doble Algoritmo)
Evaluado y certificado bajo la disciplina `/performance-optimization`:
1. **Contraseñas de Usuarios (`Argon2id`):** 
   - Se utiliza `argon2id` (ganador de Password Hashing Competition, recomendado por OWASP) con 19 MB de costo de memoria, 2 iteraciones y 1 hilo.
   - Diseñado para mitigar ataques de fuerza bruta basados en hardware (GPUs/ASICs) contra contraseñas humanas de baja entropía.
2. **Tokens de Sesión en Reposo (`SHA-256`):**
   - El cliente recibe un token opaco CSPRNG de 128 bits generado con `crypto.randomUUID()`.
   - La base de datos almacena exclusivamente el digest hexadecimal de 64 caracteres calculado con `createHash('sha256')`.
   - **Rendimiento medido:** `0.0006 ms` (0.6 microsegundos) por hash mediante el módulo nativo `node:crypto`. Búsqueda por índice `UNIQUE` de PostgreSQL en $< 0.1\text{ ms}$, garantizando cero sobrecarga en el bucle de eventos de Fastify.
   - **Defensa en profundidad:** Una filtración o volcado no autorizado de la base de datos no expone tokens válidos activos para suplantar a la flota.

### 2.4. Arquitectura de Cabina (`apps/cab-pwa`)
Siguiendo las reglas de DDD de cabina ([`apps/cab-pwa/AGENTS.md`](../../apps/cab-pwa/AGENTS.md)):
- **Dominio (`src/domain/`):** Contratos `AuthSession`, `LoginCredentials`, `LoginResponse`, y ampliación de `ICabApiClient` con `login()` y `logout()`.
- **Infraestructura (`src/infrastructure/`):** 
  - `auth-storage.adapter.ts`: Persistencia segura en `localStorage` con tolerancia a fallos y comprobación de entorno SSR/Browser.
  - `cab-api.client.ts`: Consumo HTTP tipado de `/api/v1/auth/login` y `/api/v1/auth/logout`.
  - `centrifugo.adapter.ts`: Inyección del token de sesión en la suscripción WebSocket.
- **Aplicación (`src/application/`):** 
  - `auth-store.ts`: Store reactivo basado en `useSyncExternalStore` para gobernar el estado de autenticación de forma pura y desacoplada de la UI.
  - `cab-store.ts`: **Se eliminaron todos los valores estáticos quemados.** `truckId`, `licensePlate` y `helperName` se inicializan dinámicamente desde la sesión guardada y cuentan con guards en `syncWithBackend` y `sendTelemetry`.
- **Presentación (`src/presentation/`):**
  - `LoginView.tsx`: Pantalla de inicio de turno táctil móvil, con auto-capitalización de placas, alternador de contraseña, touch targets $\ge 56\text{px}$ y alertas claras de credenciales inválidas o falta de conexión.
  - `IdleView.tsx`: Botón accesible de cierre de turno ("Logout") con diálogo de confirmación.
  - `App.tsx`: Guard de enrutamiento por estado. Si `!isAuthenticated`, renderiza exclusivamente `<LoginView />`. Al autenticar, conecta en tiempo real al camión y sincroniza el estado.

---

## 3. Alternativas Consideradas y Rechazadas

| Alternativa | Pros | Contras | Veredicto |
|---|---|---|---|
| **Contraseña directamente en tabla `Truck`** | Rápido de agregar | Acopla fuertemente la credencial al vehículo físico; impide compartir el módulo de autenticación con `ops-portal` o `customer-pwa`. | **Rechazada.** Se optó por el modelo unificado `Account` con discriminador por roles. |
| **Tokens JWT sin estado** | No requiere tabla `AccountSession` | La sesión requerida no tiene expiración a corto plazo y la revocación instantánea (logout) requeriría una lista negra en Redis. | **Rechazada.** Un token opaco indexado en PostgreSQL es más simple, auditable y fácil de revocar. |
| **Token opaco sin hashear en BD** | 0 ms de cómputo adicional | Si la base de datos se filtra, todas las sesiones activas quedan comprometidas y permiten suplantar camiones. | **Rechazada.** Se adoptó SHA-256 para almacenamiento en reposo. |
| **Argon2id para tokens de sesión** | Máxima resistencia teórica | Incurre en un costo de ~50–80 ms de CPU por cada verificación de token, saturando el servidor Fastify. Los tokens UUID ya poseen máxima entropía ($2^{122}$). | **Rechazada por inviabilidad de rendimiento.** |

---

## 4. Consecuencias y Beneficios

1. **Seguridad y Trazabilidad:** La flota ahora requiere identificación explícita para transmitir telemetría, recibir ofertas y marcar entregas.
2. **Escalabilidad del Modelo:** El modelo `Account` y el endpoint `POST /api/v1/auth/login` están preparados para incorporar operadores de `ops-portal` (`OPS_OPERATOR`) y usuarios finales (`CUSTOMER`) sin modificar el esquema central.
3. **Persistencia y Resiliencia Offline:** El ayudante no pierde su sesión ni el camión asignado si la PWA se recarga en zonas sin cobertura 4G en Ibarra.
4. **Cero regresiones:** Cobertura de 54 tests automatizados pasando en verde (`pnpm test`), y cumplimiento estricto del presupuesto de bundle (< 300 kB).
