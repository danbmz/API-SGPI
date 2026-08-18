import { Type, type Static } from "@sinclair/typebox";

const tipoMaterialOrdenSchema = Type.Union([
  Type.Literal("VIRGEN"),
  Type.Literal("MEZCLA_MOLIDO_INTERNO"),
  Type.Literal("MEZCLA_RECICLADO"),
]);

const estadoOrdenSchema = Type.Union([
  Type.Literal("BORRADOR"),
  Type.Literal("ACTIVA"),
  Type.Literal("EN_PROGRESO"),
  Type.Literal("PAUSADA"),
  Type.Literal("COMPLETADA"),
  Type.Literal("CANCELADA"),
]);

// ---------- Crear orden ----------
// Unión discriminada: VIRGEN no pide inventarioMolidoId ni porcentajes; las mezclas sí.

export const crearOrdenBodySchema = Type.Union([
  Type.Object({
    tipoMaterial: Type.Literal("VIRGEN"),
    folio: Type.String({ minLength: 1, maxLength: 50 }),
    pedidoDetalleId: Type.String(),
    productoId: Type.String(),
    materiaPrimaId: Type.String(),
    pigmentoId: Type.String(),
    maquinaId: Type.String(),
    totalPiezas: Type.Integer({ minimum: 1 }),
    observaciones: Type.Optional(Type.String({ maxLength: 300 })),
    aditivoDescripcion: Type.Optional(Type.String({ maxLength: 200 })),
  }),
  Type.Object({
    tipoMaterial: Type.Union([
      Type.Literal("MEZCLA_MOLIDO_INTERNO"),
      Type.Literal("MEZCLA_RECICLADO"),
    ]),
    folio: Type.String({ minLength: 1, maxLength: 50 }),
    pedidoDetalleId: Type.String(),
    productoId: Type.String(),
    materiaPrimaId: Type.String(),
    pigmentoId: Type.String(),
    maquinaId: Type.String(),
    totalPiezas: Type.Integer({ minimum: 1 }),
    inventarioMolidoId: Type.String(),
    porcentajeVirgen: Type.Number({ minimum: 0, maximum: 100 }),
    porcentajeMolido: Type.Number({ minimum: 0, maximum: 100 }),
    observaciones: Type.Optional(Type.String({ maxLength: 300 })),
    aditivoDescripcion: Type.Optional(Type.String({ maxLength: 200 })),
  }),
]);

export type CrearOrdenBody = Static<typeof crearOrdenBodySchema>;

// ---------- Cancelar orden ----------

export const cancelarOrdenBodySchema = Type.Object({
  motivo: Type.String({ minLength: 1, maxLength: 300 }),
});

export type CancelarOrdenBody = Static<typeof cancelarOrdenBodySchema>;

// ---------- Confirmar material siguiente ----------
// (sin body: solo marca la bandera y la fecha)

// ---------- Parámetros ----------

export const ordenParamsSchema = Type.Object({
  id: Type.String(),
});

export type OrdenParams = Static<typeof ordenParamsSchema>;

// ---------- Respuestas ----------

export const ordenResponseSchema = Type.Object({
  id: Type.String(),
  folio: Type.String(),
  estado: estadoOrdenSchema,
  pedidoDetalleId: Type.String(),
  pedidoId: Type.String(),
  pedidoNumero: Type.String(),
  cliente: Type.String(),
  productoId: Type.String(),
  productoNombre: Type.String(),
  totalPiezas: Type.Integer(),
  piezasProducidas: Type.Integer(),
  observaciones: Type.Union([Type.String(), Type.Null()]),
  tipoMaterial: tipoMaterialOrdenSchema,
  materiaPrimaId: Type.String(),
  materiaPrimaNombre: Type.String(),
  inventarioMolidoId: Type.Union([Type.String(), Type.Null()]),
  porcentajeVirgen: Type.Number(),
  porcentajeMolido: Type.Number(),
  pigmentoId: Type.String(),
  pigmentoColor: Type.String(),
  aditivoDescripcion: Type.Union([Type.String(), Type.Null()]),
  maquinaId: Type.String(),
  maquinaNombre: Type.String(),
  piezasPorHora: Type.Integer(),
  piezasPorTurno: Type.Integer(),
  piezasPorDia: Type.Integer(),
  tiempoEstimadoHrs: Type.Number(),
  materiaPrimaTotalKg: Type.Number(),
  materiaPrimaVirgenKg: Type.Number(),
  materialMolidoKg: Type.Number(),
  pigmentoRequeridoKg: Type.Number(),
  materialSiguienteConfirmado: Type.Boolean(),
  materialConfirmadoEn: Type.Union([Type.String(), Type.Null()]),
  usuarioCreadorNombre: Type.String(),
  createdAt: Type.String(),
});

export const listaOrdenResponseSchema = Type.Array(ordenResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });

// cambiar estado de la orden

export const cambiarEstadoOrdenBodySchema = Type.Object({
  motivo: Type.Optional(Type.String({ maxLength: 300 })),
});

export type CambiarEstadoOrdenBody = Static<typeof cambiarEstadoOrdenBodySchema>;

export const sustituirMaterialPigmentadoBodySchema = Type.Object({
  combinacionMaterialPigmentadoId: Type.String(),
  kgSustituidos: Type.Number({ exclusiveMinimum: 0 }),
});

export type SustituirMaterialPigmentadoBody = Static<typeof sustituirMaterialPigmentadoBodySchema>;

// ---------- QueryParams ----------

export const listarOrdenesQuerySchema = Type.Object({
  estado: Type.Optional(estadoOrdenSchema), // permite filtrar por un estado específico
  excluirFinalizadas: Type.Optional(Type.Boolean()), // excluye COMPLETADA y CANCELADA de golpe
});

export type ListarOrdenesQuerySchema = Static<typeof listarOrdenesQuerySchema>