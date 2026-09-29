# Plan de Implementación: Sistema ERP y Gestión (Supabase) para Ikigai Diseño

El objetivo es transformar la plataforma de Ikigai Diseño en un ecosistema robusto, escalable y centralizado. Esto permitirá manejar la web dinámica, la logística productiva, los materiales, las finanzas y los pagos en un solo lugar.

> [!WARNING]
> ## User Review Required
> **Entorno de Desarrollo local:** Este es un sistema complejo (un ERP). Anteriormente, el entorno de línea de comandos de tu computador (Node.js / PowerShell) estaba arrojando errores, lo que nos llevó a construir la web con Vanilla JS. Para este panel de administración, la mejor práctica es utilizar frameworks robustos. Si el terminal sigue sin funcionar, podemos construir el panel usando Vanilla JS interactuando directamente con la API de Supabase, o puedes considerar reinstalar Node.js en tu equipo. ¿Deseas que lo construyamos 100% en Vanilla JS como la página web actual para saltarnos ese problema?

> [!IMPORTANT]
> ## Open Questions
> 1. **Analíticas Web:** ¿Deseas que implementemos herramientas estándar y potentes (como Google Analytics o PostHog) conectadas a tu web, o prefieres que construyamos nuestro propio sistema de recolección de clics almacenado directamente en Supabase?
> 2. **Cuentas de Servicios:** Para automatizar pagos y archivos (Transbank, Google Drive), necesitaremos credenciales de esas plataformas. ¿Tienes ya acceso al portal de desarrolladores de Transbank y tu cuenta de Google Cloud?
> 3. **Prioridad de Fases:** Dada la magnitud de este ERP, sugiero comenzar por el Módulo 1 (Productos) y Módulo 2 (Pedidos). ¿Estás de acuerdo con este orden?

---

## Propuesta de Arquitectura (Supabase & Panel Admin)

El sistema se dividirá en la **Página Web Pública** (que consumirá los datos) y un **Panel de Administración Privado** protegido por contraseñas y roles (dueño, proveedor, taller).

### 1. Base de Datos (Supabase PostgreSQL Schema)
Proponemos crear el siguiente ecosistema de tablas relacionales:
*   `Productos` y `Lineas`: Centraliza nombre, precios, medidas, imágenes y stock base.
*   `Pedidos`: Almacena cliente, fecha de entrada, estado productivo y monto total.
*   `Materiales_Inventario`: Stock disponible de roble, pino, eslingas, barniz, etc.
*   `Receta_Mueble` (Bill of Materials): Define exactamente cuánto material consume cada producto (ej. Mesa ZEN = 3m2 pino, 100ml barniz).
*   `Finanzas`: Flujo de caja, ingresos por pagos, egresos logísticos y mermas.

### 2. Módulo de Gestión de Pedidos y Producción (Kanban)
Se construirá un "Tablero Kanban" en tu panel de control, donde cada pedido será una tarjeta que podrás arrastrar por 5 columnas:
*   a) Recibido
*   b) Materiales
*   c) CNC / Dimensionado
*   d) Taller / Ensamblaje
*   e) Despacho
**Lógica de Automatización de Tiempos:**
Al ingresar un pedido, la base de datos calculará las fechas de entrega con tu fórmula algorítmica:
*   *Plazos fijos:* Tiempos de gestión de materiales (b), CNC (c) y logística (e).
*   *Plazos variables:* Tiempo de mano de obra (d) basándose en una variable global `A`. Si es Línea ZEN será `A * 1`, CNC `A * 0.5`, y Contemporáneo `A * 1.2`. Además, se implementará lógica para "apilar" pedidos y detectar cuellos de botella.

### 3. Módulo de Inventario Inteligente (Triggers de Supabase)
Al cambiar una orden al estado "b) Gestión de materiales", un *Trigger* automático de la base de datos restará las proporciones definidas en la tabla `Receta_Mueble` al stock real de `Materiales_Inventario`. El sistema calculará el delta y te generará una lista de "Materiales necesarios a comprar".

### 4. Módulo de Finanzas e Integración de Pagos
*   **Edge Functions (Supabase):** Crearemos pequeñas funciones seguras alojadas en Supabase que se comuniquen con la API de Transbank (Webpay Plus). 
*   Cuando un cliente compre en la web, la función generará el cobro, Transbank aprobará, y Supabase guardará automáticamente el pedido.
*   **Google Drive:** Otra función escuchará cuando el pedido se pague para subir el comprobante/boleta directamente a tu Drive usando la API de Google.
*   **Dashboard Financiero:** Una pestaña en el panel con gráficos (Chart.js) mostrando utilidades, descontando costos fijos y calculando la rentabilidad real.

### 5. Actualización del Frontend Actual (`app.js`)
*   Se eliminará el catálogo en código duro (`data.js`).
*   Se implementará el cliente de Supabase (`@supabase/supabase-js`) para hacer un `fetch` en tiempo real de los productos, precios y disponibilidad. Los cambios que hagas en el panel se reflejarán instantáneamente en la web.

---

## Verification Plan
Para manejar el riesgo y asegurar la funcionalidad, este ERP se debe desarrollar y verificar por etapas:

1.  **Fase 1 - Core Backend:** Instanciar Supabase, crear las tablas de Productos y modificar la web actual para que consuma datos desde ahí.
2.  **Fase 2 - Panel Kanban y Calendario:** Desarrollar el panel de administración privado (`admin.html`), implementar el sistema de estados productivos y el algoritmo de cálculo de fechas (A, A/2, etc).
3.  **Fase 3 - Motor de Inventario:** Configurar los descuentos automáticos de stock (Triggers) y el creador de listas de compras.
4.  **Fase 4 - Pasarela y Facturación:** Conectar Webpay Plus en modo de pruebas (integración) y la subida de documentos a Google Drive. Revisar pagos por transferencia.
5.  **Fase 5 - Analíticas:** Integrar panel de métricas de negocio, flujo de caja global y tráfico de la web.
