import { Type, type Static } from "@sinclair/typebox";

const turnoTrabajoSchema = Type.Union([
  Type.Literal("MANANA"),
  Type.Literal("TARDE"),
  Type.Literal("NOCHE"),
]);

// ---------- Crear (con estado ABIERTO) ----------

export const crearAvanceTurnoBodySchema = Type.Object({
  ordenId: Type.String(),
  turno: turnoTrabajoSchema,
  fecha: Type.String({ format: "date" }),
  horaInicio: Type.String({ format: "date-time" }),
});

export type CrearAvanceTurnoBody = Static<typeof crearAvanceTurnoBodySchema>;

// ---------- Actualizar mientras está ABIERTO (guardar borrador) ----------

export const actualizarAvanceTurnoBodySchema = Type.Object({
  piezasBuenas: Type.Optional(Type.Integer({ minimum: 0 })),
  piezasDefectuosas: Type.Optional(Type.Integer({ minimum: 0 })),
  kgMerma: Type.Optional(Type.Number({ minimum: 0 })),
  kgPlasta: Type.Optional(Type.Number({ minimum: 0 })),
  piezasCambioColor: Type.Optional(Type.Integer({ minimum: 0 })),
  kgSobrante: Type.Optional(Type.Number({ minimum: 0 })),
  observaciones: Type.Optional(Type.String({ maxLength: 500 })),
});

export type ActualizarAvanceTurnoBody = Static<typeof actualizarAvanceTurnoBodySchema>;

// ---------- Cerrar ----------

export const cerrarAvanceTurnoBodySchema = Type.Object({
  horaFin: Type.String({ format: "date-time" }),
  piezasBuenas: Type.Integer({ exclusiveMinimum: 0 }),        
  piezasDefectuosas: Type.Integer({ minimum: 0 }),   
  kgMerma: Type.Number({ minimum: 0 }),               
  kgPlasta: Type.Number({ minimum: 0 }),               
  piezasCambioColor: Type.Optional(Type.Integer({ minimum: 0 })), 
  kgSobrante: Type.Optional(Type.Number({ minimum: 0 })),          
  observaciones: Type.Optional(Type.String({ maxLength: 500 })),   
});

export type CerrarAvanceTurnoBody = Static<typeof cerrarAvanceTurnoBodySchema>;

// ---------- Confirmación de molino ----------

export const confirmarMolinoBodySchema = Type.Object({
  kgMermaRecibida: Type.Number({ minimum: 0 }),
  kgPlastaRecibida: Type.Number({ minimum: 0 }),
  piezasMalasRecibidas: Type.Integer({ minimum: 0 }),
  piezasCambioColorRecibidas: Type.Integer({ minimum: 0 }),
});

export type ConfirmarMolinoBody = Static<typeof confirmarMolinoBodySchema>;

// ---------- Confirmación de sobrante (encargado de pigmentos) ----------

export const confirmarSobranteBodySchema = Type.Object({
  confirmado: Type.Boolean(),
});

export type ConfirmarSobranteBody = Static<typeof confirmarSobranteBodySchema>;

// ---------- Parámetros ----------

export const avanceTurnoParamsSchema = Type.Object({ id: Type.String() });
export type AvanceTurnoParams = Static<typeof avanceTurnoParamsSchema>;

// ---------- Respuestas ----------

export const avanceTurnoResponseSchema = Type.Object({
  id: Type.String(),
  ordenId: Type.String(),
  ordenFolio: Type.String(),
  supervisorId: Type.String(),
  supervisorNombre: Type.String(),
  turno: turnoTrabajoSchema,
  fecha: Type.String(),
  horaInicio: Type.String(),
  horaFin: Type.Union([Type.String(), Type.Null()]),
  estado: Type.Union([Type.Literal("ABIERTO"), Type.Literal("CERRADO")]),
  piezasBuenas: Type.Integer(),
  piezasDefectuosas: Type.Integer(),
  kgMerma: Type.Number(),
  kgPlasta: Type.Number(),
  piezasCambioColor: Type.Integer(),
  kgSobrante: Type.Union([Type.Number(), Type.Null()]),
  sobranteConfirmado: Type.Boolean(),
  confirmacionMolinoConfirmado: Type.Union([Type.Boolean(), Type.Null()]),
  observaciones: Type.Union([Type.String(), Type.Null()]),
});

export const listaAvanceTurnoResponseSchema = Type.Array(avanceTurnoResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });