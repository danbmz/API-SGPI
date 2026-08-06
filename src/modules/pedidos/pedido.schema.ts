import { Type, type Static } from "@sinclair/typebox";

const estadoPedidoSchema = Type.Union([
  Type.Literal("PENDIENTE"),
  Type.Literal("EN_PROCESO"),
  Type.Literal("COMPLETADO"),
  Type.Literal("CANCELADO"),
]);

// ---------- Crear pedido ----------

export const crearPedidoBodySchema = Type.Object({
  numeroPedido: Type.String({ minLength: 1, maxLength: 50 }),
  cliente: Type.String({ minLength: 1, maxLength: 150 }),
  remision: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  descripcion: Type.Optional(Type.String({ maxLength: 500 })),
});

export type CrearPedidoBody = Static<typeof crearPedidoBodySchema>;

// ---------- Editar pedido ----------

export const editarPedidoBodySchema = Type.Object({
  cliente: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  descripcion: Type.Optional(Type.String({ maxLength: 500 })),
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
  pigmentoId: Type.Union([Type.String(), Type.Null()]),
  pigmentoColor: Type.Union([Type.String(), Type.Null()]),
  cantidadSolicitada: Type.Integer(),
  cantidadProducida: Type.Integer(), // calculada: suma de órdenes que cubren esta línea
  cantidadEntregada: Type.Number(), // calculada: suma de todas las salidas de inventario que cubren esta linea
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
});

export const listaPedidoResponseSchema = Type.Array(pedidoResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });