import { Type, type Static } from "@sinclair/typebox";

const tipoMaterialSchema = Type.Union([
  Type.Literal("POLIPROPILENO"),
  Type.Literal("POLIESTIRENO"),
  Type.Literal("POLIETILENO"),
]);

const unidadMedidaSchema = Type.Union([
  Type.Literal("KILOGRAMO"),
  Type.Literal("GRAMO"),
  Type.Literal("LITRO"),
  Type.Literal("MILILITRO"),
  Type.Literal("PIEZA"),
]);

// ---------- Crear ----------

export const crearMateriaPrimaBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 150 }),
  codigoInterno: Type.String({ minLength: 1, maxLength: 50 }),
  tipo: tipoMaterialSchema,
  proveedor: Type.Optional(Type.String({ maxLength: 150 })),
  unidadMedida: unidadMedidaSchema,
  costoUnitario: Type.Optional(Type.Number({ minimum: 0 })),
  stockMinimo: Type.Number({ minimum: 0, default: 0 }),
});

export type CrearMateriaPrimaBody = Static<typeof crearMateriaPrimaBodySchema>;

// ---------- Editar ----------

export const editarMateriaPrimaBodySchema = Type.Object({
  nombre: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  proveedor: Type.Optional(Type.String({ maxLength: 150 })),
  costoUnitario: Type.Optional(Type.Number({ minimum: 0 })),
  stockMinimo: Type.Optional(Type.Number({ minimum: 0 })),
});

export type EditarMateriaPrimaBody = Static<typeof editarMateriaPrimaBodySchema>;

// ---------- Parámetros ----------

export const materiaPrimaParamsSchema = Type.Object({
  id: Type.String(),
});

export type MateriaPrimaParams = Static<typeof materiaPrimaParamsSchema>;

// ---------- Respuestas ----------

export const materiaPrimaResponseSchema = Type.Object({
  id: Type.String(),
  nombre: Type.String(),
  codigoInterno: Type.String(),
  tipo: tipoMaterialSchema,
  proveedor: Type.Union([Type.String(), Type.Null()]),
  unidadMedida: unidadMedidaSchema,
  costoUnitario: Type.Union([Type.Number(), Type.Null()]),
  activo: Type.Boolean(),
});

export const listaMateriaPrimaResponseSchema = Type.Array(materiaPrimaResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });