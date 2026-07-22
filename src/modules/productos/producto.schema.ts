import { Type, type Static } from "@sinclair/typebox";

// ---------- Crear ----------

export const crearProductoBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 150 }),
  codigo: Type.String({ minLength: 1, maxLength: 50 }),
  tipo: Type.String({ minLength: 1, maxLength: 100 }),
  materiaPrimaId: Type.String(),
  cavidades: Type.Integer({ minimum: 1 }),
  ciclo: Type.Integer({ minimum: 1 }), // segundos
  peso: Type.Number({ minimum: 0 }), // gramos
});

export type CrearProductoBody = Static<typeof crearProductoBodySchema>;

// ---------- Editar ----------

export const editarProductoBodySchema = Type.Object({
  nombre: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  tipo: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
//   Usamos Integer para verificar que el numero es un entero y no un decimal
  cavidades: Type.Optional(Type.Integer({ minimum: 1 })),
  ciclo: Type.Optional(Type.Integer({ minimum: 1 })),
//   Number acepta numeros enteros y decimales
  peso: Type.Optional(Type.Number({ minimum: 0 })),
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
  nombre: Type.String(),
  codigo: Type.String(),
  tipo: Type.String(),
  materiaPrimaId: Type.String(),
  materiaPrimaNombre: Type.String(),
  cavidades: Type.Integer(),
  ciclo: Type.Integer(),
  peso: Type.Number(),
  activo: Type.Boolean(),
});

// Transformamos el mismo schema pero como un array de si mismo.
export const listaProductoResponseSchema = Type.Array(productoResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });