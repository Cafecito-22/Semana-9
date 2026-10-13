import { sql, verificarConexion } from "../config/neon-config.js";

function normalizarUsuario(usuario){
  if(!usuario) return null;
  return {...usuario,rol:usuario.rol || "cliente"};
}

export async function registrarUsuario(nombre,correo,contrasena,dni){
  verificarConexion();
  const filas = await sql("q3", [nombre, correo, contrasena, dni]);
  const usuario = normalizarUsuario(filas[0]);
  sessionStorage.setItem("usuario",JSON.stringify(usuario));
  return usuario;
}

export async function iniciarSesion(correo,contrasena){
  verificarConexion();
  const filas = await sql("q4", [correo, contrasena]);
  if(!filas.length) return null;
  const usuario = normalizarUsuario(filas[0]);
  sessionStorage.setItem("usuario",JSON.stringify(usuario));
  return usuario;
}

export function obtenerUsuario(){
  const dato = sessionStorage.getItem("usuario");
  if(!dato) return null;
  try{return normalizarUsuario(JSON.parse(dato));}catch{return null;}
}

export function rutaInicioSegunRol(rol){
  const rutas = {cliente:"cuenta.html",administrador:"panel.html",empleado:"panel.html",cajero:"caja.html"};
  return rutas[rol] ?? "index.html";
}

export function destinoPorRol(usuario){
  return usuario ? rutaInicioSegunRol(usuario.rol) : "login.html";
}

export function exigirSesion(rolesPermitidos=[]){
  const usuario = obtenerUsuario();
  if(!usuario){
    const retorno = encodeURIComponent(location.pathname.split("/").pop()+location.search);
    location.href = `login.html?retorno=${retorno}`;
    return null;
  }
  const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
  if(roles.length && !roles.includes(usuario.rol)){
    location.href = rutaInicioSegunRol(usuario.rol);
    return null;
  }
  return usuario;
}

export function exigirRol(...rolesPermitidos){
  const roles = rolesPermitidos.flat().filter(Boolean);
  return exigirSesion(roles);
}

export async function cerrarSesion(){
  await fetch("/api/database",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({logout:true})});
  sessionStorage.removeItem("usuario");
  location.href = "login.html";
}

