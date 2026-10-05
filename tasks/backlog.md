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

### 4. Auditoría y Seguridad Avanzada de Sesiones
* **Historias de Usuario / Tareas:**
  - [ ] Registro de logs de auditoría en base de datos para inicios de sesión fallidos y bloqueos por intentos reiterados (Rate Limiting).
  - [ ] Vista en `ops-portal` de sesiones activas en cabinas con opción de desconexión remota ("Cerrar turno de forma remota").
