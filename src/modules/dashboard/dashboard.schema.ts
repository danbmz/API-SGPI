import { Type, type Static } from "@sinclair/typebox";

// ---------- Alertas ----------

const pedidoAlertaSchema = Type.Object({
  id: Type.String(),
  numeroPedido: Type.String(),
  cliente: Type.String(),
  fechaEntrega: Type.String(),
  diasRestantes: Type.Integer(), // negativo si ya venció
});

const stockBajoSchema = Type.Object({
  id: Type.String(),
  nombre: Type.String(),
  tipo: Type.Union([Type.Literal("MATERIA_PRIMA"), Type.Literal("PIGMENTO")]),
  cantidadActual: Type.Number(),
  stockMinimo: Type.Number(),
});

const alertasSchema = Type.Object({
  pedidosAtrasados: Type.Array(pedidoAlertaSchema),
  pedidosUrgentes: Type.Array(pedidoAlertaSchema),
  stockBajo: Type.Array(stockBajoSchema),
});

// ---------- KPIs ----------

const kpisSchema = Type.Object({
  piezasProducidasHoy: Type.Integer(),
  piezasDefectuosasHoy: Type.Integer(),
  kgMermaHoy: Type.Number(),
  kgPlastaHoy: Type.Number(),
  ordenesEnProgreso: Type.Integer(),
  maquinasEnUso: Type.Integer(),
  maquinasTotales: Type.Integer(),
});

// ---------- Gráficas ----------

const produccionPorDiaSchema = Type.Object({
  fecha: Type.String(),
  piezasBuenas: Type.Integer(),
  piezasDefectuosas: Type.Integer(),
});

const ordenesPorEstadoSchema = Type.Object({
  estado: Type.String(),
  total: Type.Integer(),
});

const defectoFrecuenciaSchema = Type.Object({
  nombre: Type.String(),
  total: Type.Integer(),
});

const graficasSchema = Type.Object({
  produccionPorDia: Type.Array(produccionPorDiaSchema), // últimos 7 días
  ordenesPorEstado: Type.Array(ordenesPorEstadoSchema),
  defectosFrecuentes: Type.Array(defectoFrecuenciaSchema),
});

// ---------- Desempeño de operadores ----------

const desempenoOperadorSchema = Type.Object({
  operadorId: Type.String(),
  operadorNombre: Type.String(),
  piezasBuenas: Type.Integer(),
  piezasDefectuosas: Type.Integer(),
  porcentajeDefectos: Type.Number(),
});

// ---------- Pedidos en progreso ----------

const pedidoEnProgresoSchema = Type.Object({
  id: Type.String(),
  numeroPedido: Type.String(),
  cliente: Type.String(),
  fechaEntrega: Type.Union([Type.String(), Type.Null()]),
  ordenesCompletadas: Type.Integer(),
  totalOrdenes: Type.Integer(),
});

// ---------- Tiempos paro ----------

const tiempoParoPorMotivoSchema = Type.Object({
  nombre: Type.String(),
  minutos: Type.Integer(),
});

const tiemposParoSchema = Type.Object({
  totalMinutos: Type.Integer(),
  porMotivo: Type.Array(tiempoParoPorMotivoSchema),
});

// ---------- Respuesta completa ----------

export const dashboardResponseSchema = Type.Object({
  alertas: alertasSchema,
  kpis: kpisSchema,
  graficas: graficasSchema,
  desempenoOperadores: Type.Array(desempenoOperadorSchema),
  pedidosEnProgreso: Type.Array(pedidoEnProgresoSchema),
  tiemposParo: tiemposParoSchema,
});

export type DashboardResponse = Static<typeof dashboardResponseSchema>;