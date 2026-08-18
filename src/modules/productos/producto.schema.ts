import { Type, type Static } from "@sinclair/typebox";
import { TipoMaterial } from "../../../prisma/generated/prisma/client/enums.js";

const tipoMaterialSchema = Type.Union([
  Type.Literal("POLIPROPILENO"),
  Type.Literal("POLIESTIRENO"),
  Type.Literal("POLIETILENO"),
]);

// ---------- Crear ----------

export const crearProductoBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 150 }),
  codigo: Type.String({ minLength: 1, maxLength: 50 }),
  tipo: Type.String({ minLength: 1, maxLength: 100 }),
  tipoMaterial: tipoMaterialSchema,
  cavidades: Type.Integer({ minimum: 1 }),
  ciclo: Type.Integer({ minimum: 1 }), // segundos
  peso: Type.Number({ minimum: 0 }), // gramos
  piezasPorEmpaque: Type.Integer({ exclusiveMinimum: 0}),
  precio: Type.Number({ exclusiveMinimum: 0}),
  descripcion: Type.String({minLength: 1, maxLength: 100}),
});

export type CrearProductoBody = Static<typeof crearProductoBodySchema>;

// ---------- Editar ----------

export const editarProductoBodySchema = Type.Object({
  nombre: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  tipo: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  cavidades: Type.Optional(Type.Integer({ minimum: 1 })), //   Usamos Integer para verificar que el numero es un entero y no un decimal
  ciclo: Type.Optional(Type.Integer({ minimum: 1 })),
  peso: Type.Optional(Type.Number({ minimum: 0 })), //   Number acepta numeros enteros y decimales
  piezasPorEmpaque: Type.Optional(Type.Integer({ exclusiveMinimum: 0})),
  precio: Type.Optional(Type.Number({ exclusiveMinimum: 0})),
  descripcion: Type.Optional(Type.String({minLength: 1, maxLength: 100})),
});

export type EditarProductoBody = Static<typeof editarProductoBodySchema>;

// ---------- Parámetros ----------

export const productoParamsSchema = Type.Object({
  id: Type.String(),
});

export type ProductoParams = Static<typeof productoParamsSchema>;

// ---------- Respuestas ----------

export const productoResponseSchema = Type.Object({
  id: Type.String(),
  codigo: Type.String(),
  nombre: Type.String(),
  tipo: Type.String(),
  cavidades: Type.Integer(),
  ciclo: Type.Integer(),
  peso: Type.Number(),
  piezasPorEmpaque: Type.Integer(),
  precio: Type.Number(),
  descripcion: Type.String(),
  tipoMaterial: tipoMaterialSchema,
  activo: Type.Boolean(),
});

// Transformamos el mismo schema pero como un array de si mismo.
export const listaProductoResponseSchema = Type.Array(productoResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });