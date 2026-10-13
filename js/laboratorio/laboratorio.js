import { exigirRol } from "../auth/auth.js";
import { calcularMontoServicio, formatearSoles } from "../registro/tarifario.js";
import { validarLuhn, soloDigitos, detectarMarca, formatearNumeroTarjeta, formatearVencimiento, validarCelular, validarCodigoAprobacion } from "../pago/validaciones.js";

const usuario = exigirRol("administrador");
if(!usuario) throw new Error("Acceso denegado");
const $ = s => document.querySelector(s);

function actualizarTarifa(){
  const regimen = $("#lab-regimen").value;
  $("#lab-monto").textContent = formatearSoles(calcularMontoServicio({regimen}));
}

function pintarLuhn(){
  const d = soloDigitos($("#lab-luhn").value);
  $("#lab-luhn").value = formatearNumeroTarjeta(d);
  const cont = $("#lab-luhn-digitos");
  cont.replaceChildren();
  let suma=0,duplicar=false;
  const partes=[];
  for(let i=d.length-1;i>=0;i--){let original=Number(d[i]),valor=original;if(duplicar){valor*=2;if(valor>9)valor-=9;}partes.unshift({original,valor,duplicar});suma+=valor;duplicar=!duplicar;}
  partes.forEach(x=>{const s=document.createElement("span");if(x.duplicar)s.className="doble";s.textContent=x.duplicar?`${x.original}→${x.valor}`:String(x.original);cont.append(s);});
  $("#lab-luhn-estado").textContent = validarLuhn(d) ? `Válida · suma ${suma}` : `No válida · suma ${suma}`;
}

function actualizarCard(){
  const numero = formatearNumeroTarjeta($("#lab-card-num").value);
  $("#lab-card-num").value = numero;
  const marca = detectarMarca(numero) || "Tarjeta";
  $("#lab-marca").textContent = marca.toUpperCase();
  $("#lab-numero-card").textContent = numero || "•••• •••• •••• ••••";
  $("#lab-titular-card").textContent = $("#lab-card-titular").value.toUpperCase() || "NOMBRE APELLIDO";
  $("#lab-card-venc").textContent = $("#lab-card-venc").value || "MM/AA";
  $("#lab-cvv-card").textContent = "•".repeat($("#lab-card-cvv").value.length || 3);
}

function simularFlujo(aprobado){
  const pasos=[...document.querySelectorAll("#lab-flow span")];
  pasos.forEach(x=>x.className="");
  $("#lab-flow-msg").textContent="Procesando...";
  pasos.forEach((p,i)=>setTimeout(()=>{pasos.slice(0,i).forEach(x=>x.className="ok");p.className=i===2&&!aprobado?"error":"activo";if(i===3&&aprobado){pasos.forEach(x=>x.className="ok");$("#lab-flow-msg").textContent="COMMIT: pago aprobado y solicitud marcada como pagada.";}if(i===2&&!aprobado){$("#lab-flow-msg").textContent="Rechazado por reglas del emisor; se registra el intento y no se descuenta saldo.";}},i*450));
}

function validarWallet(){
  const cel=$("#lab-cel").value,cod=$("#lab-codigo").value;
  const ok=validarCelular(cel)&&validarCodigoAprobacion(cod);
  $("#lab-billetera-msg").textContent=ok?"Formato correcto. Ahora la pasarela consultaría saldo y código en la billetera simulada.":"Formato inválido: celular 9 dígitos iniciando en 9 y código de 6 dígitos.";
}

function actualizarVuelto(){
  const total=Number($("#lab-total").value)||0,rec=Number($("#lab-recibido").value)||0;
  $("#lab-vuelto").textContent=rec>=total?formatearSoles(rec-total):"Monto insuficiente";
}

function actualizarRelojes(){
  const n=new Date();
  $("#lab-lima").textContent=n.toLocaleTimeString("es-PE",{timeZone:"America/Lima",hour12:false});
  $("#lab-utc").textContent=n.toLocaleTimeString("es-PE",{timeZone:"UTC",hour12:false});
  const lima=n.toLocaleDateString("en-CA",{timeZone:"America/Lima"}),utc=n.toLocaleDateString("en-CA",{timeZone:"UTC"});
  $("#lab-lima-fecha").textContent=lima;$("#lab-utc-fecha").textContent=utc;
  $("#lab-zona-msg").textContent=lima===utc?"Las fechas coinciden ahora, pero el filtro de caja sigue usando America/Lima.":"Las fechas ya son distintas: filtrar por UTC ocultaría pagos de la noche en Lima.";
}

function pintarSeguridad(){
  const dato=$("#lab-xss").value;
  $("#lab-inseguro").innerHTML=dato;
  $("#lab-seguro").textContent=dato;
}

$("#lab-regimen").addEventListener("change",actualizarTarifa);
$("#lab-luhn").addEventListener("input",pintarLuhn);
["#lab-card-num","#lab-card-venc","#lab-card-cvv","#lab-card-titular"].forEach(id=>$(id).addEventListener("input",()=>{if(id==="#lab-card-venc")$(id).value=formatearVencimiento($(id).value);actualizarCard();}));
$("#lab-card-cvv").addEventListener("focus",()=>$("#lab-tarjeta").classList.add("flip"));
$("#lab-card-cvv").addEventListener("blur",()=>$("#lab-tarjeta").classList.remove("flip"));
$("#lab-aprobar").addEventListener("click",()=>simularFlujo(true));
$("#lab-rechazar").addEventListener("click",()=>simularFlujo(false));
$("#lab-validar-billetera").addEventListener("click",validarWallet);
$("#lab-total").addEventListener("input",actualizarVuelto);
$("#lab-recibido").addEventListener("input",actualizarVuelto);
$("#lab-xss").addEventListener("input",pintarSeguridad);
actualizarTarifa();pintarLuhn();actualizarCard();validarWallet();actualizarVuelto();actualizarRelojes();pintarSeguridad();setInterval(actualizarRelojes,1000);
