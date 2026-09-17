import { prisma } from "../../lib/prisma.js";

const MATERIAS_PRIMAS_BAJAS_LIMITE = 10; // tope razonable, evita respuestas gigantes si hay muchas
const DIAS_URGENCIA = 3;

async function obtenerAlertas() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const limiteUrgencia = new Date(hoy);
  limiteUrgencia.setDate(limiteUrgencia.getDate() + DIAS_URGENCIA);

  // ---------- Pedidos atrasados ----------
  const pedidosAtrasadosRaw = await prisma.pedido.findMany({
    where: {
      fechaEntrega: { lt: hoy, not: null },
      estado: { notIn: ["COMPLETADO", "CANCELADO"] },
    },
    orderBy: { fechaEntrega: "asc" },
  });

  const pedidosAtrasados = pedidosAtrasadosRaw.map((p) => ({
    id: p.id.toString(),
    numeroPedido: p.numeroPedido,
    cliente: p.cliente,
    fechaEntrega: p.fechaEntrega!.toISOString().substring(0, 10),
    diasRestantes: Math.ceil((p.fechaEntrega!.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  // ---------- Pedidos urgentes: entrega próxima, ninguna orden iniciada ----------
  const pedidosProximosRaw = await prisma.pedido.findMany({
    where: {
      fechaEntrega: { gte: hoy, lte: limiteUrgencia, not: null },
      estado: { notIn: ["COMPLETADO", "CANCELADO"] },
    },
    include: {
      detalle: { include: { ordenes: true } },
    },
    orderBy: { fechaEntrega: "asc" },
  });

  const pedidosUrgentes = pedidosProximosRaw
    .filter((p) => {
      const todasLasOrdenes = p.detalle.flatMap((d) => d.ordenes);
      const algunaIniciada = todasLasOrdenes.some(
        (o) => o.estado === "ACTIVA" || o.estado === "EN_PROGRESO" || o.estado === "COMPLETADA"
      );
      return !algunaIniciada; // urgente porque nada ha comenzado
    })
    .map((p) => ({
      id: p.id.toString(),
      numeroPedido: p.numeroPedido,
      cliente: p.cliente,
      fechaEntrega: p.fechaEntrega!.toISOString().substring(0, 10),
      diasRestantes: Math.ceil((p.fechaEntrega!.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
    }));

  // ---------- Stock bajo ----------
    const [materiasPrimasBajas, pigmentosBajos] = await Promise.all([
    prisma.$queryRaw<{ id: bigint; nombre: string; cantidadActual: number; stockMinimo: number }[]>`
        SELECT
        mp.id AS id,
        mp.nombre AS nombre,
        inv."cantidadActual" AS "cantidadActual",
        inv."stockMinimo" AS "stockMinimo"
        FROM inventario_materias_primas inv
        JOIN materias_primas mp ON mp.id = inv."materiaPrimaId"
        WHERE inv."cantidadActual" < inv."stockMinimo" AND mp.activo = true
        LIMIT ${MATERIAS_PRIMAS_BAJAS_LIMITE}
    `,
    prisma.$queryRaw<{ id: bigint; color: string; cantidadActual: number; stockMinimo: number }[]>`
        SELECT
        p.id AS id,
        p.color AS color,
        inv."cantidadActual" AS "cantidadActual",
        inv."stockMinimo" AS "stockMinimo"
        FROM inventario_pigmentos inv
        JOIN pigmentos p ON p.id = inv."pigmentoId"
        WHERE inv."cantidadActual" < inv."stockMinimo" AND p.activo = true
        LIMIT ${MATERIAS_PRIMAS_BAJAS_LIMITE}
    `,
    ]);

  const stockBajo = [
    ...materiasPrimasBajas.map((m) => ({
      id: m.id.toString(),
      nombre: m.nombre,
      tipo: "MATERIA_PRIMA" as const,
      cantidadActual: Number(m.cantidadActual),
      stockMinimo: Number(m.stockMinimo),
    })),
    ...pigmentosBajos.map((p) => ({
      id: p.id.toString(),
      nombre: p.color,
      tipo: "PIGMENTO" as const,
      cantidadActual: Number(p.cantidadActual),
      stockMinimo: Number(p.stockMinimo),
    })),
  ];

  return { pedidosAtrasados, pedidosUrgentes, stockBajo };
}

async function obtenerKpis() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);

  const [
    produccionHoy,
    ordenesEnProgreso,
    maquinasEnUso,
    maquinasTotales,
  ] = await Promise.all([
    // Piezas + merma + plasta de avances CERRADOS hoy
    prisma.avanceTurno.aggregate({
      where: {
        estado: "CERRADO",
        horaFin: { gte: hoy, lt: mañana },
      },
      _sum: {
        piezasBuenas: true,
        piezasDefectuosas: true,
        kgMerma: true,
        kgPlasta: true,
      },
    }),

    // Órdenes actualmente en progreso
    prisma.ordenProduccion.count({
      where: { estado: "EN_PROGRESO" },
    }),

    // Máquinas con al menos una orden activa/en progreso ahora mismo
    prisma.maquina.count({
      where: {
        ordenesProduccion: {
          some: { estado: { in: ["ACTIVA", "EN_PROGRESO"] } },
        },
      },
    }),

    // Total de máquinas activas en el catálogo
    prisma.maquina.count({
      where: { estado: "ACTIVA" },
    }),
  ]);

  return {
    piezasProducidasHoy: produccionHoy._sum.piezasBuenas ?? 0,
    piezasDefectuosasHoy: produccionHoy._sum.piezasDefectuosas ?? 0,
    kgMermaHoy: Number(produccionHoy._sum.kgMerma ?? 0),
    kgPlastaHoy: Number(produccionHoy._sum.kgPlasta ?? 0),
    ordenesEnProgreso,
    maquinasEnUso,
    maquinasTotales,
  };
}

async function obtenerGraficas() {
  const hace7Dias = new Date();
  hace7Dias.setHours(0, 0, 0, 0);
  hace7Dias.setDate(hace7Dias.getDate() - 6); // incluye hoy + 6 días atrás = 7 días totales

  // ---------- Producción por día (últimos 7 días) ----------
  const avancesUltimos7Dias = await prisma.avanceTurno.findMany({
    where: {
      estado: "CERRADO",
      horaFin: { gte: hace7Dias },
    },
    select: {
      horaFin: true,
      piezasBuenas: true,
      piezasDefectuosas: true,
    },
  });

  const produccionPorDiaMap = new Map<string, { piezasBuenas: number; piezasDefectuosas: number }>();
  for (let i = 0; i < 7; i++) {
    const dia = new Date(hace7Dias);
    dia.setDate(dia.getDate() + i);
    const clave = dia.toISOString().substring(0, 10);
    produccionPorDiaMap.set(clave, { piezasBuenas: 0, piezasDefectuosas: 0 });
  }

  for (const avance of avancesUltimos7Dias) {
    const clave = avance.horaFin!.toISOString().substring(0, 10)
    const actual = produccionPorDiaMap.get(clave);
    if (actual) {
      actual.piezasBuenas += avance.piezasBuenas;
      actual.piezasDefectuosas += avance.piezasDefectuosas;
    }
  }

  const produccionPorDia = Array.from(produccionPorDiaMap.entries()).map(([fecha, valores]) => ({
    fecha,
    ...valores,
  }));

  // ---------- Órdenes por estado (estado actual, sin filtro de fecha) ----------
  const ordenesAgrupadas = await prisma.ordenProduccion.groupBy({
    by: ["estado"],
    _count: { estado: true },
  });

  const ordenesPorEstado = ordenesAgrupadas.map((o) => ({
    estado: o.estado,
    total: o._count.estado,
  }));

  // ---------- Defectos más frecuentes (últimos 7 días) ----------
  const defectosAgrupados = await prisma.avanceTurno.groupBy({
    by: ["defectoProductoId"],
    where: {
      estado: "CERRADO",
      horaFin: { gte: hace7Dias },
      defectoProductoId: { not: null },
      piezasDefectuosas: { gt: 0 },
    },
    _sum: { piezasDefectuosas: true },
    orderBy: { _sum: { piezasDefectuosas: "desc" } },
    take: 5,
  });

  const defectoIds = defectosAgrupados.map((d) => d.defectoProductoId!);
  const defectosNombres = await prisma.defectoProducto.findMany({
    where: { id: { in: defectoIds } },
  });
  const nombrePorId = new Map(defectosNombres.map((d) => [d.id.toString(), d.nombre]));

  const defectosFrecuentes = defectosAgrupados.map((d) => ({
    nombre: nombrePorId.get(d.defectoProductoId!.toString()) ?? "Desconocido",
    total: d._sum.piezasDefectuosas ?? 0,
  }));

  return { produccionPorDia, ordenesPorEstado, defectosFrecuentes };
}

async function obtenerDesempenoOperadores() {
  const hace7Dias = new Date();
  hace7Dias.setHours(0, 0, 0, 0);
  hace7Dias.setDate(hace7Dias.getDate() - 6);

  const agrupado = await prisma.avanceTurno.groupBy({
    by: ["operadorId"],
    where: {
      estado: "CERRADO",
      horaFin: { gte: hace7Dias },
      operadorId: { not: null },
    },
    _sum: {
      piezasBuenas: true,
      piezasDefectuosas: true,
    },
  });

  // type predicate - le dice explícitamente a TypeScript "después de este filtro, garantizo que el tipo del array cambia de (bigint | null)[] a bigint[]".   
  const operadorIds = agrupado
    .map((a) => a.operadorId)
    .filter((id): id is bigint => id !== null);

  const operadores = await prisma.operador.findMany({
    where: { id: { in: operadorIds } },
  });
  const nombrePorId = new Map(operadores.map((o) => [o.id.toString(), o.nombre]));

  const desempeno = agrupado.map((a) => {
    const piezasBuenas = a._sum.piezasBuenas ?? 0;
    const piezasDefectuosas = a._sum.piezasDefectuosas ?? 0;
    const totalPiezas = piezasBuenas + piezasDefectuosas;
    const porcentajeDefectos = totalPiezas > 0 ? (piezasDefectuosas / totalPiezas) * 100 : 0;

    return {
      operadorId: a.operadorId!.toString(),
      operadorNombre: nombrePorId.get(a.operadorId!.toString()) ?? "Desconocido",
      piezasBuenas,
      piezasDefectuosas,
      porcentajeDefectos: Math.round(porcentajeDefectos * 100) / 100, // 2 decimales
    };
  });

  // Ordenado de peor a mejor desempeño, para que lo más urgente aparezca primero en la tabla
  return desempeno.sort((a, b) => b.porcentajeDefectos - a.porcentajeDefectos);
}

async function obtenerPedidosEnProgreso() {
  const pedidos = await prisma.pedido.findMany({
    where: { estado: "EN_PROCESO" },
    include: {
      detalle: { include: { ordenes: true } },
    },
    orderBy: [
      { fechaEntrega: "asc" }, // los que se entregan antes, primero — null va al final en Postgres por defecto
    ],
  });

  return pedidos.map((p) => {
    const todasLasOrdenes = p.detalle.flatMap((d) => d.ordenes);
    const totalOrdenes = todasLasOrdenes.length;
    const ordenesCompletadas = todasLasOrdenes.filter((o) => o.estado === "COMPLETADA").length;

    return {
      id: p.id.toString(),
      numeroPedido: p.numeroPedido,
      cliente: p.cliente,
      fechaEntrega: p.fechaEntrega ? p.fechaEntrega.toISOString().substring(0, 10) : null,
      ordenesCompletadas,
      totalOrdenes,
    };
  });
}

async function obtenerTiemposParo() {
  const hace7Dias = new Date();
  hace7Dias.setHours(0, 0, 0, 0);
  hace7Dias.setDate(hace7Dias.getDate() - 6);

  const tiemposParo = await prisma.tiempoParo.findMany({
    where: {
      avanceTurno: {
        estado: "CERRADO",
        horaFin: { gte: hace7Dias },
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

  const porMotivo = Array.from(acumuladoPorMotivo.values()).sort((a, b) => b.minutos - a.minutos);

  const totalMinutos = porMotivo.reduce((acc, m) => acc + m.minutos, 0);

  return {
    totalMinutos,
    porMotivo: porMotivo.slice(0, 6), // top 6, para no saturar la gráfica
  };
}

export async function obtenerDashboard() {
  const [alertas, kpis, graficas, desempenoOperadores, pedidosEnProgreso, tiemposParo] = await Promise.all([
    obtenerAlertas(),
    obtenerKpis(),
    obtenerGraficas(),
    obtenerDesempenoOperadores(),
    obtenerPedidosEnProgreso(),
    obtenerTiemposParo(),
  ]);

  return { alertas, kpis, graficas, desempenoOperadores, pedidosEnProgreso, tiemposParo };
}