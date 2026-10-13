import { sql } from "../config/neon-config.js";
import { exigirRol, cerrarSesion } from "../auth/auth.js";
import { formatearSoles, redondear } from "../registro/tarifario.js";
import { generarCodigoOperacion } from "../pago/validaciones.js";

const usuario = exigirRol("cajero","administrador");
if(!usuario) throw new Error("Acceso denegado");

async function buscarPendientes(criterio=""){
  const patron = `%${String(criterio).trim()}%`;
  return await sql("q5", [patron, patron, patron]);
}

const metodosCaja = {efectivo:{metodo:"efectivo",proveedor:null},pos:{metodo:"pos",proveedor:null},andipay:{metodo:"billetera",proveedor:"andipay"},pagomovil:{metodo:"billetera",proveedor:"pagomovil"}};

async function cobrarPresencial({registro,opcion,montoRecibido,referencia}){
  const {metodo,proveedor} = metodosCaja[opcion];
  const monto = Number(registro.monto_calculado);
  let vuelto = null;
  if(metodo === "efectivo"){
    if(!(montoRecibido >= monto)) throw new Error("El monto recibido es menor que el total.");
    vuelto = redondear(montoRecibido-monto);
    referencia = "Efectivo";
  }else{
    montoRecibido = null;
    referencia = (metodo === "pos" ? "Voucher " : "Op. ") + referencia;
  }
  const codigo = generarCodigoOperacion("CJ");
  await sql.transaction([
    sql("q6", [codigo, registro.id, registro.id_usuario, metodo, proveedor, referencia, monto, montoRecibido, vuelto, usuario.id]),
    sql("q7", [registro.id])
  ]);
  return {codigo,vuelto};
}

async function listarPagosEnLinea(fecha,soloPorVerificar){
  return await sql("q8", [fecha, soloPorVerificar]);
}

async function verificarPago(idPago){
  await sql("q9", [usuario.id, idPago]);
}

async function resumenDelDia(fecha){
  return await sql("q10", [fecha]);
}

const $ = selector => document.querySelector(selector);
const tablaPendientes = $("#tabla-pendientes tbody");
const tablaEnLinea = $("#tabla-en-linea tbody");
const tablaResumen = $("#tabla-resumen tbody");
const dialogo = $("#dialogo-cobro");
const dialogoVerificacion = $("#dialogo-verificacion");
const formCobro = $("#form-cobro");
const selectMetodo = $("#metodo-caja");
const inputRecibido = $("#monto-recibido");
const inputReferencia = $("#referencia");
const inputFecha = $("#fecha-caja");
const chkPorVerificar = $("#solo-por-verificar");

$("#nombre-cajero").textContent = usuario.nombre;
$("#rol-cajero").textContent = usuario.rol === "administrador" ? "Administrador con acceso a caja" : "Cajero de ventanilla";
$("#cerrar-sesion").addEventListener("click",cerrarSesion);

const hoyEnLima = () => new Date().toLocaleDateString("en-CA",{timeZone:"America/Lima"});
inputFecha.value = hoyEnLima();
let pendientesCache = [];
let registroEnCobro = null;
let datosCobroPendientes = null;
let ultimoIdVisto = null;
let idPagoPorVerificar = null;

function celda(fila,texto=""){
  const td = document.createElement("td");
  td.textContent = texto ?? "—";
  fila.append(td);
  return td;
}

function boton(texto,accion,id){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "boton boton-secundario boton-mini";
  b.textContent = texto;
  b.dataset.accion = accion;
  b.dataset.id = id;
  return b;
}

function filaVacia(tbody,columnas,texto){
  const tr = document.createElement("tr");
  const td = celda(tr,texto);
  td.colSpan = columnas;
  td.className = "vacio";
  tbody.append(tr);
}

function describirMedio(p){
  if(p.metodo === "billetera") return `Billetera ${p.proveedor_billetera} ${p.referencia}`;
  if(p.marca_tarjeta) return `${p.marca_tarjeta} ${p.referencia}`;
  return p.referencia ?? p.metodo;
}

function actualizarRelojes(){
  const ahora = new Date();
  const horaLima = ahora.toLocaleTimeString("es-PE",{timeZone:"America/Lima",hour12:false});
  const horaUtc = ahora.toLocaleTimeString("es-PE",{timeZone:"UTC",hour12:false});
  const fechaLima = ahora.toLocaleDateString("es-PE",{timeZone:"America/Lima",dateStyle:"full"});
  const fechaUtc = ahora.toLocaleDateString("es-PE",{timeZone:"UTC",dateStyle:"full"});
  $("#reloj-lima").textContent = horaLima;
  $("#reloj-utc").textContent = horaUtc;
  $("#fecha-lima").textContent = fechaLima;
  $("#fecha-utc").textContent = fechaUtc;
  const distintas = hoyEnLima() !== ahora.toLocaleDateString("en-CA",{timeZone:"UTC"});
  $("#aviso-zona").textContent = distintas ? "Ahora Lima y UTC están en fechas diferentes; por eso la caja filtra con America/Lima." : "Lima y UTC están en la misma fecha en este momento; el filtro igualmente usa America/Lima.";
}

function reiniciarBarra(){
  const barra = $("#barra-refresco");
  barra.classList.remove("corre");
  void barra.offsetWidth;
  barra.classList.add("corre");
  $("#ultima-actualizacion").textContent = new Date().toLocaleTimeString("es-PE",{timeZone:"America/Lima",hour12:false});
}

async function pintarPendientes(criterio=""){
  pendientesCache = await buscarPendientes(criterio);
  tablaPendientes.replaceChildren();
  if(!pendientesCache.length){filaVacia(tablaPendientes,6,"Sin solicitudes pendientes.");return;}
  for(const r of pendientesCache){
    const tr = document.createElement("tr");
    celda(tr,r.codigo_seguimiento);
    celda(tr,r.cliente ?? "Atención presencial");
    celda(tr,r.dni || "—");
    celda(tr,({nrus:"NRUS",mype:"MYPE",general:"General"}[r.regimen] || r.regimen));
    celda(tr,formatearSoles(Number(r.monto_calculado)));
    celda(tr).append(boton("Cobrar","cobrar",r.id));
    tablaPendientes.append(tr);
  }
}

$("#form-buscar").addEventListener("submit",evento=>{evento.preventDefault();pintarPendientes(new FormData(evento.target).get("criterio")).catch(error=>alert(error.message));});

function ajustarCamposMetodo(){
  const esEfectivo = selectMetodo.value === "efectivo";
  $("#campo-recibido").hidden = !esEfectivo;
  $("#campo-referencia").hidden = esEfectivo;
  inputRecibido.required = esEfectivo;
  inputReferencia.required = !esEfectivo;
  $("#vuelto").textContent = formatearSoles(0);
  $("#confirmacion-cobro").hidden = true;
  $("#preparar-cobro").hidden = false;
}

selectMetodo.addEventListener("change",ajustarCamposMetodo);
inputRecibido.addEventListener("input",()=>{
  if(!registroEnCobro) return;
  const vuelto = Number(inputRecibido.value)-Number(registroEnCobro.monto_calculado);
  $("#vuelto").textContent = vuelto >= 0 ? formatearSoles(redondear(vuelto)) : "Monto insuficiente";
});

tablaPendientes.addEventListener("click",evento=>{
  const b = evento.target.closest('button[data-accion="cobrar"]');
  if(!b) return;
  registroEnCobro = pendientesCache.find(r=>Number(r.id)===Number(b.dataset.id));
  if(!registroEnCobro) return;
  $("#cobro-codigo").textContent = registroEnCobro.codigo_seguimiento;
  $("#cobro-total").textContent = formatearSoles(Number(registroEnCobro.monto_calculado));
  formCobro.reset();
  ajustarCamposMetodo();
  dialogo.showModal();
});

$("#cancelar-cobro").addEventListener("click",()=>dialogo.close());
$("#volver-cobro").addEventListener("click",()=>{$("#confirmacion-cobro").hidden=true;$("#preparar-cobro").hidden=false;});

formCobro.addEventListener("submit",evento=>{
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(formCobro));
  if(datos.metodo !== "efectivo" && !/^\d{6,12}$/.test(datos.referencia || "")){alert("Ingresa el número de voucher u operación de 6 a 12 dígitos.");return;}
  if(datos.metodo === "efectivo" && Number(datos.monto_recibido) < Number(registroEnCobro.monto_calculado)){alert("El monto recibido es menor que el total.");return;}
  datosCobroPendientes = datos;
  const medio = datos.metodo === "efectivo" ? `efectivo · recibido ${formatearSoles(Number(datos.monto_recibido))}` : `${datos.metodo} · referencia ${datos.referencia}`;
  $("#texto-confirmacion-cobro").textContent = `${registroEnCobro.codigo_seguimiento} · ${formatearSoles(Number(registroEnCobro.monto_calculado))} · ${medio}`;
  $("#confirmacion-cobro").hidden = false;
  $("#preparar-cobro").hidden = true;
});

$("#ejecutar-cobro").addEventListener("click",async()=>{
  if(!datosCobroPendientes || !registroEnCobro) return;
  const botonConfirmar = $("#ejecutar-cobro");
  botonConfirmar.disabled = true;
  try{
    const {codigo,vuelto} = await cobrarPresencial({registro:registroEnCobro,opcion:datosCobroPendientes.metodo,montoRecibido:Number(datosCobroPendientes.monto_recibido),referencia:datosCobroPendientes.referencia});
    dialogo.close();
    window.open(`comprobante.html?op=${encodeURIComponent(codigo)}`,"_blank");
    $("#aviso-nuevos").textContent = `Cobro registrado. Operación ${codigo}${vuelto !== null ? ` · vuelto ${formatearSoles(vuelto)}` : ""}.`;
    await Promise.all([pintarPendientes($("#criterio").value),refrescar()]);
  }catch(error){
    $("#aviso-nuevos").textContent = error?.code === "23505" ? "Esta solicitud ya fue pagada." : (error.message || "No se pudo registrar el cobro.");
  }finally{
    datosCobroPendientes = null;
    botonConfirmar.disabled = false;
  }
});

async function pintarPagosEnLinea(){
  const pagos = await listarPagosEnLinea(inputFecha.value,chkPorVerificar.checked);
  tablaEnLinea.replaceChildren();
  if(!pagos.length) filaVacia(tablaEnLinea,8,"Sin operaciones en línea para esta fecha.");
  for(const p of pagos){
    const tr = document.createElement("tr");
    if(p.estado === "rechazado") tr.className = "fila-rechazada";
    celda(tr,new Date(p.fecha_pago).toLocaleTimeString("es-PE",{timeZone:"America/Lima",hour:"2-digit",minute:"2-digit"}));
    celda(tr,p.codigo_operacion);
    celda(tr,p.codigo_seguimiento);
    celda(tr,p.cliente || "—");
    celda(tr,describirMedio(p));
    celda(tr,formatearSoles(Number(p.monto)));
    celda(tr,p.estado === "aprobado" ? "Aprobado" : `Rechazado: ${p.motivo_rechazo}`);
    const tdAccion = celda(tr);
    if(p.estado === "aprobado" && !p.verificado) tdAccion.append(boton("Verificar","verificar",p.id));
    else if(p.verificado) tdAccion.textContent = `Verificado por ${p.verificador || "usuario"}`;
    else tdAccion.textContent = "—";
    tablaEnLinea.append(tr);
  }
  const idsAprobados = pagos.filter(p=>p.estado === "aprobado").map(p=>Number(p.id));
  const maxId = idsAprobados.length ? Math.max(...idsAprobados) : 0;
  if(ultimoIdVisto !== null && maxId > ultimoIdVisto){
    const nuevos = idsAprobados.filter(id=>id>ultimoIdVisto).length;
    $("#aviso-nuevos").textContent = `Ingresaron ${nuevos} pago(s) nuevo(s) por la pasarela.`;
  }
  ultimoIdVisto = Math.max(ultimoIdVisto ?? 0,maxId);
}

tablaEnLinea.addEventListener("click",evento=>{
  const b = evento.target.closest('button[data-accion="verificar"]');
  if(!b) return;
  idPagoPorVerificar = Number(b.dataset.id);
  dialogoVerificacion.showModal();
});

$("#cancelar-verificacion").addEventListener("click",()=>{idPagoPorVerificar=null;dialogoVerificacion.close();});
$("#confirmar-verificacion").addEventListener("click",async()=>{
  if(!idPagoPorVerificar) return;
  const b = $("#confirmar-verificacion");
  b.disabled = true;
  try{await verificarPago(idPagoPorVerificar);dialogoVerificacion.close();idPagoPorVerificar=null;await pintarPagosEnLinea();}
  finally{b.disabled=false;}
});

async function pintarResumen(){
  const filas = await resumenDelDia(inputFecha.value);
  tablaResumen.replaceChildren();
  let total = 0;
  if(!filas.length) filaVacia(tablaResumen,4,"Sin cobros aprobados para esta fecha.");
  for(const f of filas){
    const tr = document.createElement("tr");
    celda(tr,f.canal === "pasarela" ? "En línea" : "Ventanilla");
    celda(tr,f.metodo);
    celda(tr,String(f.operaciones));
    celda(tr,formatearSoles(Number(f.total)));
    tablaResumen.append(tr);
    total += Number(f.total);
  }
  $("#total-dia").textContent = formatearSoles(redondear(total));
}

async function refrescar(){
  await Promise.all([pintarPagosEnLinea(),pintarResumen()]);
  reiniciarBarra();
}

inputFecha.addEventListener("change",()=>{ultimoIdVisto=null;refrescar().catch(()=>{});});
chkPorVerificar.addEventListener("change",()=>refrescar().catch(()=>{}));
setInterval(()=>{if(!document.hidden) refrescar().catch(()=>{});},15000);
setInterval(actualizarRelojes,1000);
actualizarRelojes();
pintarPendientes().catch(error=>filaVacia(tablaPendientes,6,error.message));
refrescar().catch(error=>$("#aviso-nuevos").textContent=error.message);
