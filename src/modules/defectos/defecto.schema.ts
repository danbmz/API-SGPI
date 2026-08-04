import { Type, type Static } from "@sinclair/typebox";

export const crearDefectoProductoBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 100 }),
});

export type CrearDefectoProductoBody = Static<typeof crearDefectoProductoBodySchema>;

export const editarDefectoProductoBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 100 }),
});

export type EditarDefectoProductoBody = Static<typeof editarDefectoProductoBodySchema>;

export const defectoProductoParamsSchema = Type.Object({ id: Type.String() });
export type DefectoProductoParams = Static<typeof defectoProductoParamsSchema>;

export const defectoProductoResponseSchema = Type.Object({
  id: Type.String(),
  nombre: Type.String(),
  activo: Type.Boolean(),
});

export const listaDefectoProductoResponseSchema = Type.Array(defectoProductoResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });