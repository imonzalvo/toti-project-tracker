# PRD — WebApp Tracking de Proyectos · UX / UI

**Owner:** Antonella Piana
**Status:** Draft
**Audience:** Desarrollo / Producto
**Tipo:** UX / UI Specification
**Framework UI:** shadcn/ui

---

## 1. Objetivo de la UX

Proveer una interfaz clara, simple y auditable que permita:

* Tener una visión rápida del estado general de proyectos y facturación
* Identificar fácilmente facturas pendientes de cobro
* Acceder al detalle de cada proyecto sin fricción
* Visualizar y validar el cálculo de cobros personales trimestrales

La UX debe priorizar:

* Claridad sobre densidad de información
* Transparencia en los cálculos
* Navegación directa y predecible

---

## 2. Vista principal — Dashboard

**Tipo:** Dashboard de resumen

### 2.1 KPIs / Cards

Cards informativas (shadcn `Card`) **filtradas por cuenta seleccionada**:

* Total de proyectos
* Proyectos activos
* Total facturado
* Total cobrado
* Facturación pendiente

Los montos se muestran en la moneda de la cuenta seleccionada (USD o UYU).

*(Opcional / futura mejora)*

* Estimación de cobro trimestral actual

---

### 2.2 Listados resumidos

#### Facturas pendientes de cobro

* Tabla o lista corta
* Ordenadas por fecha de facturación
* Acceso directo al proyecto y a la factura

#### Últimas facturas cobradas

* Mostrar facturas recientemente cobradas
* Fecha de cobro visible

---

## 3. Vista de Proyectos

**Formato:** Tabla principal (`Table` de shadcn)

### 3.1 Filtros y Paginación

Barra de filtros ubicada sobre la tabla con tres controles (filtrado server-side):

* **Buscador por nombre:** Input de texto con ícono de búsqueda. Filtrado server-side con debounce de 300ms, case insensitive.
* **Buscador por identificador:** Input de texto con ícono de búsqueda y tipografía monospace. Filtrado server-side con debounce de 300ms, case insensitive.
* **Filtro por estado:** Select con opciones:
  * Todos los estados (default)
  * No comenzó
  * En progreso
  * Finalizado

Elementos adicionales:
* **Botón "Limpiar":** Visible solo cuando hay filtros activos. Resetea todos los filtros.
* **Contador de resultados:** Texto "Mostrando X de Y proyectos" debajo de los filtros.
* **Indicador de carga:** Spinner visible en el header durante la carga de datos.

### 3.1.1 Paginación

Controles de paginación ubicados debajo de la tabla:
* **Indicador de página:** "Página X de Y" a la izquierda
* **Botones de navegación:** Primera página, anterior, siguiente, última página
* **Tamaño de página:** 10 proyectos por página (fijo)
* Los controles solo se muestran cuando hay más de una página

### 3.2 Columnas sugeridas

* Identificador
* Nombre del proyecto
* Estado operativo
* % facturado
* % cobrado
* Monto total del presupuesto
* Acciones (ver detalle)

### 3.3 Interacciones

* Click en fila o botón "Ver" abre la **Vista de Proyecto**
* Orden por defecto del listado: fecha de aprobación (más reciente primero); a igual fecha, por identificador numérico descendente

### 3.4 Estados vacíos

* **Sin proyectos:** Mensaje "Sin proyectos" + "Crea tu primer proyecto para comenzar"
* **Sin resultados (filtros):** Mensaje "Sin resultados" + "No se encontraron proyectos con los filtros aplicados" + botón "Limpiar filtros"

---

## 4. Vista de Proyecto (detalle)

Vista dedicada a un proyecto específico.

### 4.1 Header del proyecto

Información visible en bloque superior:

* Identificador + nombre
* Estado operativo (badge)
* Presupuesto total
* Porcentaje de comisión vigente

---

### 4.2 Facturación del proyecto

**Formato:** Tabla

Columnas:

* Tipo de facturación:

  * Aprobación
  * Entrega parcial
  * Entrega total
* Porcentaje del presupuesto
* Monto calculado
* Fecha de facturación
* Estado (Emitida / Cobrada)
* Fecha de cobro (si aplica)

---

### 4.3 Acciones disponibles

* Agregar facturación (Dialog / Sheet)
* Marcar facturación como cobrada
* Visualizar totales:

  * Total facturado
  * Total cobrado

---

## 5. Vista de Facturaciones (global)

Vista transversal a todos los proyectos con paginación server-side.

### 5.1 Formato

Tabla global de facturas paginada (10 facturaciones por página)

### 5.2 Filtros

Filtros server-side:
* Proyecto (selector con todos los proyectos de la cuenta)
* Estado (Emitida / Cobrada)
* Rango de fechas de emisión:
  * **Desde:** Input de fecha para filtrar facturaciones emitidas desde esa fecha
  * **Hasta:** Input de fecha para filtrar facturaciones emitidas hasta esa fecha (inclusive)

### 5.2.1 Paginación

Controles de paginación ubicados debajo de la tabla:
* **Indicador de página:** "Página X de Y" a la izquierda
* **Botones de navegación:** Primera página, anterior, siguiente, última página
* **Tamaño de página:** 10 facturaciones por página (fijo)
* Los controles solo se muestran cuando hay más de una página
* Los totales (Total Filtrado, Cobrado, Pendiente) se calculan sobre todas las facturaciones filtradas, no solo la página actual

### 5.3 Columnas

* Proyecto
  * Identificador + nombre
  * Monto total del presupuesto del proyecto (para dar contexto a cada factura)
* Tipo de facturación
* % del presupuesto
* Monto
* Fecha de facturación
* Estado
* Fecha de cobro

### 5.4 Diferenciación visual

* Facturas cobradas claramente diferenciadas
* Facturas pendientes resaltadas visualmente

### 5.5 Acciones

* **Marcar como cobrada:** Botón disponible en cada fila para facturas con estado "Emitida". Permite marcar la factura como cobrada con la fecha actual.
* **Ver proyecto:** Enlace directo al detalle del proyecto asociado.

---

## 6. Vista de Cobros Trimestrales

**Caso de uso principal del sistema**

### 6.1 Selección de periodo

* Selector de trimestre (Ene–Mar, Abr–Jun, etc.)

---

### 6.2 Contenido

* Facturas cobradas dentro del periodo
* Agrupadas por proyecto

Para cada proyecto:

* Total cobrado por la empresa
* % de comisión vigente
* Monto a cobrar por Antonella

---

### 6.3 Totales

* Total a cobrar por proyecto
* Total general del periodo

---

## 7. Navegación

Navegación principal simple:

* Dashboard
* Proyectos
* Facturaciones
* Cobros trimestrales

### 7.1 Selector de Cuenta

Ubicado en el sidebar, debajo del logo/header:

* Selector dropdown con opciones: **USD (Dólares)** y **UYU (Pesos)**
* Al cambiar de cuenta, toda la aplicación muestra solo proyectos y facturas de esa moneda
* La selección se persiste en localStorage para mantener preferencia entre sesiones
* Al crear un proyecto, hereda automáticamente la moneda de la cuenta seleccionada

Flujos directos:

* Dashboard → Proyecto
* Proyecto → Factura
* Cobro trimestral → Proyecto / Factura

### 7.2 Navegación Mobile

En dispositivos móviles (< 768px), la navegación se adapta:

#### Header Mobile
* Header fijo en la parte superior con:
  * Logo "PT" y título de la página actual
  * Botón hamburguesa que abre un drawer lateral
* El drawer contiene:
  * Selector de cuenta
  * Navegación completa (incluyendo Usuarios para admins)
  * Información del usuario y botón de logout

#### Bottom Navigation
* Barra de navegación fija en la parte inferior
* 4 items principales: Inicio, Proyectos, Facturas, Cobros
* Íconos con texto corto debajo
* Indicador visual del item activo
* Safe area para iPhones con notch

---

## 8. Principios de UI

* Uso consistente de componentes shadcn
* Tablas claras y legibles
* Estados visibles con badges
* Cálculos siempre visibles o fácilmente accesibles
* Evitar sobrecarga visual

### 8.1 Diseño Responsive (Mobile-First)

La aplicación es completamente funcional en dispositivos móviles. Principios aplicados:

#### Adaptaciones Desktop → Mobile

| Componente | Desktop | Mobile |
|------------|---------|--------|
| Navegación | Sidebar fija 256px | Header + Bottom nav + Drawer |
| Tablas | Tabla completa con todas las columnas | Cards con información esencial |
| Stats Cards | Grid 5 columnas | Grid 2 columnas, texto reducido |
| Filtros | Inline en una fila | Stack vertical, algunos ocultos |
| Acciones | Botones inline en tabla | Botones en sección separada del card |
| Headers | Texto grande (3xl) | Texto medio (2xl) |

#### Información Priorizada en Mobile

En mobile se muestra la información más relevante, ocultando detalles secundarios:

* **Proyectos:** Identificador, nombre, estado, presupuesto, % facturado/cobrado
* **Facturaciones:** Proyecto, monto, estado, tipo, fecha (fecha de cobro en detalle)
* **Cobros:** Total cobrado, comisión (detalle expandible)
* **Dashboard Stats:** Solo el valor principal, descripción oculta

#### Breakpoints

* **Mobile:** < 768px (md)
* **Desktop:** ≥ 768px

---

## 9. Permisos de Usuario y Estados de UI

### 9.1 Usuarios Administrador (ADMIN)

Los usuarios con rol ADMIN tienen acceso completo a todas las funcionalidades:
* Crear, editar y eliminar proyectos
* Crear, editar y eliminar facturaciones
* Marcar facturas como cobradas/pendientes
* Cambiar estados de proyectos
* Gestionar usuarios

### 9.2 Usuarios Invitado (GUEST)

Los usuarios con rol GUEST tienen acceso de solo lectura. Los botones de acción aparecen **deshabilitados (grises)** con tooltips indicando "Solo administradores":

* Botón "Nuevo Proyecto" → Deshabilitado
* Botón "Nueva Facturación" → Deshabilitado
* Botones de cobrar/revertir facturaciones → Deshabilitados
* Botones de editar/eliminar facturaciones → Deshabilitados
* Menú de opciones de proyecto (cambiar estado, eliminar) → Deshabilitado
* Gestión de usuarios → No visible (sección completa oculta)

Los usuarios GUEST pueden:
* Navegar por todas las vistas
* Ver dashboard, proyectos, facturaciones y cobros trimestrales
* Filtrar y buscar información
* Cambiar entre cuentas USD/UYU

---

## 10. Fuera de alcance (UX)

* Personalización visual avanzada
* Exportaciones (CSV / PDF)
* Notificaciones automáticas
