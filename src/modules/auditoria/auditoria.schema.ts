import { Type, type Static } from "@sinclair/typebox";
import { paginacionSchema } from "../pedidos/pedido.schema.js";

const moduloAuditoriaSchema = Type.Union([
  Type.Literal("AUTH"),
  Type.Literal("USUARIOS"),
  Type.Literal("INVENTARIO"),
  Type.Literal("ORDENES"),
  Type.Literal("MOLINO"),
  Type.Literal("CATALOGOS"),
  Type.Literal("PIGMENTOS"),
]);

export const listarAuditoriaQuerySchema = Type.Object({
  modulo: Type.Optional(moduloAuditoriaSchema),
  usuarioId: Type.Optional(Type.String()),
  fechaDesde: Type.Optional(Type.String({ format: "date" })),
  fechaHasta: Type.Optional(Type.String({ format: "date" })),
  pagina: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limite: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 30 })),
});

export type ListarAuditoriaQuery = Static<typeof listarAuditoriaQuerySchema>

export const auditLogResponseSchema = Type.Object({
  id: Type.String(),
  usuarioId: Type.String(),
  usuarioLogin: Type.String(),
  usuarioNombre: Type.String(),
  modulo: moduloAuditoriaSchema,
  accion: Type.String(),
  entidad: Type.Union([Type.String(), Type.Null()]),
  entidadId: Type.Union([Type.String(), Type.Null()]),
  detalle: Type.Union([Type.String(), Type.Null()]),
  ip: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});

export const listaAuditLogResponseSchema = Type.Object({
  data: Type.Array(auditLogResponseSchema),
  paginacion: paginacionSchema, // reutilizando el mismo schema que ya definimos para Pedidos
});

export type ListaAuditLogResponse = Static<typeof listaAuditLogResponseSchema>;