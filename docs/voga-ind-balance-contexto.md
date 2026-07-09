# Documento de contexto — voga.ind balance

> **Nota para agentes de IA:** este documento describe el modelo funcional completo de la aplicación *voga.ind balance*. Úsalo como fuente de verdad sobre roles, permisos, reglas de negocio, flujos y estados del sistema antes de tomar decisiones de diseño, modelado de datos o desarrollo.

---

## 1. Nombre de la aplicación

**voga.ind balance**

## 2. Descripción general

**voga.ind balance** es una aplicación destinada a la gestión interna de un emprendimiento de indumentaria. Su objetivo principal es permitir que la Dueña pueda administrar el catálogo de productos, registrar ventas, controlar pagos, calcular comisiones de empleadas, analizar el rendimiento mensual y tomar mejores decisiones de compra.

La aplicación contará con dos tipos de perfiles principales:

* **Dueña**
* **Empleada**

Cada perfil tendrá permisos distintos según su rol dentro del emprendimiento.

La app inicialmente se pensó con manejo local por archivos, pero finalmente se define que funcionará con **backend y base de datos**, permitiendo que la información se actualice de manera centralizada entre la Dueña y las Empleadas.

---

## 3. Objetivo de la aplicación

El objetivo de **voga.ind balance** es facilitar la administración económica y operativa del emprendimiento.

La app debe permitir:

* Cargar productos en un catálogo.
* Registrar ventas.
* Controlar productos disponibles y vendidos.
* Gestionar pagos totales, parciales o fiados.
* Controlar ventas vencidas.
* Gestionar devoluciones.
* Calcular comisiones de empleadas.
* Ver ingresos mensuales.
* Ver dinero cobrado y dinero por cobrar.
* Analizar qué productos, categorías y talles se venden más.
* Calcular ganancia cobrada.
* Administrar empleadas.

---

## 4. Roles de usuario

### 4.1 Dueña

La **Dueña** es el perfil administrador de la aplicación.

Tiene acceso completo a la información del negocio y puede realizar acciones administrativas, comerciales y de control.

**La Dueña puede:**

* Ver el resumen económico mensual.
* Ver total esperado del mes.
* Ver total cobrado.
* Ver total por cobrar.
* Ver las comisiones de cada empleada.
* Crear empleadas.
* Desactivar empleadas.
* Cargar productos en el catálogo.
* Editar productos.
* Ver precio de compra.
* Ver precio de venta.
* Ver productos disponibles.
* Ver productos vendidos.
* Crear ventas propias.
* Ver todas las ventas.
* Ver ventas propias y ventas de empleadas.
* Editar ventas.
* Anular ventas.
* Cargar pagos posteriores.
* Gestionar devoluciones.
* Aplicar aumentos masivos a productos.
* Ver analíticas.
* Ver ganancia cobrada.
* Consultar rendimiento por categoría, subcategoría y talle.

### 4.2 Empleada

La **Empleada** es un perfil operativo. Su función principal es vender productos y consultar su rendimiento personal.

**La Empleada puede:**

* Ver el catálogo.
* Ver productos disponibles.
* Ver productos vendidos.
* Ver precio de venta.
* Crear ventas.
* Editar sus propias ventas.
* Cargar pagos posteriores de sus propias ventas.
* Gestionar devoluciones de sus propias ventas.
* Ver cuánto vendió en el mes.
* Ver cuánto cobró en el mes.
* Ver cuánto ganó de comisión.
* Ver su registro de ventas.

**La Empleada no puede:**

* Cargar productos.
* Editar productos.
* Eliminar productos.
* Ver precio de compra.
* Ver el balance general del negocio.
* Ver ventas de otras empleadas.
* Ver comisiones de otras empleadas.
* Ver ganancia general de la Dueña.
* Crear nuevas empleadas.
* Desactivar empleadas.
* Aplicar aumentos masivos de precios.

---

## 5. Gestión de usuarios

La aplicación tendrá inicio de sesión obligatorio.

La lógica de usuarios será:

* La Dueña tiene una cuenta administradora.
* La Dueña puede crear o invitar empleadas.
* Las empleadas no pueden registrarse solas.
* La Dueña puede desactivar empleadas.
* Una empleada desactivada no debería poder ingresar ni crear nuevas ventas.

A nivel técnico, los roles pueden mapearse como:

| Rol visible | Rol técnico sugerido |
| ----------- | -------------------- |
| Dueña       | owner                |
| Empleada    | seller                |

---

## 6. Secciones principales de la Dueña

La vista de la Dueña tendrá cinco grandes secciones:

1. **Home**
2. **Catálogo**
3. **Ventas**
4. **Analíticas**
5. **Empleadas**

---

## 7. Home de la Dueña

El **Home** será la pantalla principal de resumen. Su objetivo es mostrar rápidamente cómo viene el mes en términos económicos y operativos.

### 7.1 Indicadores principales

| Indicador                      | Descripción                                 |
| ------------------------------- | -------------------------------------------- |
| Ingreso total esperado del mes | Total que se espera cobrar durante el mes   |
| Total cobrado                  | Dinero efectivamente cobrado durante el mes |
| Total por cobrar               | Dinero pendiente de cobro                   |

### 7.2 Total esperado del mes

Se compone de:

* Ventas nuevas del mes.
* Saldos pendientes arrastrados de meses anteriores.

```txt
Total esperado del mes = ventas nuevas del mes + deuda pendiente arrastrada
```

Si una venta no se paga por completo en un mes, el saldo pendiente se agrega al total esperado del mes siguiente.

### 7.3 Total cobrado

Representa el dinero que efectivamente ingresó durante el mes. Incluye:

* Pagos completos.
* Pagos parciales.
* Pagos tardíos de ventas anteriores.

El cobro se registra en el mes en que se recibe el dinero, no necesariamente en el mes en que se creó la venta.

### 7.4 Total por cobrar

Representa la suma de todos los saldos pendientes. Incluye:

* Ventas con pago parcial.
* Ventas fiadas.
* Ventas vencidas que todavía no fueron pagadas.

### 7.5 Tarjetas de empleadas en Home

Debajo del resumen económico, el Home mostrará tarjetas de las empleadas. Cada tarjeta debe mostrar:

* Nombre de la empleada.
* Color representativo de la empleada.
* Total vendido en el mes.
* Total cobrado en el mes.
* Comisión ganada.
* Acceso al detalle de ventas de esa empleada.

La comisión visible en el Home corresponde al 15% de lo efectivamente cobrado por esa empleada.

### 7.6 Agenda y recordatorios dentro del Home

No habrá sección independiente de agenda. Los recordatorios importantes se integrarán dentro del Home. Ejemplos:

* Ventas próximas a vencer.
* Ventas vencidas.
* Ventas todavía dentro del plazo de devolución.
* Pagos pendientes.
* Empleadas con comisiones acumuladas.
* Categorías con alta demanda.
* Productos con mucha salida.

---

## 8. Catálogo

Gestionada principalmente por la Dueña.

### 8.1 Funciones de la Dueña en Catálogo

* Cargar productos.
* Editar productos.
* Ver productos disponibles.
* Ver productos vendidos.
* Ver todos los datos del producto.
* Ver precio de compra.
* Ver precio de venta.
* Aplicar aumentos masivos de precio.
* Identificar visualmente productos vendidos.

### 8.2 Funciones de la Empleada en Catálogo

* Ver el catálogo.
* Ver productos disponibles.
* Ver productos vendidos.
* Ver precio de venta.
* Seleccionar productos disponibles para vender.

La Empleada no puede vender productos que ya estén en estado **Vendido**.

### 8.3 Datos de un producto

| Campo               | Descripción                        |
| -------------------- | ------------------------------------ |
| Nombre              | Nombre del producto                |
| Foto                | Imagen del producto                |
| Talle               | Talle del producto                 |
| Descripción         | Detalle del producto               |
| Categoría principal | Superior, Inferior o Lencería      |
| Subclasificación    | Tipo o característica del producto |
| Precio de compra    | Precio al que lo compró la Dueña   |
| Precio de venta     | Precio al que debe venderse        |
| Estado              | Disponible o Vendido               |

### 8.4 Categorías principales

| Categoría | Descripción                             |
| ---------- | ------------------------------------------ |
| Superior  | Prendas de la parte superior del cuerpo |
| Inferior  | Prendas de la parte inferior del cuerpo |
| Lencería  | Productos de lencería o ropa interior   |

### 8.5 Subclasificaciones

| Categoría | Subclasificaciones                                  |
| ---------- | ------------------------------------------------------ |
| Superior  | Remera, Abrigo                                      |
| Inferior  | Largo, Corto                                        |
| Lencería  | Pendiente de definir o sin subclasificación inicial |

### 8.6 Estado del producto

| Estado     | Significado                              |
| ----------- | ------------------------------------------- |
| Disponible | El producto puede venderse               |
| Vendido    | El producto ya fue incluido en una venta |

Los productos vendidos no desaparecen del catálogo. Se siguen mostrando, pero con un remarcado visual que indique que ya fueron vendidos.

### 8.7 Productos como unidades únicas

Los productos se manejan como unidades únicas, no como stock agrupado.

En vez de cargar:

```txt
Remera blanca talle M
Cantidad: 3
```

Se cargan como productos separados:

```txt
Remera blanca talle M - Producto 001
Remera blanca talle M - Producto 002
Remera blanca talle M - Producto 003
```

Esto permite que cada producto tenga su propio estado: `Disponible / Vendido`.

### 8.8 Aumento masivo de precios

La Dueña puede seleccionar varios productos del catálogo y aplicarles un aumento porcentual definido por ella.

**Fórmula:**

```txt
Nuevo precio de venta = precio actual + (precio actual × porcentaje / 100)
```

Ejemplo:

| Producto      | Precio actual | Aumento | Nuevo precio |
| -------------- | --------------: | -------: | -------------: |
| Remera blanca | $20.000        | 20%     | $24.000        |
| Jean azul     | $40.000        | 20%     | $48.000        |
| Campera negra | $80.000        | 20%     | $96.000        |

**Reglas del aumento masivo:**

* Solo puede hacerlo la Dueña.
* La Empleada no puede modificar precios.
* Solo modifica el precio de venta (no el de compra).
* Debe mostrar una vista previa antes de confirmar.
* Se recomienda aplicarlo solo a productos disponibles, para no alterar ventas históricas.

---

## 9. Ventas

Permite crear ventas y gestionar ventas existentes. La Dueña ve todas las ventas; la Empleada solo las propias.

### 9.1 Crear una venta

```txt
Ver productos disponibles
↓
Seleccionar productos
↓
Agregar productos al carrito
↓
Crear venta
↓
Cargar datos del comprador
↓
Cargar monto entregado
↓
Confirmar venta
↓
Productos pasan a estado Vendido
```

### 9.2 Carrito

Una venta puede tener:

* Un producto o varios.
* Productos de diferentes categorías.
* Productos de diferentes talles.
* Productos con diferentes precios.

### 9.3 Datos solicitados al crear venta

| Campo                           | Descripción                           |
| -------------------------------- | ---------------------------------------- |
| Productos vendidos              | Productos incluidos en la venta       |
| Nombre y apellido del comprador | Identificación del comprador          |
| Teléfono                        | Contacto del comprador                |
| Monto entregado                 | Dinero pagado al momento de la venta  |
| Vendedora                       | Dueña o Empleada que realizó la venta |
| Fecha de venta                  | Fecha en que se creó la venta         |

### 9.4 Estados de pago

| Estado       | Condición                                                      |
| ------------- | ----------------------------------------------------------------- |
| Pagado       | Se cobró el total de la venta                                  |
| Pago parcial | Se cobró una parte, pero todavía queda saldo pendiente         |
| Fiado total  | No se cobró nada                                               |
| Vencido      | Pasaron 30 días desde la venta y todavía queda saldo pendiente |

### 9.5 Plazo de pago

Cada comprador tiene un plazo de **30 días desde la fecha de venta** para terminar de pagar. Si pasados los 30 días todavía existe saldo pendiente, la venta pasa a estado **Vencido**.

Una venta vencida puede pagarse después del plazo. Cuando se paga por completo:

* Deja de estar vencida.
* Pasa a estado Pagado.
* El cobro entra en el mes en que se recibió.
* La comisión de la empleada se calcula en el mes en que se cobró.

### 9.6 Pagos posteriores

| Usuario  | Permiso                                       |
| --------- | ------------------------------------------------ |
| Dueña    | Puede cargar pagos de cualquier venta         |
| Empleada | Puede cargar pagos solo de sus propias ventas |

Ejemplo:

| Fecha | Acción       |   Monto |
| ------ | ------------- | -------: |
| 01/08 | Pago inicial | $20.000 |
| 10/08 | Segundo pago | $15.000 |
| 20/08 | Pago final   | $15.000 |

La app debe actualizar automáticamente: total cobrado, saldo pendiente, estado de pago, comisión de la empleada (si corresponde), total cobrado del mes y total por cobrar.

### 9.7 Ventas de la Dueña

Cuando la Dueña realiza una venta:

* Cuenta para el balance general.
* Suma al total vendido.
* Suma al total cobrado si se paga.
* Suma a la ganancia.
* No genera comisión.

### 9.8 Ventas de empleadas

Cuando una Empleada realiza una venta:

* Queda asociada a esa empleada.
* Suma al total vendido de esa empleada.
* Suma al total cobrado de esa empleada cuando se recibe dinero.
* Genera comisión del 15% sobre lo efectivamente cobrado.
* La comisión se registra en el mes en que se cobró el dinero.

---

## 10. Comisiones

Las empleadas ganan una comisión del **15%**, calculada sobre el monto efectivamente cobrado, no sobre el total vendido.

### 10.1 Fórmula

```txt
Comisión = monto cobrado × 15%
```

### 10.2 Ejemplos

| Total venta | Monto cobrado | Saldo pendiente | Comisión |
| ------------: | --------------: | -----------------: | ---------: |
| $100.000    | $100.000       | $0               | $15.000  |
| $100.000    | $40.000        | $60.000          | $6.000   |
| $100.000    | $0             | $100.000         | $0       |

### 10.3 Comisión por pagos posteriores

Si una venta se cobra en partes, la comisión también se genera en partes.

Ejemplo (venta total $100.000):

| Mes        | Monto cobrado | Comisión |
| ----------- | --------------: | ---------: |
| Agosto     | $40.000        | $6.000   |
| Septiembre | $60.000        | $9.000   |
| Total      | $100.000       | $15.000  |

### 10.4 Ventas de la Dueña

| Vendedora | ¿Genera comisión?        |
| ---------- | --------------------------- |
| Dueña     | No                       |
| Empleada  | Sí, 15% sobre lo cobrado |

---

## 11. Devoluciones

Los compradores tienen un plazo de **1 semana desde la fecha de venta** para devolver uno o más productos. Pasada esa semana, ya no se pueden realizar devoluciones.

### 11.1 Estados de devolución

| Estado                 | Condición                                |
| ------------------------ | ------------------------------------------- |
| En plazo de devolución | La venta tiene menos de una semana       |
| Confirmada             | Pasó una semana y no hubo devolución     |
| Con devolución         | Se devolvió uno o más productos          |
| Anulada                | La venta fue anulada administrativamente |

### 11.2 Quién puede gestionar devoluciones

| Usuario  | Permiso                                                 |
| --------- | ----------------------------------------------------------- |
| Dueña    | Puede gestionar devoluciones de cualquier venta         |
| Empleada | Puede gestionar devoluciones solo de sus propias ventas |

Las devoluciones hechas por empleadas son directas; no requieren aprobación previa de la Dueña.

### 11.3 Qué pasa cuando se devuelve un producto

* El producto vuelve a estado **Disponible**.
* La venta se actualiza y su total puede disminuir.
* El dinero cobrado puede requerir devolución al comprador.
* La comisión de la empleada se recalcula.
* La ganancia cobrada se recalcula.

### 11.4 Devolución total

Si se devuelven todos los productos de una venta, esta puede quedar como "venta con devolución total" o tratarse como venta anulada por devolución (a definir a nivel técnico). En ambos casos:

* Los productos vuelven a Disponible.
* Se descuenta el dinero correspondiente.
* Se descuenta o corrige la comisión.
* La venta no cuenta como venta confirmada para analíticas.

### 11.5 Devolución parcial

Si se devuelve solo una parte de los productos, la venta sigue existiendo, pero con menor valor.

Ejemplo:

| Producto       |  Precio |
| --------------- | -------: |
| Remera         | $20.000 |
| Jean           | $40.000 |
| Total original | $60.000 |

Si se devuelve la remera: `Nuevo total de venta = $40.000`.

La app debe recalcular: total de venta, monto cobrado, saldo pendiente, comisión, ganancia cobrada y estado de pago.

---

## 12. Anulación de ventas

La Dueña puede anular ventas cargadas por error. La anulación no elimina el registro; lo deja marcado como anulado para mantener trazabilidad.

Cuando una venta se anula:

* Los productos vuelven a estado **Disponible**.
* La venta deja de contar para balances, comisiones y analíticas.
* La venta queda visible como anulada para control interno.

---

## 13. Estados generales

### 13.1 Estado del producto

| Estado     | Significado                 |
| ----------- | ------------------------------ |
| Disponible | Puede venderse              |
| Vendido    | Ya forma parte de una venta |

### 13.2 Estado de pago

| Estado       | Significado                                      |
| ------------- | ---------------------------------------------------- |
| Pagado       | No queda saldo pendiente                         |
| Pago parcial | Se cobró una parte                               |
| Fiado total  | No se cobró nada                                 |
| Vencido      | Pasaron 30 días y sigue habiendo saldo pendiente |

### 13.3 Estado de devolución

| Estado                 | Significado                     |
| ------------------------ | ---------------------------------- |
| En plazo de devolución | Todavía puede devolver          |
| Confirmada             | Ya pasó el plazo de devolución  |
| Con devolución         | Hubo devolución parcial o total |

### 13.4 Estado administrativo

| Estado  | Significado                         |
| -------- | --------------------------------------- |
| Activa  | Venta válida                        |
| Anulada | Venta cancelada administrativamente |

---

## 14. Analíticas

Ayudan a la Dueña a decidir qué productos conviene volver a comprar. Se calculan sobre **ventas confirmadas** (no cuentan ventas anuladas, ventas dentro del plazo de devolución, productos devueltos ni ventas no confirmadas).

### 14.1 Métricas principales

| Métrica                        | Descripción                                  |
| -------------------------------- | ------------------------------------------------ |
| Categoría más vendida          | Superior, Inferior o Lencería                |
| Subclasificación más vendida   | Remera, Abrigo, Largo, Corto                 |
| Talles más vendidos            | Talles con mayor salida                      |
| Productos más vendidos         | Productos o tipos de producto con más ventas |
| Categorías con mayor ganancia  | Qué categoría dejó más ganancia cobrada      |
| Total vendido por categoría    | Monto vendido por categoría                  |
| Cantidad vendida por categoría | Cantidad de unidades vendidas                |
| Ganancia cobrada mensual       | Ganancia real basada en dinero cobrado       |
| Rendimiento por empleada       | Ventas y cobros de cada empleada             |

### 14.2 Ganancia cobrada

La app debe mostrar la **ganancia cobrada** (basada en dinero efectivamente recibido), no la ganancia esperada.

**Fórmula sugerida (proporcional para ventas parciales):**

```txt
Porcentaje cobrado = monto cobrado / total de venta
Costo proporcional = costo total de compra × porcentaje cobrado
Ganancia cobrada = monto cobrado - costo proporcional
```

Ejemplo:

| Concepto              |    Monto |
| ----------------------- | ---------: |
| Total venta           | $100.000 |
| Costo total de compra | $60.000  |
| Monto cobrado         | $50.000  |
| Porcentaje cobrado    | 50%      |
| Costo proporcional    | $30.000  |
| Ganancia cobrada      | $20.000  |

Esto permite mostrar una ganancia más realista cuando una venta todavía no fue pagada por completo.

---

## 15. Sección Empleadas

### 15.1 Funciones principales de la Dueña

* Crear o invitar empleadas.
* Ver listado de empleadas.
* Asignar un color representativo a cada empleada.
* Ver ventas, total vendido, total cobrado y total pendiente por empleada.
* Ver comisión mensual de cada empleada.
* Desactivar empleadas.

### 15.2 Color representativo por empleada

Cada empleada tiene un color representativo, usado para identificar visualmente sus ventas, su tarjeta en el Home, su perfil y sus registros en la sección Ventas.

Ejemplo:

| Empleada | Color   |
| --------- | --------- |
| Camila   | Rosa    |
| Sofía    | Violeta |
| Martina  | Verde   |

---

## 16. Vista de la Empleada

Debe ser más simple que la de la Dueña.

### 16.1 Secciones sugeridas

| Sección  | Función                              |
| --------- | ---------------------------------------- |
| Home     | Ver resumen personal del mes         |
| Catálogo | Ver productos disponibles y vendidos |
| Ventas   | Crear y gestionar sus ventas         |
| Perfil   | Ver datos personales y cerrar sesión |

### 16.2 Home de Empleada

Muestra: total vendido en el mes, total cobrado en el mes, total pendiente de sus ventas, comisión ganada, ventas vencidas propias, ventas dentro del plazo de devolución.

### 16.3 Catálogo de Empleada

**Puede ver:** foto, nombre, talle, descripción, categoría, subclasificación, precio de venta, estado.

**No puede ver:** precio de compra, ganancia del producto, información económica interna de la Dueña.

### 16.4 Ventas de Empleada

**Puede:** crear ventas, ver sus ventas, editarlas, cargar pagos posteriores, gestionar devoluciones, ver estado de pago, ver si está vencida o en plazo de devolución.

**No puede:** ver ventas de otras empleadas.

---

## 17. Flujos principales

### 17.1 Flujo de carga de producto

```txt
Dueña entra a Catálogo
↓
Presiona Agregar producto
↓
Carga nombre, foto, talle, descripción, categoría, subclasificación, precio compra y precio venta
↓
Guarda producto
↓
Producto queda en estado Disponible
```

### 17.2 Flujo de venta

```txt
Usuario entra a Ventas
↓
Selecciona productos disponibles
↓
Agrega productos al carrito
↓
Presiona Crear venta
↓
Carga datos del comprador
↓
Carga monto entregado
↓
Confirma venta
↓
Productos pasan a estado Vendido
↓
Venta queda registrada
```

### 17.3 Flujo de pago posterior

```txt
Usuario entra a una venta
↓
Selecciona Registrar pago
↓
Carga monto recibido
↓
La app actualiza total cobrado
↓
La app actualiza saldo pendiente
↓
La app recalcula estado de pago
↓
La app recalcula comisión si corresponde
```

### 17.4 Flujo de devolución

```txt
Usuario entra a una venta
↓
La app verifica si está dentro de la semana de devolución
↓
Usuario selecciona producto a devolver
↓
Confirma devolución
↓
Producto vuelve a Disponible
↓
La app recalcula venta, cobro, saldo, comisión y ganancia
```

### 17.5 Flujo de anulación

```txt
Dueña entra a una venta
↓
Selecciona Anular venta
↓
Confirma acción
↓
Productos vuelven a Disponible
↓
Venta queda marcada como Anulada
↓
La venta deja de impactar en balance, comisión y analíticas
```

### 17.6 Flujo de aumento masivo

```txt
Dueña entra a Catálogo
↓
Selecciona varios productos
↓
Elige Aumentar precios
↓
Ingresa porcentaje de aumento
↓
La app muestra vista previa
↓
Dueña confirma
↓
Se actualizan los precios de venta
```

---

## 18. Reglas de negocio principales

### 18.1 Productos

* Cada producto es una unidad única.
* Cada producto tiene estado Disponible o Vendido.
* Los productos vendidos se siguen mostrando en catálogo.
* Los productos vendidos no pueden volver a venderse.
* Si una venta se anula, los productos vuelven a Disponible.
* Si un producto se devuelve, vuelve a Disponible.

### 18.2 Ventas

* Una venta puede tener uno o varios productos.
* Una venta puede mezclar categorías y talles.
* Toda venta debe tener comprador y persona vendedora.
* La Dueña puede ver todas las ventas y anularlas.
* La Empleada solo puede ver y editar sus propias ventas.

### 18.3 Pagos

* Una venta puede pagarse completa, parcialmente o no pagarse al momento de crearla.
* El plazo de pago es de 30 días desde la fecha de venta.
* Si no se paga en 30 días, queda vencida.
* Una venta vencida puede pagarse después.
* Lo no pagado se arrastra al total esperado del mes siguiente.
* Los pagos impactan en el mes en que se cobran.

### 18.4 Comisiones

* Solo las empleadas generan comisión.
* La Dueña no genera comisión por sus ventas.
* La comisión es del 15%, calculada sobre lo cobrado.
* Se registra en el mes en que se cobra.
* Si hay devolución, la comisión se recalcula.

### 18.5 Devoluciones

* El plazo de devolución es de una semana desde la fecha de venta.
* La Dueña puede gestionar cualquier devolución; la Empleada solo las propias.
* Las devoluciones de empleadas son directas (sin aprobación previa).
* Si se devuelve un producto, vuelve a Disponible.
* Si se devolvió dinero, debe reflejarse en el balance.
* Las devoluciones afectan la comisión y la ganancia.

### 18.6 Analíticas

* Solo se calculan sobre ventas confirmadas.
* No cuentan ventas anuladas, ventas dentro del plazo de devolución ni productos devueltos.
* Deben mostrar cantidad vendida y ganancia cobrada.
* Deben ayudar a decidir qué productos volver a comprar.

---

## 19. Funciones no prioritarias para primera versión

| Función                              | Motivo                                                  |
| --------------------------------------- | ----------------------------------------------------------- |
| Historial avanzado de compradores    | Útil, pero no indispensable para la primera versión     |
| Reportes exportables                 | No prioritario                                          |
| Notificaciones automáticas           | Puede agregarse luego                                   |
| Comparativas avanzadas entre meses   | Mejor para una versión más madura                       |
| Sugerencias automáticas de compra    | Primero conviene mostrar datos reales                   |
| Exportación/importación por archivos | Ya no es prioridad porque habrá backend y base de datos |

---

## 20. Resumen final

**voga.ind balance** es una app de gestión para un emprendimiento de indumentaria, con backend y base de datos, que sincroniza la información entre la Dueña y las Empleadas.

**La Dueña puede controlar:** productos, ventas, cobros, deudas, comisiones, empleadas, devoluciones, ganancias y analíticas.

**Las Empleadas pueden:** ver catálogo, crear ventas, gestionar sus ventas, cargar pagos, gestionar devoluciones, ver cuánto vendieron y cuánto ganaron de comisión.

El foco principal de la app es que la Dueña pueda saber:

```txt
Cuánto se vendió
Cuánto se cobró
Cuánto falta cobrar
Cuánto debe pagar en comisiones
Qué productos se venden más
Qué productos dejan más ganancia
Qué conviene volver a comprar
```

---

*Este documento sirve como especificación funcional base del proyecto. Cualquier decisión de modelado de datos, arquitectura técnica o desarrollo debería ser consistente con las reglas y flujos aquí descritos.*
