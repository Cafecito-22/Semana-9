import { sql } from "../config/neon-config.js";
import { exigirRol, cerrarSesion } from "../auth/auth.js";
import { formatearSoles } from "../registro/tarifario.js";

const usuario = exigirRol("cliente");
if(!usuario) throw new Error("Acceso denegado");

document.getElementById("nombre-sesion").textContent = usuario.nombre;
document.getElementById("boton-cerrar-sesion")?.addEventListener("click",cerrarSesion);

function textoRegimen(regimen){
  return {nrus:"NRUS",mype:"MYPE",general:"General"}[regimen] || regimen || "—";
}

function etiqueta(texto,tipo){
  const span = document.createElement("span");
  span.className = `estado estado-${tipo}`;
  span.textContent = texto;
  return span;
}

function botonEnlace(texto,href,clase="boton-claro"){
  const a = document.createElement("a");
  a.className = `boton ${clase} boton-mini`;
  a.href = href;
  a.textContent = texto;
  return a;
}

function celda(tr,texto=""){
  const td = document.createElement("td");
  td.textContent = texto;
  tr.append(td);
  return td;
}

async function cargar(){
  const tbody = document.getElementById("tabla-solicitudes");
  try{
    const filas = await sql("q12", [usuario.id]);
    document.getElementById("total-solicitudes").textContent = filas.length;
    document.getElementById("total-pendientes").textContent = filas.filter(f=>f.estado_pago==="pendiente").length;
    document.getElementById("total-pagadas").textContent = filas.filter(f=>f.estado_pago==="pagado").length;
    tbody.replaceChildren();
    if(!filas.length){
      const tr = document.createElement("tr");
      const td = celda(tr,"Aún no tienes solicitudes registradas.");
      td.colSpan = 9;
      td.className = "vacio";
      tbody.append(tr);
      return;
    }
    for(const fila of filas){
      const tr = document.createElement("tr");
      const cCodigo = celda(tr);
      const strong = document.createElement("strong");
      strong.textContent = fila.codigo_seguimiento;
      cCodigo.append(strong);
      celda(tr,fila.nombre_contribuyente);
      celda(tr,fila.ruc);
      celda(tr,textoRegimen(fila.regimen));
      const cEstado = celda(tr);
      cEstado.append(etiqueta(fila.estado || "registrado",fila.estado || "registrado"));
      const cPago = celda(tr);
      cPago.append(etiqueta(fila.estado_pago || "pendiente",fila.estado_pago || "pendiente"));
      celda(tr,formatearSoles(Number(fila.monto_calculado)));
      celda(tr,fila.fecha_registro ? new Date(fila.fecha_registro).toLocaleDateString("es-PE",{timeZone:"America/Lima"}) : "—");
      const acciones = celda(tr);
      acciones.className = "acciones-tabla";
      const editable = fila.estado === "registrado" && fila.estado_pago !== "pagado";
      if(editable) acciones.append(botonEnlace("Editar",`actualizar.html?id=${fila.id}`));
      if(fila.estado_pago === "pendiente") acciones.append(botonEnlace("Pagar",`pago.html?id=${fila.id}`,"boton-primario"));
      if(fila.estado_pago === "pagado" && fila.codigo_operacion) acciones.append(botonEnlace("Comprobante",`comprobante.html?op=${encodeURIComponent(fila.codigo_operacion)}`,"boton-secundario"));
      tbody.append(tr);
    }
  }catch(error){
    tbody.innerHTML = `<tr><td colspan="9" class="vacio"></td></tr>`;
    tbody.querySelector("td").textContent = error.message;
  }
}

cargar();
