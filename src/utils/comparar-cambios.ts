export function compararCambios<T extends Record<string, any>>(
  anterior: T,
  nuevo: Partial<T>,
  etiquetas: Partial<Record<keyof T, string>>
): string {
  const cambios: string[] = [];
  for (const key in nuevo) {
    if (nuevo[key] !== undefined && nuevo[key] !== anterior[key]) {
      const etiqueta = etiquetas[key] ?? String(key);
      cambios.push(`${etiqueta}: "${anterior[key]}" → "${nuevo[key]}"`);
    }
  }
  return cambios.join(", ");
}