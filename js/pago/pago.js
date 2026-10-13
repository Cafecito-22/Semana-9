import { exigirRol, cerrarSesion } from "../auth/auth.js";
import { formatearSoles } from "../registro/tarifario.js";
import { formatearNumeroTarjeta, formatearVencimiento, detectarMarca, validarFormularioTarjeta, validarCelular, validarCodigoAprobacion, validarLuhn, soloDigitos } from "./validaciones.js";
import { obtenerRegistro, listarPendientesCliente, pagarConTarjeta, pagarConBilletera } from "./pasarela.js";

const usuario = exigirRol("cliente");
if(!usuario) throw new Error("Acceso denegado");

document.getElementById("nombre-sesion").textContent = usuario.nombre;
document.getElementById("boton-cerrar-sesion")?.addEventListener("click",cerrarSesion);

const selectRegistro = document.getElementById("registro");
const resumenMonto = document.getElementById("resumen-monto");
const resumenRegimen = document.getElementById("resumen-regimen");
const mensaje = document.getElementById("mensaje-pago");
const formTarjeta = document.getElementById("form-tarjeta");
const formBilletera = document.getElementById("form-billetera");
const zonaTarjeta = document.getElementById("zona-tarjeta");
const inputNumero = document.getElementById("numero");
const inputVenc = document.getElementById("vencimiento");
const inputCvv = document.getElementById("cvv");
const inputTitular = document.getElementById("titular");
const marcaDetectada = document.getElementById("marca-detectada");
const tarjetaPreview = document.getElementById("tarjeta-preview");
const previewNumero = document.getElementById("preview-numero");
const previewMarca = document.getElementById("preview-marca");
const previewTitular = document.getElementById("preview-titular");
const previewVenc = document.getElementById("preview-venc");
const previewCvv = document.getElementById("preview-cvv");
const luhnEstado = document.getElementById("luhn-estado");
const luhnDigitos = document.getElementById("luhn-digitos");
const flujo = [...document.querySelectorAll("#flujo-pago li")];
let registroActual = null;
let ultimoPaso = 1;

const pruebas = {
  "visa-ok":{numero:"4111111111111111",vencimiento:"12/29",cvv:"123",titular:"ANA TORRES QUISPE"},
  "sin-saldo":{numero:"4000000000000002",vencimiento:"08/28",cvv:"456",titular:"LUIS PEREZ ROJAS"},
  "master-ok":{numero:"5555555555554444",vencimiento:"05/30",cvv:"789",titular:"MARIA HUAMAN SOTO"},
  "bloqueada":{numero:"5105105105105100",vencimiento:"03/27",cvv:"321",titular:"JORGE LIMA CRUZ"},
  "amex":{numero:"378282246310005",vencimiento:"11/28",cvv:"1234",titular:"MARIA HUAMAN SOTO"},
  "vencida":{numero:"4242424242424242",vencimiento:"01/25",cvv:"111",titular:"ROSA CCENCHO VEGA"},
  "cvv-mal":{numero:"4111111111111111",vencimiento:"12/29",cvv:"999",titular:"ANA TORRES QUISPE"}
};

function mostrarMensaje(texto,tipo=""){
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`.trim();
}

function mostrarError(campo,texto=""){
  const error = document.getElementById(`error-${campo}`);
  const input = document.getElementById(campo);
  if(error) error.textContent = texto;
  if(input) input.setAttribute("aria-invalid",texto ? "true" : "false");
}

function resetFlujo(){
  ultimoPaso = 1;
  flujo.forEach(li=>li.removeAttribute("data-estado"));
}

function pasoFlujo(paso,estado){
  ultimoPaso = paso;
  for(const li of flujo){
    const n = Number(li.dataset.paso);
    if(n < paso) li.dataset.estado = "ok";
    else if(n === paso) li.dataset.estado = estado;
    else li.removeAttribute("data-estado");
  }
}

function flujoDesdePasarela(estado){
  if(estado === "consulta") pasoFlujo(2,"activo");
  if(estado === "reglas") pasoFlujo(3,"activo");
  if(estado === "transaccion") pasoFlujo(4,"activo");
  if(estado === "aprobado") flujo.forEach(li=>li.dataset.estado="ok");
  if(estado === "rechazado") pasoFlujo(ultimoPaso,"error");
}

function actualizarLuhn(){
  const digitos = soloDigitos(inputNumero.value);
  luhnDigitos.replaceChildren();
  if(!digitos){
    luhnEstado.textContent = "Escribe una tarjeta";
    luhnEstado.className = "";
    return;
  }
  let duplicar = false;
  let suma = 0;
  const resultados = [];
  for(let i=digitos.length-1;i>=0;i--){
    const original = Number(digitos[i]);
    let valor = original;
    if(duplicar){
      valor *= 2;
      if(valor > 9) valor -= 9;
    }
    resultados.unshift({original,valor,duplicar});
    suma += valor;
    duplicar = !duplicar;
  }
  resultados.forEach(item=>{
    const caja = document.createElement("span");
    caja.className = item.duplicar ? "luhn-digito doble" : "luhn-digito";
    caja.textContent = item.duplicar ? `${item.original}→${item.valor}` : String(item.original);
    luhnDigitos.append(caja);
  });
  const valido = digitos.length >= 13 && digitos.length <= 19 && validarLuhn(digitos);
  luhnEstado.textContent = valido ? `Válida · suma ${suma}` : `Aún no válida · suma ${suma}`;
  luhnEstado.className = valido ? "luhn-ok" : "luhn-mal";
}

function actualizarPreview(){
  const marca = detectarMarca(inputNumero.value);
  const numero = formatearNumeroTarjeta(inputNumero.value);
  tarjetaPreview.dataset.marca = marca || "";
  previewMarca.textContent = marca || "TARJETA";
  previewNumero.textContent = numero || "•••• •••• •••• ••••";
  previewTitular.textContent = inputTitular.value.trim().toUpperCase() || "NOMBRE APELLIDO";
  previewVenc.textContent = inputVenc.value || "MM/AA";
  previewCvv.textContent = inputCvv.value ? "•".repeat(inputCvv.value.length) : "•••";
  marcaDetectada.textContent = marca ?? "";
  actualizarLuhn();
}

async function cargarPendientes(){
  const pendientes = await listarPendientesCliente(usuario.id);
  selectRegistro.replaceChildren();
  if(!pendientes.length){
    mostrarMensaje("No tienes solicitudes pendientes de pago.","info");
    zonaTarjeta.hidden = true;
    formBilletera.hidden = true;
    document.getElementById("metodos-pago").hidden = true;
    resumenMonto.textContent = "—";
    return;
  }
  for(const p of pendientes){
    const opcion = document.createElement("option");
    opcion.value = p.id;
    opcion.textContent = `${p.codigo_seguimiento} — ${formatearSoles(Number(p.monto_calculado))}`;
    selectRegistro.append(opcion);
  }
  const idUrl = new URLSearchParams(location.search).get("id");
  if(idUrl && pendientes.some(p => String(p.id) === idUrl)) selectRegistro.value = idUrl;
  await seleccionarRegistro();
}

async function seleccionarRegistro(){
  registroActual = await obtenerRegistro(Number(selectRegistro.value),usuario.id);
  resumenMonto.textContent = registroActual ? formatearSoles(Number(registroActual.monto_calculado)) : "—";
  resumenRegimen.textContent = registroActual ? ({nrus:"NRUS",mype:"MYPE Tributario",general:"Régimen General"}[registroActual.regimen] || registroActual.regimen) : "—";
  resetFlujo();
}

function mostrarMetodo(){
  const metodo = document.querySelector('input[name="metodo"]:checked')?.value || "tarjeta";
  zonaTarjeta.hidden = metodo !== "tarjeta";
  formBilletera.hidden = metodo !== "billetera";
  resetFlujo();
}

inputNumero.addEventListener("input",()=>{
  inputNumero.value = formatearNumeroTarjeta(inputNumero.value);
  actualizarPreview();
});
inputVenc.addEventListener("input",()=>{
  inputVenc.value = formatearVencimiento(inputVenc.value);
  actualizarPreview();
});
inputTitular.addEventListener("input",actualizarPreview);
inputCvv.addEventListener("input",actualizarPreview);
inputCvv.addEventListener("focus",()=>tarjetaPreview.classList.add("volteada"));
inputCvv.addEventListener("blur",()=>tarjetaPreview.classList.remove("volteada"));

document.querySelectorAll("[data-prueba]").forEach(b=>b.addEventListener("click",()=>{
  const d = pruebas[b.dataset.prueba];
  inputNumero.value = formatearNumeroTarjeta(d.numero);
  inputVenc.value = d.vencimiento;
  inputCvv.value = d.cvv;
  inputTitular.value = d.titular;
  actualizarPreview();
}));

async function procesar(formulario,operacion){
  if(!registroActual || registroActual.estado_pago !== "pendiente"){
    mostrarMensaje("Selecciona una solicitud pendiente de pago.","error");
    return;
  }
  const boton = formulario.querySelector('button[type="submit"]');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Procesando...";
  mostrarMensaje("Conectando con la entidad emisora...","info");
  try{
    const resultado = await operacion();
    if(resultado.aprobado){
      mostrarMensaje(`Pago aprobado. Operación ${resultado.codigo}.`,"ok");
      setTimeout(()=>location.href=`comprobante.html?op=${encodeURIComponent(resultado.codigo)}`,900);
    }else{
      mostrarMensaje(`Pago rechazado: ${resultado.motivo}`,"error");
    }
  }catch{
    flujoDesdePasarela("rechazado");
    mostrarMensaje("No se pudo procesar el pago. Revisa tu conexión.","error");
  }finally{
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

formTarjeta.addEventListener("submit",async evento=>{
  evento.preventDefault();
  resetFlujo();
  pasoFlujo(1,"activo");
  const datos = Object.fromEntries(new FormData(formTarjeta));
  const {valido,errores,marca,venc} = validarFormularioTarjeta(datos);
  ["numero","vencimiento","cvv","titular"].forEach(campo=>mostrarError(campo,errores[campo] || ""));
  if(!valido){
    pasoFlujo(1,"error");
    mostrarMensaje("Corrige los datos marcados antes de continuar.","error");
    return;
  }
  pasoFlujo(1,"ok");
  await procesar(formTarjeta,()=>pagarConTarjeta({registro:registroActual,usuario,numero:datos.numero,mes:venc.mes,anio:venc.anio,cvv:datos.cvv,marca,onEstado:flujoDesdePasarela}));
});

formBilletera.addEventListener("submit",async evento=>{
  evento.preventDefault();
  resetFlujo();
  pasoFlujo(1,"activo");
  const datos = Object.fromEntries(new FormData(formBilletera));
  const celularOk = validarCelular(datos.celular);
  const codigoOk = validarCodigoAprobacion(datos.codigo);
  mostrarError("celular",celularOk ? "" : "Celular de 9 dígitos que empiece con 9.");
  mostrarError("codigo",codigoOk ? "" : "El código tiene 6 dígitos.");
  if(!celularOk || !codigoOk){
    pasoFlujo(1,"error");
    return;
  }
  pasoFlujo(1,"ok");
  await procesar(formBilletera,()=>pagarConBilletera({registro:registroActual,usuario,proveedor:datos.proveedor,celular:datos.celular,codigoAprobacion:datos.codigo,onEstado:flujoDesdePasarela}));
});

document.querySelectorAll('input[name="metodo"]').forEach(radio=>radio.addEventListener("change",mostrarMetodo));
selectRegistro.addEventListener("change",seleccionarRegistro);
mostrarMetodo();
actualizarPreview();
cargarPendientes().catch(error=>mostrarMensaje(error.message,"error"));
