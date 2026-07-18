import { Type, type Static } from "@sinclair/typebox";

// ---------- Login ----------

export const loginBodySchema = Type.Object({
  usuario: Type.String({ minLength: 1, maxLength: 100 }),
  password: Type.String({ minLength: 1, maxLength: 200 }),
});

export type LoginBody = Static<typeof loginBodySchema>;

export const loginResponseSchema = Type.Object({
  usuario: Type.Object({
    id: Type.String(),
    nombre: Type.String(),
    role: Type.String(),
  }),
});

export type LoginResponse = Static<typeof loginResponseSchema>;

// ---------- Respuestas de error genéricas ----------

export const errorResponseSchema = Type.Object({
  error: Type.String(),
});

// ---------- Respuestas de exito genéricas ----------

export const okResponseSchema = Type.Object({
  ok: Type.Boolean(),
});