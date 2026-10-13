SELECT rol,COUNT(*) FROM usuarios GROUP BY rol ORDER BY rol;
SELECT estado_pago,canal_pago,COUNT(*) AS registros,SUM(monto_calculado) AS total FROM solicitudes_clave_sol GROUP BY estado_pago,canal_pago ORDER BY estado_pago;
SELECT canal,metodo,estado,COUNT(*) AS operaciones,SUM(monto) AS total FROM pagos GROUP BY canal,metodo,estado ORDER BY canal,metodo,estado;
SELECT id,codigo_operacion,id_registro,canal,metodo,monto,estado,verificado,fecha_pago FROM pagos ORDER BY id;
