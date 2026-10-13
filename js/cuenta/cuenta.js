import { exigirSesion, cerrarSesion } from "../auth/auth.js";

const usuario = exigirSesion(["cliente"]);
if(usuario){
  document.getElementById("nombre-sesion").textContent = usuario.nombre;
  document.getElementById("bienvenida-nombre").textContent = usuario.nombre.split(" ")[0];
  document.getElementById("correo-cuenta").textContent = usuario.correo;
}
document.getElementById("boton-cerrar-sesion")?.addEventListener("click", cerrarSesion);
