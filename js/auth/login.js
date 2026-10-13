import { registrarUsuario, iniciarSesion, obtenerUsuario, destinoPorRol, cerrarSesion } from "./auth.js";

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel-auth");
const zonaAuth = document.getElementById("zona-auth");
const sesionActiva = document.getElementById("sesion-activa");
const usuarioActual = obtenerUsuario();

function abrirPanel(nombre){
  tabs.forEach(tab=>tab.classList.toggle("activo",tab.dataset.panel===nombre));
  panels.forEach(panel=>panel.classList.toggle("activo",panel.id===`panel-${nombre}`));
}

tabs.forEach(tab=>tab.addEventListener("click",()=>abrirPanel(tab.dataset.panel)));

if(usuarioActual){
  zonaAuth.classList.add("oculto");
  sesionActiva.classList.remove("oculto");
  document.getElementById("sesion-nombre").textContent = usuarioActual.nombre;
  document.getElementById("sesion-correo").textContent = usuarioActual.correo;
  const etiquetas = {administrador:"Jefe / Administrador",empleado:"Trabajador / Empleado",cajero:"Cajero",cliente:"Cliente / Contribuyente"};
  document.getElementById("sesion-rol").textContent = etiquetas[usuarioActual.rol] || usuarioActual.rol;
  document.getElementById("continuar-sesion").addEventListener("click",()=>location.href=destinoPorRol(usuarioActual));
  document.getElementById("cerrar-sesion-login").addEventListener("click",cerrarSesion);
}

document.getElementById("form-login")?.addEventListener("submit",async evento=>{
  evento.preventDefault();
  const mensaje = document.getElementById("mensaje-login");
  const datos = new FormData(evento.currentTarget);
  mensaje.textContent = "Verificando cuenta...";
  mensaje.className = "mensaje";
  try{
    const usuario = await iniciarSesion(String(datos.get("correo")||"").trim(),String(datos.get("contrasena")||""));
    if(!usuario){
      mensaje.textContent = "Correo o contraseña incorrectos.";
      mensaje.className = "mensaje error";
      return;
    }
    mensaje.textContent = `Bienvenido, ${usuario.nombre}.`;
    mensaje.className = "mensaje ok";
    const retorno = new URLSearchParams(location.search).get("retorno");
    setTimeout(()=>location.href=retorno || destinoPorRol(usuario),300);
  }catch(error){
    mensaje.textContent = error.message.includes("Failed") ? "No se pudo conectar con la base de datos." : error.message;
    mensaje.className = "mensaje error";
  }
});

document.getElementById("form-registro")?.addEventListener("submit",async evento=>{
  evento.preventDefault();
  const mensaje = document.getElementById("mensaje-registro");
  const datos = new FormData(evento.currentTarget);
  const nombre = String(datos.get("nombre")||"").trim();
  const dni = String(datos.get("dni")||"").trim();
  const correo = String(datos.get("correo")||"").trim().toLowerCase();
  const contrasena = String(datos.get("contrasena")||"");
  if(nombre.length<3 || !/^\d{8}$/.test(dni) || !correo.includes("@") || contrasena.length<4){
    mensaje.textContent = "Revisa nombre, DNI de 8 dígitos, correo y contraseña.";
    mensaje.className = "mensaje error";
    return;
  }
  mensaje.textContent = "Creando tu cuenta...";
  mensaje.className = "mensaje";
  try{
    const usuario = await registrarUsuario(nombre,correo,contrasena,dni);
    mensaje.textContent = `Cuenta creada. Bienvenido, ${usuario.nombre}.`;
    mensaje.className = "mensaje ok";
    setTimeout(()=>location.href=destinoPorRol(usuario),350);
  }catch(error){
    mensaje.textContent = /unique|duplicate/i.test(error.message) ? "Ese correo ya está registrado." : error.message;
    mensaje.className = "mensaje error";
  }
});
