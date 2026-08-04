import { Type, type Static } from "@sinclair/typebox";

export const crearOperadorBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 150 }),
});

export type CrearOperadorBody = Static<typeof crearOperadorBodySchema>;

export const editarOperadorBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 150 }),
});

export type EditarOperadorBody = Static<typeof editarOperadorBodySchema>;

export const operadorParamsSchema = Type.Object({ id: Type.String() });
export type OperadorParams = Static<typeof operadorParamsSchema>;

export const operadorResponseSchema = Type.Object({
  id: Type.String(),
  nombre: Type.String(),
  activo: Type.Boolean(),
});

export const listaOperadorResponseSchema = Type.Array(operadorResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });