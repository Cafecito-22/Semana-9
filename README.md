# SUNAT Perú — Semanas 7 y 9

Proyecto académico del caso 13: GAVILAN ERQUINIO, Johao Miguel — SUNAT Perú.

## Qué conserva de Semana 7

- Cliente/contribuyente con registro, sesión, consulta y actualización de sus propios registros.
- Administrador y empleado con panel CRUD completo.
- Horario semanal de empleados visible solo para el administrador como función adicional.
- Fondo animado con JavaScript.
- Una hoja CSS por página y JavaScript separado por funcionalidad.

## Qué agrega Semana 9

- Nuevo rol `cajero`.
- DNI en usuarios para búsqueda en ventanilla.
- Tarifario del caso SUNAT para el talonario de guías físicas.
- NRUS: S/ 10.00.
- MYPE Tributario: S/ 25.00.
- Régimen General: S/ 25.00.
- Cotización en vivo en `registro.html`.
- `pago.html` con tarjeta de débito/crédito y billetera electrónica.
- Validación de tarjeta con Luhn, marca, vencimiento y CVV.
- Autorización simulada contra `banco_cuentas`, `banco_tarjetas` y `billeteras`.
- Tabla `pagos` con auditoría de operaciones aprobadas y rechazadas.
- Prevención de doble cobro mediante índice único para pagos aprobados.
- `comprobante.html` imprimible.
- `caja.html` con búsqueda por código, DNI o nombre usando ILIKE.
- Cobro presencial por efectivo, POS o billetera QR.
- Vuelto automático para efectivo.
- Registro del cajero mediante `id_cajero`.
- Conciliación de pagos en línea con verificación.
- Refresco automático cada 15 segundos si la pestaña está visible.
- Resumen diario por canal y método de pago usando horario de Lima.
- `consulta.html` muestra estado de pago y permite pagar/ver comprobante.
- `actualizar.html` bloquea solicitudes ya pagadas y recalcula tarifa.
- `panel.html` muestra monto, estado de pago y canal; no permite eliminar registros con historial de pagos.


## Extras adaptados del laboratorio del profesor

- Tarjeta visual 3D que cambia de marca y gira al enfocar el CVV.
- Desglose visual del algoritmo de Luhn mientras se escribe.
- Botones de escenarios de prueba para Visa, Mastercard, Amex, bloqueada, vencida, sin saldo y CVV incorrecto.
- Flujo visual de cuatro etapas: validación, entidad emisora, reglas y transacción.
- Barra de refresco de 15 segundos en Caja.
- Confirmación de cobro y verificación dentro de diálogos, sin depender de `confirm()`.
- Relojes de Lima y UTC con aviso cuando cambian de fecha.
- Uso de `textContent` en las tablas reales para mostrar datos de usuarios de forma segura.
- `laboratorio.html` exclusivo del administrador con ocho prácticas interactivas adaptadas al caso SUNAT.

## Antes de abrir la web

1. Abre Neon SQL Editor.
2. Ejecuta completo `sql/semana9.sql`.
3. Ejecuta `sql/verificacion_semana9.sql` y toma capturas para tu entrega.
4. Configura el servidor y despliega en Vercel siguiendo PUBLICAR.md.

No vuelvas a ejecutar `sql/semana7.sql` después de `semana9.sql`.

## Roles

- Cliente: `registro.html`, `consulta.html`, `actualizar.html`, `pago.html` y sus propios comprobantes.
- Administrador: `panel.html`, `caja.html` y todos los comprobantes.
- Empleado: `panel.html` y todos los comprobantes.
- Cajero: `caja.html` y todos los comprobantes.

Tu configuración mantiene:

- `72922081@continental.edu.pe` como administrador si esa cuenta ya existe.
- `johaogavilan@gmail.com` como empleado si esa cuenta ya existe.

El script no cambia sus contraseñas.

## Cuentas de cajero de prueba

- `caja@correo.com` / `1234`
- `caja2@correo.com` / `1234`

## Datos para probar tarjeta

- Aprobado débito: `4111 1111 1111 1111`, `12/29`, CVV `123`.
- Rechazado por saldo: `4000 0000 0000 0002`, `08/28`, CVV `456`.
- Aprobado crédito: `5555 5555 5555 4444`, `05/30`, CVV `789`.
- Rechazado por tarjeta bloqueada: `5105 1051 0510 5100`, `03/27`, CVV `321`.
- American Express: `3782 8224 6310 005`, `11/28`, CVV `1234`.
- Tarjeta vencida: `4242 4242 4242 4242`, `01/25`, CVV `111`.
- Luhn inválido: `4111 1111 1111 1112`.
- CVV incorrecto registrado como rechazo: `4111 1111 1111 1111`, `12/29`, CVV `999`.

Para el campo titular puedes usar `ANA TORRES QUISPE`.

## Datos para probar billetera

- AndiPay aprobado: celular `987654321`, código `123456`.
- PagoMóvil con saldo insuficiente: celular `912345678`, código `654321`.
- AndiPay con código incorrecto: celular `999888777`, código `000000`.

## Pruebas de caja

- Efectivo: cobra una solicitud de S/ 10 o S/ 25 ingresando S/ 50 y comprueba el vuelto.
- POS: usa voucher `004513`.
- Verificación: realiza primero un pago en línea y entra a caja; debe aparecer en menos de 15 segundos para verificarlo.
- Seguridad: si un cliente intenta abrir `caja.html`, vuelve a su zona de cliente.
- Doble cobro: abre la misma solicitud en dos pestañas y paga primero en una; la segunda operación debe rechazarse.

## Flujo recomendado para exposición

1. Cliente inicia sesión, crea una solicitud y cambia el régimen para mostrar el cotizador en vivo.
2. Prueba un pago rechazado con tarjeta y luego un pago aprobado.
3. Abre el comprobante.
4. Paga otra solicitud con billetera.
5. Cierra sesión y entra como cajero.
6. Verifica el pago recibido por pasarela.
7. Cobra otra solicitud en efectivo y muestra el vuelto.
8. Enseña el resumen del día.

## Archivos nuevos de Semana 9

- `pago.html`
- `comprobante.html`
- `caja.html`
- `css/pago.css`
- `css/comprobante.css`
- `css/caja.css`
- `js/registro/tarifario.js`
- `js/pago/validaciones.js`
- `js/pago/pasarela.js`
- `js/pago/pago.js`
- `js/comprobante/comprobante.js`
- `js/caja/caja.js`
- `sql/semana9.sql`
- `sql/verificacion_semana9.sql`

## Punto de seguridad que debes explicar

Esta pasarela es una simulación académica. En un sistema real, el comercio no procesa ni guarda directamente el número completo de tarjeta ni el CVV: una pasarela certificada devuelve un token y el CVV nunca se almacena. El monto y la autorización real se validarían en un backend, y la cadena de conexión de la base de datos no se publicaría en el navegador.

## Checklist de los 16 escenarios obligatorios

1. Tarjeta Visa débito aprobada con `4111 1111 1111 1111`, `12/29`, CVV `123`.
2. Tarjeta Visa rechazada por saldo insuficiente con `4000 0000 0000 0002`, `08/28`, CVV `456`.
3. Mastercard crédito aprobada con `5555 5555 5555 4444`, `05/30`, CVV `789`.
4. Mastercard bloqueada con `5105 1051 0510 5100`, `03/27`, CVV `321`.
5. American Express aprobada con `3782 8224 6310 005`, `11/28`, CVV `1234`.
6. Tarjeta vencida `4242 4242 4242 4242`, `01/25`.
7. Número inválido por Luhn `4111 1111 1111 1112`.
8. CVV incorrecto `999` en Visa válida; queda intento rechazado.
9. AndiPay aprobado: `987654321`, código `123456`.
10. PagoMóvil rechazado por saldo: `912345678`, código `654321`.
11. AndiPay rechazado por código: `999888777`, código `000000`.
12. Caja en efectivo: recibe S/ 50.00 y calcula vuelto.
13. Caja POS: voucher `004513` y registra `id_cajero`.
14. El pago en línea aparece en caja en menos de 15 s y puede verificarse.
15. Un cliente no puede entrar a `caja.html`.
16. El segundo intento de pagar una solicitud ya pagada se rechaza.


Consulta PUBLICAR.md para configurar DATABASE_URL y SESSION_SECRET sin publicar secretos.
