import { Type, type Static } from "@sinclair/typebox";

export const crearMotivoParoBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 100 }),
});

export type CrearMotivoParoBody = Static<typeof crearMotivoParoBodySchema>;

export const editarMotivoParoBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 100 }),
});

export type EditarMotivoParoBody = Static<typeof editarMotivoParoBodySchema>;

export const motivoParoParamsSchema = Type.Object({
  id: Type.String(),
});

export type MotivoParoParams = Static<typeof motivoParoParamsSchema>;

export const motivoParoResponseSchema = Type.Object({
  id: Type.String(),
  nombre: Type.String(),
  activo: Type.Boolean(),
});

export const listaMotivoParoResponseSchema = Type.Array(motivoParoResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });