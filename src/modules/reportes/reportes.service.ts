import { prisma } from "../../lib/prisma.js";
import { calcularDesempenoOperadores } from "../../shared/estadisticas/desempenoOperadores.js";
import { calcularTiemposParo } from "../../shared/estadisticas/tiemposParo.js";
import type { ReportesQuery } from "./reportes.schema.js";

type Granularidad = "dia" | "semana" | "mes";

function resolverRango(query: ReportesQuery) {
  const desde = new Date(query.fechaDesde + "T00:00:00.000Z");
  const hasta = new Date(query.fechaHasta + "T23:59:59.999Z");
  return { desde, hasta };
}

function determinarGranularidad(desde: Date, hasta: Date): Granularidad {
  const dias = Math.ceil((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (dias <= 31) return "dia";
  if (dias <= 180) return "semana";
  return "mes";
}

function obtenerClavePeriodo(fecha: Date, granularidad: Granularidad): string {
  if (granularidad === "dia") {
    return fecha.toISOString().substring(0, 10);
  }
  if (granularidad === "semana") {
    // Semana ISO: lunes como inicio — normalizamos la fecha al lunes de esa semana
    const copia = new Date(fecha);
    const diaSemana = copia.getDay(); // 0=domingo, 1=lunes, ...
    const offset = diaSemana === 0 ? -6 : 1 - diaSemana; // retrocede hasta el lunes
    copia.setDate(copia.getDate() + offset);
    return copia.toISOString().substring(0, 10); // clave = fecha del lunes de esa semana
  }
  // mes
  return fecha.toISOString().substring(0, 7); // "2026-09"
}

function generarPeriodosEnRango(desde: Date, hasta: Date, granularidad: Granularidad): string[] {
  const periodos: string[] = [];
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);
  const limite = new Date(hasta);
  limite.setHours(0, 0, 0, 0);

  const paso = granularidad === "dia" ? 1 : granularidad === "semana" ? 7 : 1;

  if (granularidad === "mes") {
    cursor.setDate(1); // normaliza al primer día del mes
    while (cursor <= limite) {
      periodos.push(cursor.toISOString().substring(0, 7));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    while (cursor <= limite) {
      periodos.push(obtenerClavePeriodo(cursor, granularidad));
      cursor.setDate(cursor.getDate() + paso);
    }
  }

  return Array.from(new Set(periodos)); // por si acaso hay claves duplicadas al normalizar semanas
}

// --------- FUNCIONES PARA VISTA DE REPORTES -----------------

async function obtenerProduccion(query: ReportesQuery) {
  const { desde, hasta } = resolverRango(query);
  const granularidad = determinarGranularidad(desde, hasta);

  const avances = await prisma.avanceTurno.findMany({
    where: {
      estado: "CERRADO",
      horaFin: { gte: desde, lte: hasta },
    },
    select: {
      horaFin: true,
      piezasBuenas: true,
      piezasDefectuosas: true,
      kgMerma: true,
      kgPlasta: true,
    },
  });

  const totalPiezasBuenas = avances.reduce((acc, a) => acc + a.piezasBuenas, 0);
  const totalPiezasDefectuosas = avances.reduce((acc, a) => acc + a.piezasDefectuosas, 0);
  const totalKgMerma = avances.reduce((acc, a) => acc + Number(a.kgMerma), 0);
  const totalKgPlasta = avances.reduce((acc, a) => acc + Number(a.kgPlasta), 0);

  const porPeriodoMap = new Map<string, { piezasBuenas: number; piezasDefectuosas: number }>();
  for (const periodo of generarPeriodosEnRango(desde, hasta, granularidad)) {
    porPeriodoMap.set(periodo, { piezasBuenas: 0, piezasDefectuosas: 0 });
  }

  for (const avance of avances) {
    const clave = obtenerClavePeriodo(avance.horaFin!, granularidad);
    const actual = porPeriodoMap.get(clave);
    if (actual) {
      actual.piezasBuenas += avance.piezasBuenas;
      actual.piezasDefectuosas += avance.piezasDefectuosas;
    }
  }

  const porPeriodo = Array.from(porPeriodoMap.entries())
    .map(([periodo, valores]) => ({ periodo, ...valores }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  return {
    totalPiezasBuenas,
    totalPiezasDefectuosas,
    totalKgMerma: Math.round(totalKgMerma * 1000) / 1000,
    totalKgPlasta: Math.round(totalKgPlasta * 1000) / 1000,
    granularidad,
    porPeriodo,
  };
}

async function obtenerCumplimientoPedidos(query: ReportesQuery) {
  const { desde, hasta } = resolverRango(query);

  // Consideramos "completado en el rango" según cuándo se actualizó a ese estado.
  // Como no guardamos una fecha específica de "completadoEn", usamos updatedAt como aproximación.
  const pedidosCompletados = await prisma.pedido.findMany({
    where: {
      estado: "COMPLETADO",
      updatedAt: { gte: desde, lte: hasta },
    },
    select: {
      id: true,
      numeroPedido: true,
      cliente: true,
      fechaEntrega: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  let aTiempo = 0;
  let conRetraso = 0;
  let sinFechaDefinida = 0;
  const detalle: {
    id: string;
    numeroPedido: string;
    cliente: string;
    fechaEntrega: string | null;
    completadoEn: string;
    diasDiferencia: number | null;
  }[] = [];

  for (const p of pedidosCompletados) {
    let diasDiferencia: number | null = null;

    if (p.fechaEntrega) {
      diasDiferencia = Math.round(
        (p.updatedAt.getTime() - p.fechaEntrega.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diasDiferencia <= 0) aTiempo++;
      else conRetraso++;
    } else {
      sinFechaDefinida++;
    }

    detalle.push({
      id: p.id.toString(),
      numeroPedido: p.numeroPedido,
      cliente: p.cliente,
      fechaEntrega: p.fechaEntrega ? p.fechaEntrega.toISOString().substring(0, 10) : null,
      completadoEn: p.updatedAt.toISOString().substring(0, 10),
      diasDiferencia,
    });
  }

  const totalConFecha = aTiempo + conRetraso;
  const porcentajeCumplimiento = totalConFecha > 0 ? Math.round((aTiempo / totalConFecha) * 10000) / 100 : 0;

  return {
    totalCompletados: pedidosCompletados.length,
    aTiempo,
    conRetraso,
    sinFechaDefinida,
    porcentajeCumplimiento,
    detalle,
  };
}

async function obtenerCostoMermaPlasta(query: ReportesQuery) {
  const { desde, hasta } = resolverRango(query);

  // Deberiamos traer las columnas de datos confirmados por el encargado de molino?
  const avances = await prisma.avanceTurno.findMany({
    where: {
      estado: "CERRADO",
      horaFin: { gte: desde, lte: hasta },
    },
    select: {
      kgMerma: true,
      kgPlasta: true,
      orden: {
        select: {
          materiaPrima: {
            select: { id: true, nombre: true, costoUnitario: true },
          },
        },
      },
    },
  });

  const acumuladoPorMaterial = new Map<
    string,
    { nombre: string; kgMerma: number; kgPlasta: number; costoTotal: number }
  >();

  let costoTotalGeneral = 0;

  for (const avance of avances) {
    const materiaPrima = avance.orden.materiaPrima;
    const costoUnitario = Number(materiaPrima.costoUnitario);
    const kgMerma = Number(avance.kgMerma);
    const kgPlasta = Number(avance.kgPlasta);
    const costoAvance = (kgMerma + kgPlasta) * costoUnitario;

    const clave = materiaPrima.id.toString();
    const actual = acumuladoPorMaterial.get(clave) ?? {
      nombre: materiaPrima.nombre,
      kgMerma: 0,
      kgPlasta: 0,
      costoTotal: 0,
    };
    actual.kgMerma += kgMerma;
    actual.kgPlasta += kgPlasta;
    actual.costoTotal += costoAvance;
    acumuladoPorMaterial.set(clave, actual);

    costoTotalGeneral += costoAvance;
  }

  const porMaterial = Array.from(acumuladoPorMaterial.values())
    .map((m) => ({
      ...m,
      kgMerma: Math.round(m.kgMerma * 1000) / 1000,
      kgPlasta: Math.round(m.kgPlasta * 1000) / 1000,
      costoTotal: Math.round(m.costoTotal * 100) / 100,
    }))
    .sort((a, b) => b.costoTotal - a.costoTotal);

  return {
    costoTotalGeneral: Math.round(costoTotalGeneral * 100) / 100,
    porMaterial,
  };
}

async function obtenerConsumoMateriales(query: ReportesQuery) {
  const { desde, hasta } = resolverRango(query);

  const [movimientosMateriaPrima, movimientosPigmento] = await Promise.all([
    prisma.historialMovimientoInventario.findMany({
      where: {
        tipoInventario: "MATERIA_PRIMA",
        tipoMovimiento: "SALIDA",
        motivo: { in: ["CONSUMO_PRODUCCION", "REPIGMENTAR"] },
        createdAt: { gte: desde, lte: hasta },
      },
      include: {
        materiaPrima: { select: { id: true, nombre: true, costoUnitario: true } },
      },
    }),
    prisma.historialMovimientoInventario.findMany({
      where: {
        tipoInventario: "PIGMENTO",
        tipoMovimiento: "SALIDA",
        motivo: { in: ["CONSUMO_PRODUCCION", "REPIGMENTAR"] },
        createdAt: { gte: desde, lte: hasta },
      },
      include: {
        pigmento: { select: { id: true, color: true, costoUnitario: true } },
      },
    }),
  ]);

  const acumuladoMateriaPrima = new Map<
    string,
    { nombre: string; kgConsumidos: number; costoTotal: number }
  >();

  for (const mov of movimientosMateriaPrima) {
    const materiaPrima = mov.materiaPrima!;
    const kg = Math.abs(Number(mov.cantidadMovimiento)); // SALIDA es negativo, normalizamos a positivo
    const costoUnitario = Number(materiaPrima.costoUnitario);

    const clave = materiaPrima.id.toString();
    const actual = acumuladoMateriaPrima.get(clave) ?? {
      nombre: materiaPrima.nombre,
      kgConsumidos: 0,
      costoTotal: 0,
    };
    actual.kgConsumidos += kg;
    actual.costoTotal += kg * costoUnitario;
    acumuladoMateriaPrima.set(clave, actual);
  }

  const acumuladoPigmento = new Map<
    string,
    { color: string; kgConsumidos: number; costoTotal: number }
  >();

  for (const mov of movimientosPigmento) {
    const pigmento = mov.pigmento!;
    const kg = Math.abs(Number(mov.cantidadMovimiento));
    const costoUnitario = Number(pigmento.costoUnitario);

    const clave = pigmento.id.toString();
    const actual = acumuladoPigmento.get(clave) ?? {
      color: pigmento.color,
      kgConsumidos: 0,
      costoTotal: 0,
    };
    actual.kgConsumidos += kg;
    actual.costoTotal += kg * costoUnitario;
    acumuladoPigmento.set(clave, actual);
  }

  const materiaPrima = Array.from(acumuladoMateriaPrima.values())
    .map((m) => ({
      ...m,
      kgConsumidos: Math.round(m.kgConsumidos * 1000) / 1000,
      costoTotal: Math.round(m.costoTotal * 100) / 100,
    }))
    .sort((a, b) => b.costoTotal - a.costoTotal);

  const pigmento = Array.from(acumuladoPigmento.values())
    .map((p) => ({
      ...p,
      kgConsumidos: Math.round(p.kgConsumidos * 1000) / 1000,
      costoTotal: Math.round(p.costoTotal * 100) / 100,
    }))
    .sort((a, b) => b.costoTotal - a.costoTotal);

  const costoTotalGeneral =
    materiaPrima.reduce((acc, m) => acc + m.costoTotal, 0) +
    pigmento.reduce((acc, p) => acc + p.costoTotal, 0);

  return {
    costoTotalGeneral: Math.round(costoTotalGeneral * 100) / 100,
    materiaPrima,
    pigmento,
  };
}

async function obtenerDesempenoOperadores(query: ReportesQuery) {
  const { desde, hasta } = resolverRango(query);
  return calcularDesempenoOperadores(desde, hasta);
}

async function obtenerTiemposParo(query: ReportesQuery) {
  const { desde, hasta } = resolverRango(query);
  return calcularTiemposParo(desde, hasta); // sin límite, lista completa para el reporte
}

export async function obtenerReportes(query: ReportesQuery) {
  const [
    produccion,
    cumplimientoPedidos,
    costoMermaPlasta,
    consumoMateriales,
    desempenoOperadores,
    tiemposParo,
  ] = await Promise.all([
    obtenerProduccion(query),
    obtenerCumplimientoPedidos(query),
    obtenerCostoMermaPlasta(query),
    obtenerConsumoMateriales(query),
    obtenerDesempenoOperadores(query),
    obtenerTiemposParo(query),
  ]);

  return {
    produccion,
    cumplimientoPedidos,
    costoMermaPlasta,
    consumoMateriales,
    desempenoOperadores,
    tiemposParo,
  };
}