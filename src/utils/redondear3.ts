// Funcion auxiliar para prevenir errores por inconsistencia de decimales (normalizamos a 3 los decimales de un numero para que siempre coincida con los decimales que espera la base de datos)
export function redondear3(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}