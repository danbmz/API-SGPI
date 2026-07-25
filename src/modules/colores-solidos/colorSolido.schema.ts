import { Type, type Static } from "@sinclair/typebox";

export const crearColorSolidoBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 50 }),
});

export type CrearColorSolidoBody = Static<typeof crearColorSolidoBodySchema>;

export const editarColorSolidoBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 50 }),
});

export type EditarColorSolidoBody = Static<typeof editarColorSolidoBodySchema>;

export const colorSolidoParamsSchema = Type.Object({
  id: Type.String(),
});

export type ColorSolidoParams = Static<typeof colorSolidoParamsSchema>;

export const colorSolidoResponseSchema = Type.Object({
  id: Type.String(),
  nombre: Type.String(),
  activo: Type.Boolean(),
});

export const listaColorSolidoResponseSchema = Type.Array(colorSolidoResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });