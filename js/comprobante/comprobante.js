import { sql } from "../config/neon-config.js";
import { exigirSesion, cerrarSesion, destinoPorRol } from "../auth/auth.js";
import { formatearSoles } from "../registro/tarifario.js";

const usuario = exigirSesion();
if(!usuario) throw new Error("Sin sesión");

document.getElementById("nombre-sesion").textContent = usuario.nombre;
document.getElementById("boton-cerrar-sesion")?.addEventListener("click",cerrarSesion);
document.getElementById("volver-zona").href = destinoPorRol(usuario);
document.getElementById("volver-zona-secundario").href = destinoPorRol(usuario);

const nombresMetodo = {tarjeta_debito:"Tarjeta de débito",tarjeta_credito:"Tarjeta de crédito",billetera:"Billetera electrónica",efectivo:"Efectivo",pos:"Tarjeta en POS"};
const contenedor = document.getElementById("comprobante");
const op = new URLSearchParams(location.search).get("op");

function agregarDato(lista,etiqueta,valor){
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = etiqueta;
  dd.textContent = valor ?? "—";
  lista.append(dt,dd);
}

async function cargar(){
  if(!op){
    contenedor.textContent = "No se indicó una operación.";
    return;
  }
  const filas = await sql("q11", [op]);
  const pago = filas[0];
  if(!pago || (usuario.rol === "cliente" && Number(pago.id_usuario) !== Number(usuario.id))){
    contenedor.textContent = "Comprobante no encontrado.";
    return;
  }
  const dl = document.createElement("dl");
  agregarDato(dl,"N.° de operación",pago.codigo_operacion);
  agregarDato(dl,"Solicitud",pago.codigo_seguimiento);
  agregarDato(dl,"Cliente",pago.cliente ?? "Atención presencial");
  agregarDato(dl,"Régimen",({nrus:"NRUS",mype:"MYPE Tributario",general:"Régimen General"}[pago.regimen] || pago.regimen));
  agregarDato(dl,"Canal",pago.canal === "pasarela" ? "Pago en línea" : "Ventanilla");
  agregarDato(dl,"Medio",`${nombresMetodo[pago.metodo] || pago.metodo} ${pago.marca_tarjeta ?? pago.proveedor_billetera ?? ""} ${pago.referencia ?? ""}`.trim());
  agregarDato(dl,"Importe",formatearSoles(Number(pago.monto)));
  if(pago.metodo === "efectivo"){
    agregarDato(dl,"Recibido",formatearSoles(Number(pago.monto_recibido)));
    agregarDato(dl,"Vuelto",formatearSoles(Number(pago.vuelto)));
  }
  if(pago.cajero) agregarDato(dl,"Atendido por",pago.cajero);
  agregarDato(dl,"Fecha y hora",new Date(pago.fecha_pago).toLocaleString("es-PE",{timeZone:"America/Lima"}));
  contenedor.replaceChildren(dl);
}

document.getElementById("imprimir").addEventListener("click",()=>window.print());
cargar().catch(error=>contenedor.textContent=error.message);
