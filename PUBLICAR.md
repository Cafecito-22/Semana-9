# Publicar SUNAT Semana 9

El proyecto conserva Semana 9 y el laboratorio del profesor. Se retiraron la barra superior y todos los enlaces a Servicios; servicios.html queda disponible solo por URL directa, con una fotografía del edificio SUNAT y detalles institucionales. Contacto incorpora teléfono vibrando, sobre con solapa móvil y edificio con elevación y puerta. El teclado activa los mismos efectos y prefers-reduced-motion los desactiva. El menú permanece visible en móvil.

## GitHub y Vercel

1. Descomprime el ZIP. Sube el contenido de sunat_semana9 a Cafecito-22/Semana-9, en la raíz del repositorio. Incluye api, server, package.json, build.mjs y vercel.json. La conexión remota no pudo comprobarse desde este entorno; no se realizó una publicación.
2. Importa ese repositorio en Vercel. Usa Framework Preset Other. vercel.json establece el comando de construcción y la carpeta public; conserva la instalación de dependencias de package.json.
3. En Settings > Environment Variables crea DATABASE_URL con la conexión de Neon y SESSION_SECRET con un valor aleatorio de al menos 32 caracteres. Actívalas para Production y para Preview/Development si los usas. No añadas prefijos públicos ni guardes valores reales en el repositorio.
4. Si la base ya está configurada, no repitas la carga SQL. Para una base de pruebas nueva revisa primero sql/semana9.sql y ejecuta después sql/verificacion_semana9.sql. No ejecutes semana7.sql después de semana9.sql.
5. Despliega o vuelve a desplegar después de configurar las variables. La función /api/database ejecuta únicamente consultas registradas y conserva las transacciones de cobro. La sesión se firma en el servidor y se guarda en una cookie HttpOnly. Abrir los HTML como archivos o con Live Server permite ver el diseño, pero las operaciones de base de datos requieren Vercel o vercel dev.

## Comprobación y alcance

Comprueba en Vercel el inicio de sesión de cada rol, registro, consulta, actualización, pago aprobado y rechazado, comprobante, cobro en caja y conciliación. Verifica el refresco de 15 segundos y el rechazo de doble cobro. Las pruebas locales de diseño, enlaces, validaciones y permisos no sustituyen una prueba real de Neon; no se utilizó la credencial privada para ejecutar operaciones.

La aplicación sigue siendo una simulación académica: mantiene contraseñas y tarjetas de prueba del laboratorio y reglas simuladas. Usa exclusivamente una base de demostración. No la emplees para tarjetas reales ni datos financieros reales. La conexión encontrada en el original fue eliminada del paquete. Si esa conexión ya se publicó anteriormente, cambia la contraseña del rol de Neon y actualiza DATABASE_URL.

Fuentes de configuración: https://vercel.com/docs/environment-variables/managing-environment-variables y https://neon.com/docs/serverless/serverless-driver
