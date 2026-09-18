import { Type, type Static } from "@sinclair/typebox";

export const reportesQuerySchema = Type.Object({
  fechaDesde: Type.String({ format: "date" }),
  fechaHasta: Type.String({ format: "date" }),
});

export type ReportesQuery = Static<typeof reportesQuerySchema>;

// ---------- Producción ----------

const produccionPorPeriodoSchema = Type.Object({
  periodo: Type.String(),
  piezasBuenas: Type.Integer(),
  piezasDefectuosas: Type.Integer(),
});

const produccionSchema = Type.Object({
  totalPiezasBuenas: Type.Integer(),
  totalPiezasDefectuosas: Type.Integer(),
  totalKgMerma: Type.Number(),
  totalKgPlasta: Type.Number(),
  granularidad: Type.Union([Type.Literal("dia"), Type.Literal("semana"), Type.Literal("mes")]),
  porPeriodo: Type.Array(produccionPorPeriodoSchema),
});

// ---------- Cumplimiento de pedidos ----------

const pedidoCumplimientoSchema = Type.Object({
  id: Type.String(),
  numeroPedido: Type.String(),
  cliente: Type.String(),
  fechaEntrega: Type.Union([Type.String(), Type.Null()]),
  completadoEn: Type.String(),
  diasDiferencia: Type.Union([Type.Integer(), Type.Null()]),
});

const cumplimientoPedidosSchema = Type.Object({
  totalCompletados: Type.Integer(),
  aTiempo: Type.Integer(),
  conRetraso: Type.Integer(),
  sinFechaDefinida: Type.Integer(),
  porcentajeCumplimiento: Type.Number(),
  detalle: Type.Array(pedidoCumplimientoSchema),
});

// ---------- Costo merma/plasta ----------

const costoMaterialSchema = Type.Object({
  nombre: Type.String(),
  kgMerma: Type.Number(),
  kgPlasta: Type.Number(),
  costoTotal: Type.Number(),
});

const costoMermaPlastaSchema = Type.Object({
  costoTotalGeneral: Type.Number(),
  porMaterial: Type.Array(costoMaterialSchema),
});

// ---------- Consumo de materiales ----------

const consumoMateriaPrimaSchema = Type.Object({
  nombre: Type.String(),
  kgConsumidos: Type.Number(),
  costoTotal: Type.Number(),
});

const consumoPigmentoSchema = Type.Object({
  color: Type.String(),
  kgConsumidos: Type.Number(),
  costoTotal: Type.Number(),
});

const consumoMaterialesSchema = Type.Object({
  costoTotalGeneral: Type.Number(),
  materiaPrima: Type.Array(consumoMateriaPrimaSchema),
  pigmento: Type.Array(consumoPigmentoSchema),
});

// ---------- Desempeño operadores ----------

const desempenoOperadorSchema = Type.Object({
  operadorId: Type.String(),
  operadorNombre: Type.String(),
  piezasBuenas: Type.Integer(),
  piezasDefectuosas: Type.Integer(),
  porcentajeDefectos: Type.Number(),
});

// ---------- Tiempos de paro ----------

const tiempoParoPorMotivoSchema = Type.Object({
  nombre: Type.String(),
  minutos: Type.Integer(),
});

const tiemposParoSchema = Type.Object({
  totalMinutos: Type.Integer(),
  porMotivo: Type.Array(tiempoParoPorMotivoSchema),
});

// ---------- Respuesta completa ----------

export const reportesResponseSchema = Type.Object({
  produccion: produccionSchema,
  cumplimientoPedidos: cumplimientoPedidosSchema,
  costoMermaPlasta: costoMermaPlastaSchema,
  consumoMateriales: consumoMaterialesSchema,
  desempenoOperadores: Type.Array(desempenoOperadorSchema),
  tiemposParo: tiemposParoSchema,
});

export type ReportesResponse = Static<typeof reportesResponseSchema>;