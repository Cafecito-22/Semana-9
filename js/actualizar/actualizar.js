import { sql } from "../config/neon-config.js";
import { exigirRol, cerrarSesion } from "../auth/auth.js";
import { calcularMontoServicio, formatearSoles } from "../registro/tarifario.js";

const usuario = exigirRol("cliente");
if(!usuario) throw new Error("Acceso denegado");

document.getElementById("nombre-sesion").textContent = usuario.nombre;
document.getElementById("boton-cerrar-sesion")?.addEventListener("click",cerrarSesion);
const id = Number(new URLSearchParams(location.search).get("id"));
const formulario = document.getElementById("form-actualizar");
const montoSalida = document.getElementById("monto-actualizado");

function actualizarMonto(){
  const datos = Object.fromEntries(new FormData(formulario));
  montoSalida.textContent = formatearSoles(calcularMontoServicio(datos));
}

async function cargar(){
  const mensaje = document.getElementById("mensaje-actualizar");
  if(!Number.isInteger(id) || id<=0){
    mensaje.textContent = "No se indicó una solicitud válida.";
    mensaje.className = "mensaje error";
    formulario.classList.add("oculto");
    return;
  }
  const filas = await sql("q1", [id, usuario.id]);
  if(!filas.length){
    mensaje.textContent = "La solicitud no existe o no pertenece a tu cuenta.";
    mensaje.className = "mensaje error";
    formulario.classList.add("oculto");
    return;
  }
  const fila = filas[0];
  document.getElementById("codigo").textContent = fila.codigo_seguimiento;
  document.getElementById("estado").textContent = `${fila.estado} / pago ${fila.estado_pago}`;
  if(fila.estado !== "registrado" || fila.estado_pago === "pagado"){
    mensaje.textContent = fila.estado_pago === "pagado" ? "Esta solicitud ya fue pagada y no puede modificarse." : "Esta solicitud ya fue atendida y es de solo lectura.";
    mensaje.className = "mensaje error";
    formulario.classList.add("oculto");
    return;
  }
  document.getElementById("nombre").value = fila.nombre_contribuyente || "";
  document.getElementById("ruc").value = fila.ruc || "";
  document.getElementById("correo").value = fila.correo || "";
  document.getElementById("regimen").value = fila.regimen || "nrus";
  actualizarMonto();
}

formulario.addEventListener("input",actualizarMonto);
formulario.addEventListener("change",actualizarMonto);
formulario.addEventListener("submit",async evento=>{
  evento.preventDefault();
  const mensaje = document.getElementById("mensaje-actualizar");
  const datos = Object.fromEntries(new FormData(evento.currentTarget));
  const nombre = String(datos.nombre||"").trim();
  const ruc = String(datos.ruc||"").trim();
  const correo = String(datos.correo||"").trim().toLowerCase();
  const regimen = String(datos.regimen||"");
  if(nombre.length<3 || !/^\d{11}$/.test(ruc) || !correo.includes("@") || !["nrus","mype","general"].includes(regimen)){
    mensaje.textContent = "Revisa los datos antes de guardar.";
    mensaje.className = "mensaje error";
    return;
  }
  const monto = calcularMontoServicio({regimen});
  const resultado = await sql("q2", [nombre, ruc, correo, regimen, monto, id, usuario.id]);
  if(!resultado.length){
    mensaje.textContent = "La solicitud ya no puede modificarse.";
    mensaje.className = "mensaje error";
    return;
  }
  mensaje.textContent = "Cambios y monto actualizados correctamente.";
  mensaje.className = "mensaje ok";
  setTimeout(()=>location.href="consulta.html",550);
});

cargar().catch(error=>{
  const mensaje = document.getElementById("mensaje-actualizar");
  mensaje.textContent = error.message;
  mensaje.className = "mensaje error";
});
