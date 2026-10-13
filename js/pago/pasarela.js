import { sql } from "../config/neon-config.js";
import { soloDigitos, enmascararTarjeta, enmascararCelular, generarCodigoOperacion } from "./validaciones.js";

export async function obtenerRegistro(idRegistro,idUsuario){
  const filas = await sql("q13", [idRegistro, idUsuario]);
  return filas[0] ?? null;
}

export async function listarPendientesCliente(idUsuario){
  return await sql("q14", [idUsuario]);
}

async function registrarRechazo({registro,usuario,metodo,proveedor=null,marca=null,referencia,motivo,onEstado=()=>{}}){
  onEstado("rechazado",motivo);
  const codigo = generarCodigoOperacion("RCH");
  await sql("q15", [codigo, registro.id, usuario.id, metodo, proveedor, marca, referencia, registro.monto_calculado, motivo]);
  return {aprobado:false,codigo,motivo};
}

function motivoDesdeError(error){
  if(error?.code === "23514") return "Saldo insuficiente al momento de confirmar.";
  if(error?.code === "23505") return "Esta solicitud ya fue pagada.";
  return "Error de comunicación con la entidad. No se realizó ningún cargo.";
}

function confirmarCobro({actualizarSaldo,registro,usuario,codigo,metodo,proveedor=null,marca=null,referencia,monto}){
  return sql.transaction([
    actualizarSaldo,
    sql("q16", [codigo, registro.id, usuario.id, metodo, proveedor, marca, referencia, monto]),
    sql("q17", [registro.id])
  ]);
}

export async function pagarConTarjeta({registro,usuario,numero,mes,anio,cvv,marca,onEstado=()=>{}}){
  const pan = soloDigitos(numero);
  const referencia = enmascararTarjeta(pan);
  onEstado("consulta");
  const filas = await sql("q18", [pan]);
  const tarjeta = filas[0];
  const metodo = tarjeta?.tipo === "credito" ? "tarjeta_credito" : "tarjeta_debito";
  const base = {registro,usuario,metodo,marca,referencia,onEstado};
  const monto = Number(registro.monto_calculado);
  onEstado("reglas");
  if(!tarjeta) return registrarRechazo({...base,motivo:"Tarjeta no reconocida por la entidad emisora."});
  if(tarjeta.estado !== "activa") return registrarRechazo({...base,motivo:"Tarjeta bloqueada. Comunícate con tu entidad."});
  if(Number(tarjeta.mes_venc) !== mes || Number(tarjeta.anio_venc) !== anio) return registrarRechazo({...base,motivo:"Fecha de vencimiento incorrecta."});
  if(String(tarjeta.cvv) !== String(cvv)) return registrarRechazo({...base,motivo:"Código de seguridad incorrecto."});
  if(Number(tarjeta.saldo_disponible) < monto){
    const motivo = tarjeta.tipo === "credito" ? "Línea de crédito insuficiente." : "Saldo insuficiente en la cuenta de ahorros.";
    return registrarRechazo({...base,motivo});
  }
  const codigo = generarCodigoOperacion("OP");
  try{
    onEstado("transaccion");
    await confirmarCobro({...base,codigo,monto,actualizarSaldo:sql("q19", [monto, tarjeta.id_cuenta])});
    onEstado("aprobado");
    return {aprobado:true,codigo};
  }catch(error){
    const motivo = motivoDesdeError(error);
    try{return await registrarRechazo({...base,motivo});}catch{onEstado("rechazado",motivo);return {aprobado:false,codigo:null,motivo};}
  }
}

export async function pagarConBilletera({registro,usuario,proveedor,celular,codigoAprobacion,onEstado=()=>{}}){
  const cel = soloDigitos(celular);
  const base = {registro,usuario,metodo:"billetera",proveedor,referencia:enmascararCelular(cel),onEstado};
  const monto = Number(registro.monto_calculado);
  onEstado("consulta");
  const filas = await sql("q20", [proveedor, cel]);
  const billetera = filas[0];
  onEstado("reglas");
  if(!billetera) return registrarRechazo({...base,motivo:"El celular no está afiliado a esa billetera."});
  if(String(billetera.codigo_aprobacion) !== String(codigoAprobacion)) return registrarRechazo({...base,motivo:"Código de aprobación incorrecto."});
  if(Number(billetera.saldo_disponible) < monto) return registrarRechazo({...base,motivo:"Saldo insuficiente en la billetera."});
  const codigo = generarCodigoOperacion("OP");
  try{
    onEstado("transaccion");
    await confirmarCobro({...base,codigo,monto,actualizarSaldo:sql("q21", [monto, billetera.id])});
    onEstado("aprobado");
    return {aprobado:true,codigo};
  }catch(error){
    const motivo = motivoDesdeError(error);
    try{return await registrarRechazo({...base,motivo});}catch{onEstado("rechazado",motivo);return {aprobado:false,codigo:null,motivo};}
  }
}
