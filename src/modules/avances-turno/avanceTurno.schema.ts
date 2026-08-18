import { Type, type Static } from "@sinclair/typebox";

const turnoTrabajoSchema = Type.Union([
  Type.Literal("MANANA"),
  Type.Literal("TARDE"),
  Type.Literal("NOCHE"),
]);

const tipoMaterialSolicitudSchema = Type.Union([
  Type.Literal("VIRGEN"),
  Type.Literal("MOLIDO"),
]);

const tipoMaterialSchema = Type.Union([
  Type.Literal("POLIPROPILENO"),
  Type.Literal("POLIESTIRENO"),
  Type.Literal("POLIETILENO"),
])

const destinoPiezasMalPigmentadasSchema = Type.Union([
  Type.Literal("STOCK"),
  Type.Literal("MOLINO"),
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
  tipoMaterialSobrante: Type.Optional(Type.Union([Type.Literal("VIRGEN"), Type.Literal("MOLIDO")])),
  defectoId: Type.Optional(Type.String()),
  descripcionOtro: Type.Optional(Type.String({ maxLength: 300 })),
  operadorId: Type.Optional(Type.String()),
  cicloReal: Type.Optional(Type.Integer({ exclusiveMinimum: 0 })),
  materialKG: Type.Optional(Type.Number({ minimum: 0 })),
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
  operadorId: Type.String(),           // ahora obligatorio
  cicloReal: Type.Integer({ exclusiveMinimum: 0 }), // ahora obligatorio
  materialKG: Type.Number({ minimum: 0 }),          // ahora obligatorio
  piezasCambioColor: Type.Optional(Type.Integer({ minimum: 0 })),
  kgSobrante: Type.Optional(Type.Number({ minimum: 0 })),
  tipoMaterialSobrante: Type.Optional(Type.Union([Type.Literal("VIRGEN"), Type.Literal("MOLIDO")])),
  defectoId: Type.Optional(Type.String()),
  descripcionOtro: Type.Optional(Type.String({ maxLength: 300 })),
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

// ---------- Solicitud de material ----------

export const crearSolicitudMaterialBodySchema = Type.Object({
  tipoMaterial: tipoMaterialSolicitudSchema,
  kgSolicitados: Type.Number({ exclusiveMinimum: 0 }),
  motivo: Type.String({ maxLength: 300 }),
});

export type CrearSolicitudMaterialBody = Static<typeof crearSolicitudMaterialBodySchema>;

export const solicitudMaterialParamsSchema = Type.Object({ id: Type.String() });
export type SolicitudMaterialParams = Static<typeof solicitudMaterialParamsSchema>;

export const solicitudMaterialResponseSchema = Type.Object({
  id: Type.String(),
  avanceTurnoId: Type.String(),
  tipoMaterial: tipoMaterialSolicitudSchema,
  kgSolicitados: Type.Number(),
  motivo: Type.String(),
  confirmado: Type.Boolean(),
  confirmadoPorNombre: Type.Union([Type.String(), Type.Null()]),
  confirmadoEn: Type.Union([Type.String(), Type.Null()]),
  materiaPrimaNombre: Type.String(), 
  // Nuevo: información derivada de la orden, según el tipo de material solicitado
  pigmentoColor: Type.Union([Type.String(), Type.Null()]), // solo aplica cuando tipoMaterial = VIRGEN
  colorSolidoNombre: Type.Union([Type.String(), Type.Null()]), // solo aplica cuando tipoMaterial = MOLIDO
  supervisorNombre: Type.String(),           
  maquinaNombre: Type.String(),
});

export const listaSolicitudMaterialResponseSchema = Type.Array(solicitudMaterialResponseSchema);

// ---------- Parámetros ----------

export const avanceTurnoParamsSchema = Type.Object({ id: Type.String() });
export type AvanceTurnoParams = Static<typeof avanceTurnoParamsSchema>;

// ---------- Query Params ----------

export const listarAvancesTurnoQuerySchema = Type.Object({
  estado: Type.Optional(Type.Union([Type.Literal("ABIERTO"), Type.Literal("CERRADO")])),
  confirmacionMolinoConfirmado: Type.Optional(Type.Boolean()),
  sobranteConfirmado: Type.Optional(Type.Boolean()),
});

export type ListarAvancesTurnoQuerySchema = Static<typeof listarAvancesTurnoQuerySchema>;

// ---------- Respuestas ----------

export const avanceTurnoResponseSchema = Type.Object({
  id: Type.String(),
  ordenId: Type.String(),
  ordenFolio: Type.String(),
  ordenProductoNombre: Type.String(),    
  ordenPigmentoColor: Type.String(),      
  ordenMaquinaNombre: Type.String(),     
  ordenTotalPiezas: Type.Integer(),  
  ordenPiezasProducidas: Type.Integer(),
  ordenTipoMaterial: tipoMaterialSchema, 
  supervisorId: Type.String(),
  supervisorNombre: Type.String(),
  turno: turnoTrabajoSchema,
  fecha: Type.String(),
  horaInicio: Type.String(),
  horaFin: Type.Union([Type.String(), Type.Null()]),
  estado: Type.Union([Type.Literal("ABIERTO"), Type.Literal("CERRADO")]),
  piezasBuenas: Type.Integer(),
  piezasDefectuosas: Type.Integer(),
  defectoId: Type.Union([Type.String(), Type.Null()]),
  defectoNombre: Type.Union([Type.String(), Type.Null()]),
  cicloReal: Type.Union([Type.Integer(), Type.Null()]),
  materialKG: Type.Union([Type.Number(), Type.Null()]),
  kgMerma: Type.Number(),
  kgPlasta: Type.Number(),
  operadorId: Type.String(),
  operadorNombre: Type.String(),
  piezasCambioColor: Type.Integer(),
  kgSobrante: Type.Union([Type.Number(), Type.Null()]),
  tipoMaterialSobrante: Type.Union([Type.Literal("VIRGEN"), Type.Literal("MOLIDO"), Type.Null()]),
  sobranteConfirmado: Type.Boolean(),
  confirmacionMolinoConfirmado: Type.Union([Type.Boolean(), Type.Null()]),
  observaciones: Type.Union([Type.String(), Type.Null()]),
});

export const listaAvanceTurnoResponseSchema = Type.Array(avanceTurnoResponseSchema);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });

// ---------- Reportar incidencia ----------

export const crearIncidenciaMalPigmentadoBodySchema = Type.Object({
  piezasAfectadas: Type.Integer({ exclusiveMinimum: 0 }),
  destino: destinoPiezasMalPigmentadasSchema,
});

export type CrearIncidenciaMalPigmentadoBody = Static<typeof crearIncidenciaMalPigmentadoBodySchema>;

// ---------- Listar incidencias (query params) ----------

export const listarIncidenciasQuerySchema = Type.Object({
  resuelto: Type.Optional(Type.Boolean()),
  destino: Type.Optional(destinoPiezasMalPigmentadasSchema),
  avanceTurnoId: Type.Optional(Type.String()),
});

export type ListarIncidenciasQuery = Static<typeof listarIncidenciasQuerySchema>;

// ---------- Confirmar recepción en molino ----------

export const confirmarIncidenciaMolinoBodySchema = Type.Object({
  confirmado: Type.Boolean(),
});

export type ConfirmarIncidenciaMolinoBody = Static<typeof confirmarIncidenciaMolinoBodySchema>;

// ---------- Resolver (pigmentos) ----------

export const resolverIncidenciaBodySchema = Type.Object({
  tipoMaterialAgregado: Type.Optional(Type.Union([Type.Literal("VIRGEN"), Type.Literal("MOLIDO")])),
  kgMaterialAgregado: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  gramosPigmentoAgregado: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
});

export type ResolverIncidenciaBody = Static<typeof resolverIncidenciaBodySchema>;

// ---------- Parámetros ----------

export const incidenciaParamsSchema = Type.Object({ id: Type.String() });
export type IncidenciaParams = Static<typeof incidenciaParamsSchema>;

// ---------- Query params ----------

export const listarSolicitudesMaterialQuerySchema = Type.Object({
  confirmado: Type.Optional(Type.Boolean()),
});

export type ListarSolicitudesMaterialQuery = Static<typeof listarSolicitudesMaterialQuerySchema>;

// ---------- Respuestas ----------

export const incidenciaResponseSchema = Type.Object({
  id: Type.String(),
  avanceTurnoId: Type.String(),
  piezasAfectadas: Type.Integer(),
  destino: destinoPiezasMalPigmentadasSchema,
  confirmadoMolino: Type.Union([Type.Boolean(), Type.Null()]),
  resuelto: Type.Boolean(),
  tipoMaterialAgregado: Type.Union([Type.Literal("VIRGEN"), Type.Literal("MOLIDO"), Type.Null()]),
  kgMaterialAgregado: Type.Union([Type.Number(), Type.Null()]),
  gramosPigmentoAgregado: Type.Union([Type.Number(), Type.Null()]),
  materiaPrimaNombre: Type.String(), 
  pigmentoColor: Type.String(),   
  ordenFolio: Type.String(), 
});

// =========== SCHEMA DE TIEMPOS PARO =============

export const listaIncidenciaResponseSchema = Type.Array(incidenciaResponseSchema);

export const crearTiempoParoBodySchema = Type.Object({
  motivoParoId: Type.String(),
  minutos: Type.Integer({ exclusiveMinimum: 0 }),
  observaciones: Type.Optional(Type.String({ maxLength: 300 })),
});

export type CrearTiempoParoBody = Static<typeof crearTiempoParoBodySchema>;

export const tiempoParoResponseSchema = Type.Object({
  id: Type.String(),
  avanceTurnoId: Type.String(),
  motivoParoId: Type.String(),
  motivoParoNombre: Type.String(),
  minutos: Type.Integer(),
  observaciones: Type.Union([Type.String(), Type.Null()]),
});

export const listaTiempoParoResponseSchema = Type.Array(tiempoParoResponseSchema);