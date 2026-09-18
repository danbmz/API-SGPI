import { prisma } from "../../lib/prisma.js";
import type { DesempenoOperador } from "../../modules/dashboard/dashboard.schema.js";

export async function calcularDesempenoOperadores(desde: Date, hasta: Date): Promise<DesempenoOperador[]> {
  const agrupado = await prisma.avanceTurno.groupBy({
    by: ["operadorId"],
    where: {
      estado: "CERRADO",
      horaFin: { gte: desde, lte: hasta },
      operadorId: { not: null },
    },
    _sum: {
      piezasBuenas: true,
      piezasDefectuosas: true,
    },
  });

  const operadorIds = agrupado
    .map((a) => a.operadorId)
    .filter((id): id is bigint => id !== null);

  const operadores = await prisma.operador.findMany({
    where: { id: { in: operadorIds } },
  });
  const nombrePorId = new Map(operadores.map((o) => [o.id.toString(), o.nombre]));

  const desempeno = agrupado
    .filter((a) => a.operadorId !== null)
    .map((a) => {
      const piezasBuenas = a._sum.piezasBuenas ?? 0;
      const piezasDefectuosas = a._sum.piezasDefectuosas ?? 0;
      const totalPiezas = piezasBuenas + piezasDefectuosas;
      const porcentajeDefectos = totalPiezas > 0 ? (piezasDefectuosas / totalPiezas) * 100 : 0;

      return {
        operadorId: a.operadorId!.toString(),
        operadorNombre: nombrePorId.get(a.operadorId!.toString()) ?? "Desconocido",
        piezasBuenas,
        piezasDefectuosas,
        porcentajeDefectos: Math.round(porcentajeDefectos * 100) / 100,
      };
    });

  return desempeno.sort((a, b) => b.porcentajeDefectos - a.porcentajeDefectos);
}