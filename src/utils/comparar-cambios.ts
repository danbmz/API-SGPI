// Separamos los genéricos, para que "anterior" y "nuevo" puedan tener tipos independientes, sin exigir que coincidan exactamente: como con "T" y "Partial<T>"" que le dice a TypeScript que "nuevo" debe tener exactamente los mismos tipos de campos que "anterior".
export function compararCambios<
  A extends Record<string, any>,
  N extends Record<string, any>
>(anterior: A, nuevo: N, etiquetas: Partial<Record<keyof N, string>>): string {
  const cambios: string[] = [];

  for (const key in nuevo) {
    const nuevoValor = nuevo[key];
    const valorAnterior = (anterior as Record<string, any>)[key];

    if (nuevoValor !== undefined && nuevoValor !== valorAnterior) {
      const etiqueta = etiquetas[key] ?? String(key);
      cambios.push(`${etiqueta}: "${valorAnterior}" → "${nuevoValor}"`);
    }
  }

  return cambios.join(", ");
}