import { prisma } from "../../lib/prisma.js";
import type { ResumenTiemposParo } from "../../modules/dashboard/dashboard.schema.js";

export async function calcularTiemposParo(
  desde: Date,
  hasta: Date,
  limiteMotivos?: number
): Promise<ResumenTiemposParo> {
  const tiemposParo = await prisma.tiempoParo.findMany({
    where: {
      avanceTurno: {
        estado: "CERRADO",
        horaFin: { gte: desde, lte: hasta },
      },
    },
    include: { motivoParo: true },
  });

  const acumuladoPorMotivo = new Map<string, { nombre: string; minutos: number }>();
  for (const tp of tiemposParo) {
    const clave = tp.motivoParoId.toString();
    const actual = acumuladoPorMotivo.get(clave) ?? { nombre: tp.motivoParo.nombre, minutos: 0 };
    actual.minutos += tp.minutos;
    acumuladoPorMotivo.set(clave, actual);
  }

  let porMotivo = Array.from(acumuladoPorMotivo.values()).sort((a, b) => b.minutos - a.minutos);

  if (limiteMotivos !== undefined) {
    porMotivo = porMotivo.slice(0, limiteMotivos);
  }

  const totalMinutos = Array.from(acumuladoPorMotivo.values()).reduce((acc, m) => acc + m.minutos, 0);

  return { totalMinutos, porMotivo };
}