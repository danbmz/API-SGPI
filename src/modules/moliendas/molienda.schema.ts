import { Type, type Static } from "@sinclair/typebox";

const tipoMaterialSchema = Type.Union([
  Type.Literal("POLIPROPILENO"),
  Type.Literal("POLIESTIRENO"),
  Type.Literal("POLIETILENO"),
]);

export const crearMoliendaBodySchema = Type.Object({
  tipoMaterial: tipoMaterialSchema,
  colorSolidoId: Type.String(),
  kgIngresados: Type.Number({ exclusiveMinimum: 0 }),
  fecha: Type.String({ format: "date" }),
  observaciones: Type.Optional(Type.String({ maxLength: 300 })),
  avanceTurnoIds: Type.Array(Type.String()),
  incidenciaIds: Type.Array(Type.String()),
});

export type CrearMoliendaBody = Static<typeof crearMoliendaBodySchema>;

export const moliendaParamsSchema = Type.Object({ id: Type.String() });
export type MoliendaParams = Static<typeof moliendaParamsSchema>;

// ---------- Pendientes de moler ----------

export const avancePendienteSchema = Type.Object({
  id: Type.String(),
  ordenFolio: Type.String(),
  pigmentoColor: Type.String(),
  kgMerma: Type.Number(),
  kgPlasta: Type.Number(),
});

export const incidenciaPendienteSchema = Type.Object({
  id: Type.String(),
  ordenFolio: Type.String(),
  pigmentoColor: Type.String(),
  piezasAfectadas: Type.Integer(),
});

export const pendientesResponseSchema = Type.Object({
  avances: Type.Array(avancePendienteSchema),
  incidencias: Type.Array(incidenciaPendienteSchema),
});

// ---------- Respuesta de molienda ----------

export const moliendaResponseSchema = Type.Object({
  id: Type.String(),
  tipoMaterial: tipoMaterialSchema,
  colorSolidoId: Type.String(),
  colorSolidoNombre: Type.String(),
  kgIngresados: Type.Number(),
  fecha: Type.String(),
  observaciones: Type.Union([Type.String(), Type.Null()]),
  totalAvances: Type.Integer(),
  totalIncidencias: Type.Integer(),
  createdAt: Type.String(),
});

export const listaMoliendaResponseSchema = Type.Array(moliendaResponseSchema);

export const errorResponseSchema = Type.Object({ error: Type.String() });