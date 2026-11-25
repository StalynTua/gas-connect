# Backlog de Producto — GasConnect Ibarra

Este documento registra los requerimientos, funcionalidades y mejoras pendientes para ser priorizadas y planificadas en sprints futuros. Cuando se pregunte *"¿qué hay pendiente de desarrollar?"* o *"¿qué sigue en el backlog?"*, este archivo y la sección de Backlog en `tasks/todo.md` son la fuente oficial de verdad.

---

## 📌 Epics & Features Pendientes

### 1. Autenticación y Control de Acceso en Ops Portal (`ops-auth`)
* **Contexto:** Actualmente `cab-pwa` cuenta con inicio de sesión seguro para ayudantes. `ops-portal` aún se encuentra abierto y requiere restringir el acceso a operadores y despachadores autorizados de bodega.
* **Historias de Usuario / Tareas:**
  - [ ] **Creación de Cuentas de Operador (`OPS_OPERATOR`):** Script o endpoint para registrar usuarios de oficina/despacho con email y contraseña hasheada con Argon2id.
  - [ ] **Pantalla de Login en `ops-portal`:** Vista de acceso en React con validación de credenciales contra `POST /api/v1/auth/login`.
  - [ ] **Guard de Protección de Rutas en `ops-portal`:** Bloquear la visualización del mapa de flota en vivo (`LiveFleetMap`), tarjetas de métricas (`MetricsCards`) y eventos si no existe una sesión autenticada.
  - [ ] **Manejo de Sesión y Logout:** Almacenamiento seguro del token de operador y botón de cierre de sesión en la barra de navegación superior.
  - [ ] **Indicador de Camiones Fuera de Servicio (`OFF_DUTY`):** Visualizar en `LiveFleetMap` y en la lista de camiones a las unidades en estado `OFF_DUTY` con su última ubicación reportada y un indicador visual distintivo (gris o ícono de fuera de turno) sin ocultarlos completamente de la vista operativa.


---

### 2. Gestión y Restablecimiento de Credenciales de Camiones desde Ops Portal
* **Contexto:** Se acordó que la bodega/despacho asigna las contraseñas de los camiones de forma definitiva y las entrega al ayudante. Se requiere la interfaz operativa para que el despachador las administre sin tocar la base de datos.
* **Historias de Usuario / Tareas:**
  - [ ] **Endpoint Administrativo de Credenciales:** `POST /api/v1/fleet/trucks/:id/password` (protegido con rol `OPS_OPERATOR`) para actualizar la clave de un camión con hashing Argon2id.
  - [ ] **Modal de Asignación / Reset en `ops-portal`:** Botón dentro de la lista o detalle de cada camión ("Cambiar Contraseña" / "Asignar Clave") para ingresar una nueva contraseña.
  - [ ] **Compartición Rápida de Credenciales:** Botón de un clic para copiar o enviar por WhatsApp (`Evolution API`) las credenciales formateadas al número del ayudante (`helperPhone`).
  - [ ] **Revocación de Sesiones Anteriores:** Al cambiar la clave de un camión, invalidar automáticamente los tokens activos en `account_sessions` para forzar a que cualquier dispositivo anterior vuelva a autenticarse.

---

### 3. Autenticación e Identidad para PWA Ciudadana (`customer-pwa`)
* **Contexto:** El módulo `auth` en backend fue diseñado con el rol `CUSTOMER` para compartir la infraestructura de autenticación cuando se lance la app de pedidos para el cliente final.
* **Historias de Usuario / Tareas:**
  - [ ] Registro/Login de clientes por número telefónico verificado (OTP vía WhatsApp).
  - [ ] Vinculación de direcciones frecuentes y pedidos históricos a la cuenta del cliente.

---

### 4. Auditoría y Seguridad Avanzada de Sesiones (Rate Limiting y Bloqueo en Backend)
* **Contexto:** Actualmente `cab-pwa` cuenta con interfaz para mostrar advertencias de intentos restantes y bloqueo temporal (`HTTP 423 Locked`), pero el backend responde únicamente 401 sin estado persistente. Se requiere protección robusta contra ataques de fuerza bruta en cabinas y terminales de reparto.
* **Historias de Usuario / Tareas:**
  - [ ] **Control de Intentos Fallidos en Memoria/Redis/BD:** Registrar contador de fallos por `licensePlate` e IP (máximo 3 intentos permitidos en ventana de 10 minutos).
  - [ ] **Bloqueo Temporal de Cuenta (`HTTP 423`):** Al superar 3 intentos fallidos, responder con código HTTP 423 Locked y payload `{ success: false, error: 'Acceso temporalmente bloqueado', isLocked: true, lockedUntil: ISO8601, attemptsRemaining: 0 }`.
  - [ ] **Encabezados de Rate Limiting:** Enviar encabezados estándar `Retry-After` y `X-RateLimit-*` en `POST /api/v1/auth/login`.
  - [ ] **Auditoría de Seguridad en BD:** Registrar tabla `auth_audit_logs` con fecha, IP, placa, resultado (éxito/fallo/bloqueo) y motivo.
  - [ ] **Desbloqueo Manual desde Ops Portal:** Botón para que el despachador de planta pueda restablecer los intentos fallidos de una unidad bloqueada previa confirmación por radio o llamada.

---

### 5. Modo Diurno y Nocturno Dinámico en Cabina (`cab-dual-theme`)
* **Contexto:** Los camiones operan en la geografía de Ibarra tanto bajo sol ecuatorial intenso (alto deslumbramiento en parabrisas y pantallas rugerizadas) como en horarios vespertinos y nocturnos (después del atardecer ~18:15). El tema claro antirreflejo es vital para el mediodía, pero deslumbra al chofer en la noche comprometiendo la seguridad vial.
* **Restricciones Técnicas:**
  - **Cero Parpadeo (Zero-Flicker):** Inicialización del tema mediante script síncrono inline en `index.html` antes de la hidratación de React, leyendo la preferencia de `localStorage` o `prefers-color-scheme`.
  - **Inmunidad en Telemetría y Centrifugo:** El cambio de tema no debe desmontar el árbol de componentes ni alterar los temporizadores de envío de posición GPS (15s) ni la conexión WebSocket con Centrifugo.
  - **Presupuesto de Bundle:** No agregar librerías pesadas (`next-themes` o similares). Utilizar variables CSS nativas mapeadas en Tailwind (`class="dark"`). El bundle de producción debe permanecer bajo 300 kB.
  - **Accesibilidad y Rigor Óptico:** Cumplimiento de WCAG AAA en métricas críticas (cilindros restantes, cuenta regresiva de 45s) en ambos modos (fondos `#F4F7FA` en día vs `#0F172A`/`#102D43` en noche).
* **Criterios de Aceptación:**
  - [ ] Detección automática inicial basada en `prefers-color-scheme` o cálculo de hora local de Ibarra.
  - [ ] Switch manual accesible desde el menú principal de cabina con área táctil mínima de 56x56 px.
  - [ ] Persistencia de la preferencia del ayudante en almacenamiento local.
  - [ ] Paleta semántica conmutada transparentemente vía variables CSS sin clases condicionales redundantes en componentes.

---

### 6. Configuración y Marca Comercial Centralizada (`brand-identity`)
* **Contexto:** Durante el despliegue piloto el sistema opera bajo la denominación técnica `"GasConnect Cabina Ibarra"`, mientras que las maquetas y el sistema de diseño visual de Stitch proyectan la marca comercial `"GasDirecto"`. Se requiere un mecanismo desacoplado para migrar la identidad comercial en un solo paso cuando la gerencia emita la resolución definitiva.
* **Criterios de Aceptación:**
  - [ ] Punto único de configuración en frontend y backend para denominación comercial, subtítulos operativos y canales de soporte.
  - [ ] Actualización automatizada de `manifest.webmanifest`, `<title>`, splash screen de PWA e íconos.
  - [ ] Plantillas de mensajes WhatsApp en Evolution API gobernadas por la variable de marca central.
