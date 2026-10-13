import { sql, verificarConexion } from "../config/neon-config.js";
import { exigirRol, cerrarSesion } from "../auth/auth.js";
import { calcularMontoServicio, formatearSoles } from "./tarifario.js";

const usuario = exigirRol("cliente");
if(!usuario) throw new Error("Acceso denegado");

document.getElementById("nombre-sesion").textContent = usuario.nombre;
const correoInput = document.getElementById("correo");
if(correoInput) correoInput.value = usuario.correo;
document.getElementById("boton-cerrar-sesion")?.addEventListener("click",cerrarSesion);

const form = document.getElementById("form-solicitud");
const salidaMonto = document.getElementById("monto-estimado");
const salidaTarifa = document.getElementById("detalle-tarifa");

function leerFormulario(){
  return Object.fromEntries(new FormData(form));
}

function actualizarCotizacion(){
  const datos = leerFormulario();
  const monto = calcularMontoServicio(datos);
  salidaMonto.textContent = formatearSoles(monto);
  const visual = document.getElementById("monto-estimado-visual");
  if(visual) visual.textContent = formatearSoles(monto);
  salidaTarifa.textContent = datos.regimen === "nrus" ? "NRUS: S/ 10.00" : "MYPE / Régimen General: S/ 25.00";
}

async function guardarSolicitud(datos){
  verificarConexion();
  const codigo = `SOL-${Date.now().toString().slice(-8)}`;
  const monto = calcularMontoServicio(datos);
  const filas = await sql("q27", [usuario.id, codigo, datos.nombre, datos.ruc, datos.correo, datos.regimen, monto]);
  return filas[0];
}

form.addEventListener("input",actualizarCotizacion);
form.addEventListener("change",actualizarCotizacion);
form.addEventListener("submit",async evento=>{
  evento.preventDefault();
  const mensaje = document.getElementById("mensaje-solicitud");
  const boton = document.getElementById("guardar-solicitud");
  const datos = leerFormulario();
  datos.nombre = String(datos.nombre||"").trim();
  datos.ruc = String(datos.ruc||"").trim();
  datos.correo = String(datos.correo||"").trim().toLowerCase();
  if(datos.nombre.length<3 || !/^\d{11}$/.test(datos.ruc) || !datos.correo.includes("@") || !["nrus","mype","general"].includes(datos.regimen)){
    mensaje.textContent = "Revisa los datos del formulario.";
    mensaje.className = "mensaje error";
    return;
  }
  boton.disabled = true;
  boton.textContent = "Registrando...";
  try{
    const creado = await guardarSolicitud(datos);
    document.getElementById("codigo-generado").textContent = creado.codigo_seguimiento;
    document.getElementById("monto-generado").textContent = formatearSoles(Number(creado.monto_calculado));
    document.getElementById("pagar-ahora").href = `pago.html?id=${creado.id}`;
    document.getElementById("confirmacion").classList.remove("oculto");
    mensaje.textContent = "Solicitud registrada correctamente. El pago está pendiente.";
    mensaje.className = "mensaje ok";
  }catch(error){
    mensaje.textContent = error.message;
    mensaje.className = "mensaje error";
  }finally{
    boton.disabled = false;
    boton.textContent = "Registrar solicitud";
  }
});

actualizarCotizacion();
