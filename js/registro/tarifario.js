export function redondear(valor){
  return Math.round(Number(valor) * 100) / 100;
}

export function formatearSoles(monto){
  return new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(Number(monto) || 0);
}

export const marcado = valor => valor === "on";

export function calcularMontoServicio(datos){
  return String(datos?.regimen || "nrus").toLowerCase() === "nrus" ? 10 : 25;
}
