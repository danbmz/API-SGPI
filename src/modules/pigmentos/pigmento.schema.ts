import { Type, type Static } from "@fastify/type-provider-typebox";

const categoriaColorPigmentoSchema = Type.Union([
  Type.Literal("SOLIDO"),
  Type.Literal("SOLIDO_PASTEL"),
  Type.Literal("NEON_TRASLUCIDO"),
  Type.Literal("JARRA_NEON_PASTEL"),
  Type.Literal("NATURAL"),
]);

const tipoPigmentoSchema = Type.Union([
  Type.Literal("MASTER"),
  Type.Literal("POLVO"),
]);

const tipoMaterialSchema = Type.Union([
  Type.Literal("POLIPROPILENO"),
  Type.Literal("POLIESTIRENO"),
  Type.Literal("POLIETILENO"),
]);

// ---------- Crear ----------

export const crearPigmentoBodySchema = Type.Object({
  color: Type.String({ minLength: 1, maxLength: 100 }),
  categoriaColor: categoriaColorPigmentoSchema,
  tipo: tipoPigmentoSchema,
  tipoMaterial: tipoMaterialSchema,
  dosisGrPorKg: Type.Number({ minimum: 0 }),
  stockMinimo: Type.Number({ minimum: 0, default: 0 }),
  costoUnitario: Type.Optional(Type.Number({ minimum: 0 })),
  // Falta codigo
  // Unidad medida y proveedor?
});

export type CrearPigmentoBody = Static<typeof crearPigmentoBodySchema>;

// ---------- Editar ----------
// "categoriaColor, tipo, tipoMaterual y color" no están porque la combinación que define la identidad del pigmento ([tipoMaterial, color, categoriaColor, tipo]) no debería cambiar después de creado.
export const editarPigmentoBodySchema = Type.Object({
  dosisGrPorKg: Type.Optional(Type.Number({ minimum: 0 })),
  stockMinimo: Type.Optional(Type.Number({ minimum: 0 })),
});

export type EditarPigmentoBody = Static<typeof editarPigmentoBodySchema>;

// ---------- Parámetros ----------

export const pigmentoParamsSchema = Type.Object({
  id: Type.String(),
});

export type PigmentoParams = Static<typeof pigmentoParamsSchema>;

// ---------- Respuestas ----------

export const pigmentoResponseSchema = Type.Object({
  id: Type.String(),
  color: Type.String(),
  categoriaColor: categoriaColorPigmentoSchema,
  tipo: tipoPigmentoSchema,
  dosisGrPorKg: Type.Number(),
  tipoMaterial: tipoMaterialSchema,
  activo: Type.Boolean(),
  // stockActual: Type.Integer(),
  // stockMinimo: Type.Integer(),
});

export const listaPigmentoResponseSchema = Type.Array(pigmentoResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });