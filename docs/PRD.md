# PRD — WebApp de Tracking de Proyectos y Cobros

**Owner:** Antonella Piana  
**Status:** Draft  
**Audience:** Desarrollo / Producto  
**Tipo de producto:** WebApp interna (uso personal)

---

## 1. Objetivo del producto

Reemplazar la planilla actual de tracking de proyectos por una webapp que permita:

- Registrar proyectos con presupuestos aprobados
- Gestionar facturaciones asociadas a cada proyecto
- Registrar cobros efectivos de facturas
- Calcular automáticamente los montos que debe cobrar Antonella Piana en cada periodo trimestral
- Visualizar el detalle de cobros por proyecto y por factura

El sistema debe reflejar fielmente el modelo de negocio actual, sin complejidad innecesaria.

---

## 2. Alcance

### Incluye
- Gestión de proyectos
- Gestión de facturación
- Registro de cobros
- Cálculo de cobros trimestrales personales
- Visualización clara y auditada de montos
- **Sistema de cuentas por moneda (UYU y USD)**

### No incluye
- Integraciones bancarias o contables
- Emisión real de facturas
- Gestión de impuestos (IVA, retenciones, etc.)
- Pagos parciales

---

## 3. Definiciones clave

- **Proyecto:** Trabajo aprobado con un presupuesto único.
- **Facturación:** Hito de cobro de la empresa (aprobación, entrega parcial o total).
- **Cobro:** Pago efectivo recibido por la empresa por una factura.
- **Periodo de cobro:** Trimestre calendario (Ene–Mar, Abr–Jun, Jul–Sep, Oct–Dic).
- **Comisión:** Porcentaje del monto cobrado que corresponde a Antonella Piana.
- **Cuenta:** Agrupación de proyectos por moneda (UYU o USD). Cada cuenta tiene sus propios proyectos y facturas.
- **Usuario Admin:** Usuario con permisos completos para gestionar recursos y usuarios.
- **Usuario Guest:** Usuario con acceso de solo lectura.

---

## 4. Usuarios

El sistema soporta múltiples usuarios con dos niveles de acceso:

### 4.1 Roles de Usuario

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| ADMIN | Administrador del sistema | Crear, modificar y eliminar proyectos/facturaciones. Crear y eliminar usuarios. |
| GUEST | Usuario de solo lectura | Ver proyectos, facturaciones y reportes. Sin permisos de modificación. |

### 4.2 Flujo de Registro

1. **Setup Inicial:** La primera vez que se accede al sistema (sin usuarios), se muestra un formulario para crear el primer usuario administrador.
2. **Creación de Usuarios:** Solo los administradores pueden crear nuevos usuarios desde la sección "Usuarios".
3. **Autenticación:** Los usuarios acceden mediante email y contraseña.

### 4.3 Gestión de Sesiones

- Las sesiones se mantienen mediante cookies seguras (HTTP-only, SameSite).
- Duración de sesión: 7 días.
- Cierre de sesión disponible desde el sidebar.

---

## 5. Reglas de negocio

1. Cada proyecto tiene **un único presupuesto aprobado**.
2. Un proyecto puede tener **múltiples facturaciones**.
3. Cada facturación:
   - Pertenece a un solo proyecto
   - Tiene un porcentaje del presupuesto total
   - Se cobra en un solo pago
4. La suma de porcentajes facturados de un proyecto **no puede superar el 100%**.
5. La fecha de cobro puede diferir de la fecha de facturación.
6. El cobro personal se calcula según:
   - Facturas cobradas dentro del trimestre
   - Porcentaje de comisión vigente del proyecto
7. El estado operativo del proyecto **no afecta la facturación**.
8. No existen cobros parciales.
9. **Cada proyecto pertenece a una única moneda (UYU o USD)**.
10. **Los proyectos y facturas se filtran según la cuenta (moneda) seleccionada**.
11. **Al crear un proyecto, hereda la moneda de la cuenta actualmente seleccionada**.

### 5.1 Reglas de tipos de facturación

9. **Orden de facturaciones:**
   - La **primera facturación** de un proyecto SIEMPRE es de tipo **Aprobación**
   - Luego pueden crearse **Entregas Parciales** o una **Entrega Total**
   - La **Entrega Total** SIEMPRE es la última facturación del proyecto

10. **Restricciones por tipo:**
    - **Aprobación:** Solo puede existir UNA por proyecto. No se puede eliminar, solo editar su porcentaje.
    - **Entrega Parcial:** Pueden existir múltiples. El usuario define el porcentaje.
    - **Entrega Total:** Solo puede existir UNA por proyecto. Su porcentaje es automáticamente el saldo restante del presupuesto.

11. **Bloqueo de facturaciones:**
    - Una vez creada una **Entrega Total**, no se pueden crear más facturaciones para ese proyecto.

12. **Autenticación requerida:** Todos los usuarios deben autenticarse para acceder al sistema.
13. **Permisos por rol:** Solo usuarios ADMIN pueden crear, modificar o eliminar recursos.

---

## 6. Modelo de dominio

### 6.1 Proyecto

| Campo | Tipo | Descripción |
|-----|-----|-------------|
| id | UUID | Identificador interno |
| identificador | String | Identificador definido por el usuario |
| nombre | String | Nombre del proyecto |
| monto_total | Decimal | Presupuesto aprobado |
| comision_pct | Decimal | Porcentaje de comisión (hasta 3 decimales) |
| estado | Enum | No comenzó / Comenzó / Finalizó |
| moneda | Enum | UYU / USD |
| created_at | Date | Fecha de creación |

---

### 6.2 Usuario

| Campo | Tipo | Descripción |
|-----|-----|-------------|
| id | UUID | Identificador interno |
| email | String | Email único del usuario |
| password | String | Contraseña hasheada (bcrypt) |
| name | String | Nombre del usuario |
| role | Enum | ADMIN / GUEST |
| created_at | Date | Fecha de creación |

---

### 6.3 Facturación

| Campo | Tipo | Descripción |
|-----|-----|-------------|
| id | UUID | Identificador |
| proyecto_id | UUID | Proyecto asociado |
| descripcion | String | Aprobación / EP / ET |
| porcentaje | Decimal | % del monto total |
| monto | Decimal | Calculado automáticamente |
| fecha_facturacion | Date | Fecha de emisión |
| estado | Enum | Emitida / Cobrada |
| fecha_cobro | Date | Solo si está cobrada |

---

## 7. Casos de uso

### 7.1 Crear proyecto
- Datos obligatorios:
  - Identificador
  - Nombre
  - Monto total
  - Porcentaje de comisión
- Estado inicial: `No comenzó`

---

### 7.2 Editar proyecto
- Editables:
  - Nombre
  - Porcentaje de comisión
  - Estado operativo
- No editable:
  - Monto total

---

### 7.3 Agregar facturación a proyecto
- Datos obligatorios:
  - Descripción (tipo de facturación)
  - Porcentaje del monto total
  - Fecha de facturación
- Validaciones:
  - Suma de porcentajes ≤ 100%
  - Primera facturación debe ser tipo Aprobación (auto-seleccionada)
  - Solo una facturación de tipo Aprobación permitida
  - Entrega Total: porcentaje auto-calculado con saldo restante
  - No se pueden crear facturaciones si ya existe Entrega Total

### 7.3.1 Editar porcentaje de facturación
- Acción:
  - Modificar el porcentaje de una facturación existente
  - El monto se recalcula automáticamente
- Validaciones:
  - No superar el 100% total
  - Entrega Total siempre debe ser el saldo restante
- Uso principal:
  - Editar porcentaje de facturación de Aprobación (única forma de modificarla)

---

### 7.4 Marcar facturación como cobrada
- Acción:
  - Cambiar estado a `Cobrada`
  - Asignar fecha de cobro
- La fecha de cobro define el periodo de cálculo

---

### 7.4.1 Revertir cobro de facturación
- Precondición:
  - Facturación en estado `Cobrada`
- Acción:
  - Cambiar estado a `Emitida`
  - Eliminar fecha de cobro
- Uso:
  - Corrección de errores en el registro de cobros
  - Devoluciones o pagos rechazados

---

### 7.5 Visualizar proyecto
- Información del proyecto
- Estado operativo
- Presupuesto
- Facturación emitida y cobrada
- Totales facturados y cobrados

---

### 7.6 Visualizar facturación pendiente
- Facturas emitidas no cobradas
- Agrupadas por proyecto

---

### 7.7 Visualizar cobro trimestral (caso principal)
- Selección de periodo (ej: Ene–Mar)
- Mostrar:
  - Facturas cobradas en el periodo
  - Agrupadas por proyecto
  - Monto cobrado por la empresa
  - Comisión por proyecto
- Totales:
  - Total a cobrar por proyecto
  - Total general del periodo

---

## 8. Cálculo de cobro trimestral

Para un periodo dado:

1. Seleccionar facturas con:
   - estado = `Cobrada`
   - fecha_cobro dentro del periodo
2. Agrupar por proyecto
3. Para cada proyecto: monto_cobro = sum(facturas.monto) * comision_pct

4. Calcular total general como suma de todos los proyectos

---

## 9. UX / UI (alto nivel)

### Pantallas mínimas
- **Setup inicial** (crear primer admin)
- **Login** (autenticación)
- Listado de proyectos
- Detalle de proyecto
- Alta de facturación
- Facturación pendiente
- Cobros trimestrales
- **Gestión de usuarios** (solo admin)

### Filtros y paginación de proyectos
El listado de proyectos incluye filtros y paginación server-side:
- **Orden por defecto:** Fecha de aprobación del proyecto descendente (más reciente primero); a igual fecha, por número de identificador descendente
- **Por estado:** Selector con opciones "Todos", "No comenzó", "En progreso", "Finalizado"
- **Por nombre:** Buscador de texto libre con debounce de 300ms (case insensitive)
- **Por identificador:** Buscador de texto libre con debounce de 300ms (case insensitive)
- **Paginación:** 10 proyectos por página, navegación con botones primera/anterior/siguiente/última

Funcionalidades adicionales:
- Botón "Limpiar" para resetear todos los filtros (visible solo cuando hay filtros activos)
- Contador de resultados ("Mostrando X de Y proyectos")
- Indicador de página actual ("Página X de Y")
- Estado vacío diferenciado cuando no hay resultados por filtros vs. sin proyectos
- Indicador de carga durante la búsqueda

### Filtros y paginación de facturaciones (vista global)
La vista global de facturaciones incluye filtros y paginación server-side:
- **Por proyecto:** Selector con todos los proyectos de la cuenta seleccionada
- **Por estado:** Selector con opciones "Todos", "Emitidas (Pendientes)", "Cobradas"
- **Por rango de fechas:** Campos "Desde" y "Hasta" para filtrar por fecha de emisión
- **Paginación:** 10 facturaciones por página

Funcionalidades adicionales:
- Resumen de totales (Total Filtrado, Cobrado, Pendiente) calculado sobre todas las facturaciones filtradas
- Contador de resultados ("Mostrando X de Y facturaciones")
- Indicador de página actual
- Indicador de carga durante la búsqueda

**Nota:** La tabla de facturaciones dentro del detalle de un proyecto NO está paginada (muestra todas las facturaciones del proyecto).

### Principios
- Visualización clara
- Cálculos transparentes
- Navegación simple
- Sin sobrecarga visual

---

## 10. Métricas de éxito

- Eliminación total de la planilla
- Reducción del tiempo de cálculo trimestral a < 1 minuto
- Cero errores manuales en cálculo de cobros
- Confianza total en los números mostrados

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|------|-----------|
| Errores de cálculo | Validaciones y tests automáticos |
| Inconsistencias | Reglas de negocio estrictas |
| Complejidad innecesaria | Scope limitado |

---

## 12. Futuras extensiones (fuera de alcance)

- Exportación a CSV / PDF
- Historial de comisiones
- Reportes anuales
- Integración contable

