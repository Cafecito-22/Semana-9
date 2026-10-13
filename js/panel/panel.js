import { sql } from "../config/neon-config.js";
import { exigirRol, cerrarSesion } from "../auth/auth.js";
import { calcularMontoServicio, formatearSoles } from "../registro/tarifario.js";

const usuario = exigirRol("administrador","empleado");
if(!usuario) throw new Error("Acceso denegado");
const esAdmin = usuario.rol === "administrador";
document.body.classList.add(esAdmin ? "modo-admin" : "modo-empleado");

document.getElementById("nombre-panel").textContent = usuario.nombre;
document.getElementById("correo-panel").textContent = usuario.correo;
document.getElementById("rol-panel").textContent = esAdmin ? "Jefe / Administrador" : "Trabajador / Empleado";
document.getElementById("titulo-panel").textContent = esAdmin ? "Panel de jefatura" : "Panel de empleado";
document.getElementById("descripcion-panel").textContent = esAdmin ? "CRUD completo, control de pagos y horario del personal." : "CRUD completo de solicitudes y seguimiento de estados de pago.";
document.getElementById("imagen-rol").src = esAdmin ? "img/jefatura-sunat.jpg" : "img/equipo-sunat.jpg";
document.getElementById("texto-lateral").textContent = esAdmin ? "Gestiona todas las solicitudes, revisa pagos y consulta el horario semanal de empleados." : "Puedes crear, consultar, actualizar y eliminar solicitudes. El horario general queda reservado a jefatura.";
document.querySelectorAll(".solo-admin").forEach(elemento=>elemento.classList.toggle("oculto",!esAdmin));
document.getElementById("permiso-crear").textContent = "Crear solicitudes";
document.getElementById("permiso-editar").textContent = "Editar solicitudes";
document.getElementById("permiso-eliminar").textContent = "Eliminar si no tiene pagos";
document.getElementById("boton-cerrar-sesion")?.addEventListener("click",cerrarSesion);

function escapar(valor){
  return String(valor ?? "").replace(/[&<>"']/g,caracter=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[caracter]));
}

function etiquetaEstado(estado){
  const valor = estado || "registrado";
  return `<span class="estado estado-${escapar(valor)}">${escapar(valor.replace("_"," "))}</span>`;
}

function textoRegimen(regimen){
  return {nrus:"NRUS",mype:"MYPE",general:"General"}[regimen] || regimen || "—";
}

const turnos = {
  manana:{clave:"manana",nombre:"Mañana",horario:"06:00–14:00"},
  tarde:{clave:"tarde",nombre:"Tarde",horario:"14:00–22:00"},
  noche:{clave:"noche",nombre:"Noche",horario:"22:00–06:00"}
};
let empleadosHorario = [];

function normalizarTurno(valor){
  return String(valor||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

function partesLima(){
  const formato = new Intl.DateTimeFormat("en-US",{timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  const partes = Object.fromEntries(formato.formatToParts(new Date()).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  return {year:Number(partes.year),month:Number(partes.month),day:Number(partes.day),hour:Number(partes.hour),minute:Number(partes.minute),second:Number(partes.second)};
}

function turnoPorHora(hora){
  if(hora>=6 && hora<14) return "manana";
  if(hora>=14 && hora<22) return "tarde";
  return "noche";
}

function fechaUtcDesdeLima(partes){
  return new Date(Date.UTC(partes.year,partes.month-1,partes.day,12));
}

function inicioSemanaLima(){
  const hoy = fechaUtcDesdeLima(partesLima());
  const dia = hoy.getUTCDay();
  const retroceso = dia===0 ? 6 : dia-1;
  const lunes = new Date(hoy);
  lunes.setUTCDate(hoy.getUTCDate()-retroceso);
  return lunes;
}

function nombreEmpleado(empleado){
  return `<div class="empleado-turno"><strong>${escapar(empleado.nombre)}</strong><span>${escapar(empleado.correo)}</span></div>`;
}

function actualizarTurnoActual(){
  if(!esAdmin) return;
  const partes = partesLima();
  const clave = turnoPorHora(partes.hour);
  const turno = turnos[clave];
  const activos = empleadosHorario.filter(e=>normalizarTurno(e.turno)===clave);
  const contenedor = document.getElementById("turno-actual");
  const hora = `${String(partes.hour).padStart(2,"0")}:${String(partes.minute).padStart(2,"0")}:${String(partes.second).padStart(2,"0")}`;
  const fecha = new Intl.DateTimeFormat("es-PE",{timeZone:"America/Lima",weekday:"long",day:"2-digit",month:"long"}).format(new Date());
  document.getElementById("hora-turno").textContent = hora;
  document.getElementById("fecha-turno").textContent = fecha.charAt(0).toUpperCase()+fecha.slice(1);
  const nombres = activos.length ? activos.map(e=>e.nombre).join(", ") : "Sin empleado asignado";
  contenedor.className = `turno-actual turno-${clave}`;
  contenedor.innerHTML = `<div class="pulso-turno"></div><div><span>En turno ahora · ${turno.nombre} · ${turno.horario}</span><strong>${escapar(nombres)}</strong></div>`;
}

function renderizarHorarioSemanal(){
  if(!esAdmin) return;
  const contenedor = document.getElementById("horario-semanal");
  const sinTurno = document.getElementById("empleados-sin-turno");
  const grupos = {manana:[],tarde:[],noche:[]};
  const pendientes = [];
  empleadosHorario.forEach(empleado=>{
    const clave = normalizarTurno(empleado.turno);
    if(grupos[clave]) grupos[clave].push(empleado); else pendientes.push(empleado);
  });
  const hoyPartes = partesLima();
  const hoyClave = `${hoyPartes.year}-${String(hoyPartes.month).padStart(2,"0")}-${String(hoyPartes.day).padStart(2,"0")}`;
  const turnoActual = turnoPorHora(hoyPartes.hour);
  const lunes = inicioSemanaLima();
  const nombresDias = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
  contenedor.innerHTML = nombresDias.map((nombre,indice)=>{
    const fecha = new Date(lunes);
    fecha.setUTCDate(lunes.getUTCDate()+indice);
    const claveFecha = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth()+1).padStart(2,"0")}-${String(fecha.getUTCDate()).padStart(2,"0")}`;
    const fechaTexto = new Intl.DateTimeFormat("es-PE",{day:"2-digit",month:"short",timeZone:"UTC"}).format(fecha);
    const filas = Object.values(turnos).map(turno=>{
      const empleados = grupos[turno.clave];
      const activo = claveFecha===hoyClave && turno.clave===turnoActual ? " activo" : "";
      const personas = empleados.length ? empleados.map(nombreEmpleado).join("") : `<div class="empleado-turno vacante"><strong>Sin asignar</strong><span>Disponible para asignación</span></div>`;
      return `<div class="fila-turno ${turno.clave}${activo}"><div class="hora-bloque"><strong>${turno.nombre}</strong><span>${turno.horario}</span></div><div class="personas-turno">${personas}</div></div>`;
    }).join("");
    return `<article class="dia-horario${claveFecha===hoyClave ? " hoy" : ""}"><div class="dia-titulo"><strong>${nombre}</strong><span>${fechaTexto}</span></div>${filas}</article>`;
  }).join("");
  if(pendientes.length){
    sinTurno.classList.remove("oculto");
    sinTurno.innerHTML = `<strong>Empleados sin turno asignado:</strong> ${pendientes.map(e=>escapar(e.nombre)).join(", ")}`;
  }else{
    sinTurno.classList.add("oculto");
    sinTurno.innerHTML = "";
  }
}

async function cargarHorario(){
  if(!esAdmin) return;
  const contenedor = document.getElementById("horario-semanal");
  try{
    empleadosHorario = await sql("q22", []);
    renderizarHorarioSemanal();
    actualizarTurnoActual();
  }catch(error){
    contenedor.textContent = error.message;
  }
}

let registros = [];

async function listar(){
  const tbody = document.getElementById("tabla-panel");
  try{
    registros = await sql("q23", []);
    document.getElementById("stat-total").textContent = registros.length;
    document.getElementById("stat-pendiente-pago").textContent = registros.filter(r=>r.estado_pago==="pendiente").length;
    document.getElementById("stat-pagado").textContent = registros.filter(r=>r.estado_pago==="pagado").length;
    document.getElementById("stat-atendido").textContent = registros.filter(r=>r.estado==="atendido").length;
    if(!registros.length){
      tbody.innerHTML = `<tr><td colspan="10" class="vacio">No hay solicitudes registradas.</td></tr>`;
      return;
    }
    tbody.innerHTML = registros.map(fila=>{
      const acciones = `<div class="acciones-tabla"><button class="boton boton-claro boton-mini" data-editar="${fila.id}">Editar</button><button class="boton boton-peligro boton-mini" data-eliminar="${fila.id}">Eliminar</button></div>`;
      return `<tr><td><strong>${escapar(fila.codigo_seguimiento)}</strong></td><td>${escapar(fila.nombre_contribuyente)}</td><td>${escapar(fila.ruc)}</td><td>${escapar(textoRegimen(fila.regimen))}</td><td>${etiquetaEstado(fila.estado)}</td><td>${etiquetaEstado(fila.estado_pago)}</td><td>${escapar(formatearSoles(Number(fila.monto_calculado)))}</td><td>${escapar(fila.canal_pago || "—")}</td><td>${fila.fecha_registro ? new Date(fila.fecha_registro).toLocaleDateString("es-PE",{timeZone:"America/Lima"}) : "—"}</td><td>${acciones}</td></tr>`;
    }).join("");
  }catch(error){
    tbody.innerHTML = `<tr><td colspan="10" class="vacio">${escapar(error.message)}</td></tr>`;
  }
}

function abrirModal(id){document.getElementById(id).classList.remove("oculto");}
function cerrarModal(id){document.getElementById(id).classList.add("oculto");}
document.querySelectorAll("[data-cerrar-modal]").forEach(boton=>boton.addEventListener("click",()=>cerrarModal(boton.dataset.cerrarModal)));

function prepararNueva(){
  document.getElementById("form-admin").reset();
  document.getElementById("admin-id").value = "";
  document.getElementById("titulo-modal-admin").textContent = "Nueva solicitud";
  document.getElementById("admin-estado").value = "registrado";
  document.getElementById("admin-regimen").value = "nrus";
  document.getElementById("admin-regimen").disabled = false;
  document.getElementById("admin-aviso-pago").textContent = "Se creará con pago pendiente.";
  document.getElementById("admin-monto").textContent = formatearSoles(calcularMontoServicio({regimen:"nrus"}));
  abrirModal("modal-admin");
}

document.getElementById("nueva-solicitud")?.addEventListener("click",prepararNueva);

document.getElementById("admin-regimen")?.addEventListener("change",evento=>{
  document.getElementById("admin-monto").textContent = formatearSoles(calcularMontoServicio({regimen:evento.target.value}));
});

document.getElementById("tabla-panel")?.addEventListener("click",async evento=>{
  const editar = evento.target.closest("[data-editar]");
  const eliminar = evento.target.closest("[data-eliminar]");
  if(editar){
    const fila = registros.find(r=>Number(r.id)===Number(editar.dataset.editar));
    if(!fila) return;
    document.getElementById("admin-id").value = fila.id;
    document.getElementById("admin-nombre").value = fila.nombre_contribuyente || "";
    document.getElementById("admin-ruc").value = fila.ruc || "";
    document.getElementById("admin-correo").value = fila.correo || "";
    document.getElementById("admin-regimen").value = fila.regimen || "nrus";
    document.getElementById("admin-regimen").disabled = fila.estado_pago === "pagado";
    document.getElementById("admin-estado").value = fila.estado || "registrado";
    document.getElementById("admin-monto").textContent = formatearSoles(Number(fila.monto_calculado));
    document.getElementById("admin-aviso-pago").textContent = fila.estado_pago === "pagado" ? "La tarifa no cambia porque este registro ya está pagado." : `Estado de pago: ${fila.estado_pago || "pendiente"}.`;
    document.getElementById("titulo-modal-admin").textContent = `Editar ${fila.codigo_seguimiento}`;
    abrirModal("modal-admin");
  }
  if(eliminar){
    const id = Number(eliminar.dataset.eliminar);
    const fila = registros.find(r=>Number(r.id)===id);
    if(!fila) return;
    if(!confirm(`¿Eliminar definitivamente la solicitud ${fila.codigo_seguimiento}?`)) return;
    try{
      await sql("q24", [id]);
      await listar();
    }catch(error){
      alert(error?.code === "23503" ? 'No se puede eliminar: tiene historial de pagos. Cambia su estado operativo a "rechazado".' : error.message);
    }
  }
});

document.getElementById("form-admin")?.addEventListener("submit",async evento=>{
  evento.preventDefault();
  const datos = new FormData(evento.currentTarget);
  const id = Number(datos.get("id"));
  const nombre = String(datos.get("nombre")||"").trim();
  const ruc = String(datos.get("ruc")||"").trim();
  const correo = String(datos.get("correo")||"").trim().toLowerCase();
  const regimen = String(datos.get("regimen") || document.getElementById("admin-regimen").value || "nrus");
  const estado = String(datos.get("estado")||"registrado");
  const mensaje = document.getElementById("mensaje-admin");
  if(nombre.length<3 || !/^\d{11}$/.test(ruc) || !correo.includes("@") || !["nrus","mype","general"].includes(regimen)){
    mensaje.textContent = "Revisa los datos del formulario.";
    mensaje.className = "mensaje error";
    return;
  }
  const monto = calcularMontoServicio({regimen});
  if(id){
    await sql("q25", [nombre, ruc, correo, estado, regimen, monto, id]);
  }else{
    const codigo = `SOL-${Date.now().toString().slice(-8)}`;
    await sql("q26", [codigo, nombre, ruc, correo, regimen, monto, estado]);
  }
  mensaje.textContent = "Cambios guardados.";
  mensaje.className = "mensaje ok";
  setTimeout(async()=>{cerrarModal("modal-admin");mensaje.textContent="";await listar();},300);
});

listar();
if(esAdmin){
  cargarHorario();
  actualizarTurnoActual();
  setInterval(actualizarTurnoActual,1000);
}
