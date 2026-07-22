import { Type, type Static } from "@sinclair/typebox";

const tipoProcesoMaquinaSchema = Type.Union([
  Type.Literal("INYECCION"),
]);

const estadoMaquinaSchema = Type.Union([
  Type.Literal("ACTIVA"),
  Type.Literal("INACTIVA"),
  Type.Literal("MANTENIMIENTO"),
]);

// ---------- Crear ----------

export const crearMaquinaBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 100 }),
  codigo: Type.String({ minLength: 1, maxLength: 50 }),
  numero: Type.Integer({ minimum: 1 }),
  tipoProceso: tipoProcesoMaquinaSchema,
  capacidadTon: Type.Number({ minimum: 0 }),
});

export type CrearMaquinaBody = Static<typeof crearMaquinaBodySchema>;

// ---------- Editar ----------

export const editarMaquinaBodySchema = Type.Object({
  nombre: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  capacidadTon: Type.Optional(Type.Number({ minimum: 0 })),
});

export type EditarMaquinaBody = Static<typeof editarMaquinaBodySchema>;

// ---------- Cambiar estado ----------

export const cambiarEstadoMaquinaBodySchema = Type.Object({
  estado: estadoMaquinaSchema,
});

export type CambiarEstadoMaquinaBody = Static<typeof cambiarEstadoMaquinaBodySchema>;

// ---------- Parámetros ----------

export const maquinaParamsSchema = Type.Object({
  id: Type.String(),
});

export type MaquinaParams = Static<typeof maquinaParamsSchema>;

// ---------- Respuestas ----------

export const maquinaResponseSchema = Type.Object({
  id: Type.String(),
  nombre: Type.String(),
  codigo: Type.String(),
  numero: Type.Integer(),
  tipoProceso: tipoProcesoMaquinaSchema,
  capacidadTon: Type.Number(),
  estado: estadoMaquinaSchema,
});

export const listaMaquinaResponseSchema = Type.Array(maquinaResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });