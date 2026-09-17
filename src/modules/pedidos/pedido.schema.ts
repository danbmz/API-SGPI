import { Type, type Static } from "@sinclair/typebox";

const estadoPedidoSchema = Type.Union([
  Type.Literal("PENDIENTE"),
  Type.Literal("EN_PROCESO"),
  Type.Literal("COMPLETADO"),
  Type.Literal("CANCELADO"),
]);

const tipoMaterialSchema = Type.Union([
  Type.Literal("POLIPROPILENO"),
  Type.Literal("POLIESTIRENO"),
  Type.Literal("POLIETILENO"),
]);

const categoriaColorPigmentoSchema = Type.Union([
  Type.Literal("SOLIDO"),
  Type.Literal("SOLIDO_PASTEL"),
  Type.Literal("NEON_TRASLUCIDO"),
  Type.Literal("JARRA_NEON_PASTEL"),
  Type.Literal("NATURAL"),
]);

// ---------- Crear pedido ----------

export const crearPedidoBodySchema = Type.Object({
  numeroPedido: Type.String({ minLength: 1, maxLength: 50 }),
  cliente: Type.String({ minLength: 1, maxLength: 150 }),
  remision: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  descripcion: Type.Optional(Type.String({ maxLength: 500 })),
  fechaEntrega: Type.Optional(Type.String({ format: "date" })),
});

export type CrearPedidoBody = Static<typeof crearPedidoBodySchema>;

// ---------- Editar pedido ----------

export const editarPedidoBodySchema = Type.Object({
  cliente: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  descripcion: Type.Optional(Type.String({ maxLength: 500 })),
  fechaEntrega: Type.Optional(Type.String({ format: "date" })),
});

export type EditarPedidoBody = Static<typeof editarPedidoBodySchema>;

// ---------- Cancelar pedido ----------

export const cancelarPedidoBodySchema = Type.Object({
  motivo: Type.String({ minLength: 1, maxLength: 300 }),
});

export type CancelarPedidoBody = Static<typeof cancelarPedidoBodySchema>;

// ---------- Agregar línea de detalle ----------

export const crearPedidoDetalleBodySchema = Type.Object({
  productoId: Type.String(),
  pigmentoId: Type.Optional(Type.String()),
  cantidadSolicitada: Type.Integer({ exclusiveMinimum: 0 }),
});

export type CrearPedidoDetalleBody = Static<typeof crearPedidoDetalleBodySchema>;

// ---------- Parámetros ----------

export const pedidoParamsSchema = Type.Object({ id: Type.String() });
export type PedidoParams = Static<typeof pedidoParamsSchema>;

export const pedidoDetalleParamsSchema = Type.Object({ id: Type.String(), detalleId: Type.String() });
export type PedidoDetalleParams = Static<typeof pedidoDetalleParamsSchema>;

// ---------- Respuestas ----------

export const pedidoDetalleResponseSchema = Type.Object({
  id: Type.String(),
  productoId: Type.String(),
  productoNombre: Type.String(),
  tipoMaterial: tipoMaterialSchema,
  pigmentoId: Type.Union([Type.String(), Type.Null()]),
  pigmentoColor: Type.Union([Type.String(), Type.Null()]),
  categoriaColor: Type.Union([categoriaColorPigmentoSchema, Type.Null()]),
  cantidadSolicitada: Type.Integer(),
  cantidadProducida: Type.Integer(), // ahora es parte de la tabla
  cantidadEntregada: Type.Integer(), // ahora es parte de la tabla
});

export const pedidoResponseSchema = Type.Object({
  id: Type.String(),
  numeroPedido: Type.String(),
  cliente: Type.String(),
  descripcion: Type.Union([Type.String(), Type.Null()]),
  remision: Type.Union([Type.String(), Type.Null()]),
  estado: estadoPedidoSchema,
  activo: Type.Boolean(),
  detalle: Type.Array(pedidoDetalleResponseSchema),
  totalOrdenes: Type.Integer(),
  ordenesCompletadas: Type.Integer(),
  createdAt: Type.String(),
  fechaEntrega: Type.Union([Type.String(), Type.Null()]), 
});

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });

// --------------- QUERY STRINGS -----------

export const listarPedidosQuerySchema = Type.Object({
  estado: Type.Optional(estadoPedidoSchema),
  pagina: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limite: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export type ListarPedidosQuery = Static<typeof listarPedidosQuerySchema>;

export const paginacionSchema = Type.Object({
  pagina: Type.Integer(),
  limite: Type.Integer(),
  total: Type.Integer(),
  totalPaginas: Type.Integer(),
});

// Cambia la forma de la respuesta
export const listaPedidoResponseSchema = Type.Object({
  data: Type.Array(pedidoResponseSchema),
  paginacion: paginacionSchema,
});