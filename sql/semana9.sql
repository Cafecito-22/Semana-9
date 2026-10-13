ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno VARCHAR(10);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dni VARCHAR(8);
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('cliente','administrador','empleado','cajero'));

ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS id_usuario INT REFERENCES usuarios(id);
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'registrado';
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS regimen VARCHAR(10) NOT NULL DEFAULT 'nrus';
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS monto_calculado NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente';
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS canal_pago VARCHAR(10);
ALTER TABLE solicitudes_clave_sol ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
ALTER TABLE solicitudes_clave_sol DROP CONSTRAINT IF EXISTS solicitudes_clave_sol_regimen_check;
ALTER TABLE solicitudes_clave_sol ADD CONSTRAINT solicitudes_clave_sol_regimen_check CHECK (regimen IN ('nrus','mype','general'));
ALTER TABLE solicitudes_clave_sol DROP CONSTRAINT IF EXISTS solicitudes_clave_sol_monto_calculado_check;
ALTER TABLE solicitudes_clave_sol ADD CONSTRAINT solicitudes_clave_sol_monto_calculado_check CHECK (monto_calculado >= 0);
ALTER TABLE solicitudes_clave_sol DROP CONSTRAINT IF EXISTS solicitudes_clave_sol_estado_pago_check;
ALTER TABLE solicitudes_clave_sol ADD CONSTRAINT solicitudes_clave_sol_estado_pago_check CHECK (estado_pago IN ('pendiente','pagado','exonerado'));
ALTER TABLE solicitudes_clave_sol DROP CONSTRAINT IF EXISTS solicitudes_clave_sol_canal_pago_check;
ALTER TABLE solicitudes_clave_sol ADD CONSTRAINT solicitudes_clave_sol_canal_pago_check CHECK (canal_pago IS NULL OR canal_pago IN ('pasarela','caja'));

CREATE TABLE IF NOT EXISTS banco_cuentas (
  id SERIAL PRIMARY KEY,
  numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
  titular VARCHAR(100) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ahorros','credito')),
  saldo_disponible NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo_disponible >= 0),
  moneda CHAR(3) NOT NULL DEFAULT 'PEN'
);

CREATE TABLE IF NOT EXISTS banco_tarjetas (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(19) UNIQUE NOT NULL,
  id_cuenta INT NOT NULL REFERENCES banco_cuentas(id),
  titular VARCHAR(100) NOT NULL,
  marca VARCHAR(20) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('debito','credito')),
  mes_venc SMALLINT NOT NULL CHECK (mes_venc BETWEEN 1 AND 12),
  anio_venc SMALLINT NOT NULL,
  cvv VARCHAR(4) NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','bloqueada'))
);

CREATE TABLE IF NOT EXISTS billeteras (
  id SERIAL PRIMARY KEY,
  proveedor VARCHAR(12) NOT NULL CHECK (proveedor IN ('andipay','pagomovil')),
  celular VARCHAR(9) NOT NULL,
  titular VARCHAR(100) NOT NULL,
  saldo_disponible NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo_disponible >= 0),
  codigo_aprobacion VARCHAR(6) NOT NULL,
  UNIQUE (proveedor,celular)
);

CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  codigo_operacion VARCHAR(20) UNIQUE NOT NULL,
  id_registro INT NOT NULL REFERENCES solicitudes_clave_sol(id),
  id_usuario INT REFERENCES usuarios(id),
  canal VARCHAR(10) NOT NULL CHECK (canal IN ('pasarela','caja')),
  metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('tarjeta_debito','tarjeta_credito','billetera','efectivo','pos')),
  proveedor_billetera VARCHAR(12) CHECK (proveedor_billetera IN ('andipay','pagomovil')),
  marca_tarjeta VARCHAR(20),
  referencia VARCHAR(30),
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  monto_recibido NUMERIC(10,2),
  vuelto NUMERIC(10,2),
  estado VARCHAR(10) NOT NULL CHECK (estado IN ('aprobado','rechazado')),
  motivo_rechazo VARCHAR(120),
  id_cajero INT REFERENCES usuarios(id),
  verificado BOOLEAN NOT NULL DEFAULT false,
  verificado_por INT REFERENCES usuarios(id),
  fecha_verificacion TIMESTAMPTZ,
  fecha_pago TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pagos_un_aprobado_por_registro ON pagos (id_registro) WHERE estado='aprobado';

UPDATE usuarios SET rol='administrador' WHERE LOWER(correo)=LOWER('72922081@continental.edu.pe');
UPDATE usuarios SET rol='empleado' WHERE LOWER(correo)=LOWER('johaogavilan@gmail.com');
UPDATE usuarios SET turno='manana' WHERE rol='empleado' AND LOWER(correo)=LOWER('johaogavilan@gmail.com') AND (turno IS NULL OR turno='');

INSERT INTO banco_cuentas (numero_cuenta,titular,tipo,saldo_disponible) VALUES
('0011-000001','ANA TORRES QUISPE','ahorros',1500.00),
('0011-000002','LUIS PEREZ ROJAS','ahorros',10.00),
('0022-000001','MARIA HUAMAN SOTO','credito',3000.00),
('0022-000002','JORGE LIMA CRUZ','credito',2000.00),
('0011-000003','ROSA CCENCHO VEGA','ahorros',800.00)
ON CONFLICT (numero_cuenta) DO NOTHING;

INSERT INTO banco_tarjetas (numero,id_cuenta,titular,marca,tipo,mes_venc,anio_venc,cvv,estado)
SELECT t.numero,c.id,c.titular,t.marca,t.tipo,t.mes,t.anio,t.cvv,t.estado
FROM (VALUES
('4111111111111111','0011-000001','Visa','debito',12,2029,'123','activa'),
('4000000000000002','0011-000002','Visa','debito',8,2028,'456','activa'),
('5555555555554444','0022-000001','Mastercard','credito',5,2030,'789','activa'),
('5105105105105100','0022-000002','Mastercard','credito',3,2027,'321','bloqueada'),
('378282246310005','0022-000001','American Express','credito',11,2028,'1234','activa'),
('4242424242424242','0011-000003','Visa','debito',1,2025,'111','activa')
) AS t(numero,cuenta,marca,tipo,mes,anio,cvv,estado)
JOIN banco_cuentas c ON c.numero_cuenta=t.cuenta
ON CONFLICT (numero) DO NOTHING;

INSERT INTO billeteras (proveedor,celular,titular,saldo_disponible,codigo_aprobacion) VALUES
('andipay','987654321','ANA TORRES QUISPE',500.00,'123456'),
('pagomovil','912345678','LUIS PEREZ ROJAS',15.00,'654321'),
('andipay','999888777','MARIA HUAMAN SOTO',1000.00,'111222')
ON CONFLICT (proveedor,celular) DO NOTHING;

INSERT INTO usuarios (nombre,correo,contrasena,rol)
SELECT 'Cajera de Turno','caja@correo.com','1234','cajero'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE LOWER(correo)=LOWER('caja@correo.com'));

INSERT INTO usuarios (nombre,correo,contrasena,rol)
SELECT 'Cajero Dos','caja2@correo.com','1234','cajero'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE LOWER(correo)=LOWER('caja2@correo.com'));

WITH clientes AS (
  SELECT id,ROW_NUMBER() OVER (ORDER BY id) AS n
  FROM usuarios
  WHERE rol='cliente'
  ORDER BY id
  LIMIT 10
)
UPDATE usuarios u
SET dni=(70000000+c.n)::text
FROM clientes c
WHERE u.id=c.id AND (u.dni IS NULL OR u.dni='');

UPDATE solicitudes_clave_sol
SET regimen=CASE WHEN id%3=0 THEN 'nrus' WHEN id%3=1 THEN 'mype' ELSE 'general' END
WHERE monto_calculado=0;

UPDATE solicitudes_clave_sol
SET monto_calculado=CASE WHEN regimen='nrus' THEN 10.00 ELSE 25.00 END
WHERE monto_calculado=0;

WITH elegidos AS (
  SELECT r.id,r.id_usuario,r.monto_calculado,ROW_NUMBER() OVER (ORDER BY r.id) AS n
  FROM solicitudes_clave_sol r
  WHERE r.estado_pago='pendiente' AND r.id_usuario IS NOT NULL
  ORDER BY r.id
  LIMIT 6
)
INSERT INTO pagos (codigo_operacion,id_registro,id_usuario,canal,metodo,proveedor_billetera,marca_tarjeta,referencia,monto,monto_recibido,vuelto,estado,id_cajero)
SELECT
  'OP-SEED-'||LPAD(e.n::text,3,'0'),
  e.id,
  e.id_usuario,
  CASE WHEN e.n<=4 THEN 'pasarela' ELSE 'caja' END,
  (ARRAY['tarjeta_debito','tarjeta_credito','billetera','billetera','efectivo','pos'])[e.n],
  CASE e.n WHEN 3 THEN 'andipay' WHEN 4 THEN 'pagomovil' END,
  CASE e.n WHEN 1 THEN 'Visa' WHEN 2 THEN 'Mastercard' END,
  CASE e.n WHEN 1 THEN '**** 1111' WHEN 2 THEN '**** 4444' WHEN 3 THEN '*** *** 321' WHEN 4 THEN '*** *** 678' WHEN 5 THEN 'Efectivo' ELSE 'Voucher 004512' END,
  e.monto_calculado,
  CASE WHEN e.n=5 THEN CEIL(e.monto_calculado/10)*10 END,
  CASE WHEN e.n=5 THEN CEIL(e.monto_calculado/10)*10-e.monto_calculado END,
  'aprobado',
  CASE WHEN e.n>4 THEN (SELECT id FROM usuarios WHERE rol='cajero' ORDER BY id LIMIT 1) END
FROM elegidos e
WHERE NOT EXISTS (SELECT 1 FROM pagos p WHERE p.id_registro=e.id AND p.estado='aprobado')
  AND NOT EXISTS (SELECT 1 FROM pagos p WHERE p.codigo_operacion='OP-SEED-'||LPAD(e.n::text,3,'0'));

UPDATE solicitudes_clave_sol r
SET estado_pago='pagado',canal_pago=p.canal,fecha_pago=p.fecha_pago
FROM pagos p
WHERE p.id_registro=r.id AND p.estado='aprobado';

WITH candidato AS (
  SELECT r.id,r.id_usuario,r.monto_calculado
  FROM solicitudes_clave_sol r
  WHERE r.estado_pago='pendiente' AND r.id_usuario IS NOT NULL
  ORDER BY r.id
  LIMIT 1
)
INSERT INTO pagos (codigo_operacion,id_registro,id_usuario,canal,metodo,marca_tarjeta,referencia,monto,estado,motivo_rechazo)
SELECT 'RCH-SEED-001',c.id,c.id_usuario,'pasarela','tarjeta_debito','Visa','**** 1111',c.monto_calculado,'rechazado','Código de seguridad incorrecto.'
FROM candidato c
WHERE NOT EXISTS (SELECT 1 FROM pagos WHERE codigo_operacion='RCH-SEED-001');
