import { Type, type Static } from "@sinclair/typebox";

const tipoInventarioSchema = Type.Union([
  Type.Literal("MATERIA_PRIMA"),
  Type.Literal("PIGMENTO"),
  Type.Literal("PRODUCTO"),
  Type.Literal("MOLIDO"),
  Type.Literal("MATERIAL_PIGMENTADO"),
]);

const origenMolidoSchema = Type.Union([Type.Literal("INTERNO"), Type.Literal("COMPRADO")]);

const tipoMaterialSchema = Type.Union([
  Type.Literal("POLIPROPILENO"),
  Type.Literal("POLIESTIRENO"),
  Type.Literal("POLIETILENO"),
]);

// ---------- Entrada de proveedor ----------

export const entradaProveedorBodySchema = Type.Union([
  Type.Object({
    tipoInventario: Type.Literal("MATERIA_PRIMA"),
    materiaPrimaId: Type.String(),
    cantidad: Type.Number({ exclusiveMinimum: 0 }),
    descripcion: Type.Optional(Type.String({ maxLength: 300 })),
  }),
  Type.Object({
    tipoInventario: Type.Literal("PIGMENTO"),
    pigmentoId: Type.String(),
    cantidad: Type.Number({ exclusiveMinimum: 0 }),
    descripcion: Type.Optional(Type.String({ maxLength: 300 })),
  }),
  Type.Object({
    tipoInventario: Type.Literal("MOLIDO"),
    tipoMaterial: tipoMaterialSchema,
    colorSolidoId: Type.String(), // antes: color con enum
    cantidad: Type.Number({ exclusiveMinimum: 0 }),
    descripcion: Type.Optional(Type.String({ maxLength: 300 })),
  }),
]);

export type EntradaProveedorBody = Static<typeof entradaProveedorBodySchema>;

// ---------- Ajuste manual ----------

export const ajusteManualBodySchema = Type.Union([
  Type.Object({
    tipoInventario: Type.Literal("MATERIA_PRIMA"),
    materiaPrimaId: Type.String(),
    diferencia: Type.Number(),
    descripcion: Type.String({ minLength: 1, maxLength: 300 }),
  }),
  Type.Object({
    tipoInventario: Type.Literal("PIGMENTO"),
    pigmentoId: Type.String(),
    diferencia: Type.Number(),
    descripcion: Type.String({ minLength: 1, maxLength: 300 }),
  }),
  Type.Object({
    tipoInventario: Type.Literal("PRODUCTO"),
    productoId: Type.String(),
    pigmentoId: Type.String(),
    diferencia: Type.Number(),
    descripcion: Type.String({ minLength: 1, maxLength: 300 }),
  }),
  Type.Object({
    tipoInventario: Type.Literal("MOLIDO"),
    tipoMaterial: tipoMaterialSchema,
    origen: origenMolidoSchema,
    colorSolidoId: Type.String(), // antes: color con enum
    diferencia: Type.Number(),
    descripcion: Type.String({ minLength: 1, maxLength: 300 }),
  }),
  Type.Object({
    tipoInventario: Type.Literal("MATERIAL_PIGMENTADO"),
    materiaPrimaId: Type.String(),
    pigmentoId: Type.String(),
    diferencia: Type.Number(),
    descripcion: Type.String({ minLength: 1, maxLength: 300 }),
  }),
]);

export type AjusteManualBody = Static<typeof ajusteManualBodySchema>;

// ---------- Historial de movimientos (query params) ----------

export const historialQuerySchema = Type.Object({
  tipoInventario: tipoInventarioSchema,
  materiaPrimaId: Type.Optional(Type.String()),
  pigmentoId: Type.Optional(Type.String()),
  productoId: Type.Optional(Type.String()),
  limite: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
});

export type HistorialQuery = Static<typeof historialQuerySchema>;

// ---------- Respuestas ----------

export const movimientoResponseSchema = Type.Object({
  id: Type.String(),
  tipoInventario: tipoInventarioSchema,
  tipoMovimiento: Type.String(),
  motivo: Type.String(),
  descripcion: Type.Union([Type.String(), Type.Null()]),
  cantidadAnterior: Type.Number(),
  cantidadMovimiento: Type.Number(),
  cantidadNueva: Type.Number(),
  unidadMedida: Type.String(),
  usuarioNombre: Type.String(),
  createdAt: Type.String(),
});

export const listaMovimientosResponseSchema = Type.Array(movimientoResponseSchema);

export const inventarioMateriaPrimaItemSchema = Type.Object({
  materiaPrimaId: Type.String(),
  nombre: Type.String(),
  codigoInterno: Type.String(),
  unidadMedida: Type.String(),
  cantidadActual: Type.Number(),
  stockMinimo: Type.Number(),
});
export const listaInventarioMateriaPrimaResponseSchema = Type.Array(inventarioMateriaPrimaItemSchema);

export const inventarioPigmentoItemSchema = Type.Object({
  pigmentoId: Type.String(),
  color: Type.String(),
  categoriaColor: Type.String(),
  tipo: Type.String(),
  tipoMaterial: tipoMaterialSchema,
  cantidadActual: Type.Number(),
  stockMinimo: Type.Number(),
});
export const listaInventarioPigmentoResponseSchema = Type.Array(inventarioPigmentoItemSchema);

export const inventarioProductoItemSchema = Type.Object({
  productoId: Type.String(),
  productoNombre: Type.String(),
  pigmentoId: Type.String(),
  color: Type.String(),
  categoriaColor: Type.String(),
  cantidadActual: Type.Number(),
});
export const listaInventarioProductoResponseSchema = Type.Array(inventarioProductoItemSchema);

export const inventarioMolidoItemSchema = Type.Object({
  tipoMaterial: tipoMaterialSchema,
  origen: origenMolidoSchema,
  // Codigo interno?
  colorSolidoId: Type.String(),
  colorSolidoNombre: Type.String(),
  cantidadActual: Type.Number(),
});
export const listaInventarioMolidoResponseSchema = Type.Array(inventarioMolidoItemSchema);

export const inventarioMaterialPigmentadoItemSchema = Type.Object({
  combinacionId: Type.String(),
  materiaPrimaNombre: Type.String(),
  pigmentoColor: Type.String(),
  pigmentoCategoria: Type.String(),
  cantidadActual: Type.Number(),
});
export const listaInventarioMaterialPigmentadoResponseSchema = Type.Array(
  inventarioMaterialPigmentadoItemSchema
);

export const okResponseSchema = Type.Object({ ok: Type.Boolean() });
export const errorResponseSchema = Type.Object({ error: Type.String() });

// SALIDAS DE PRODUCTOS

const motivoSalidaProductoSchema = Type.Union([
  Type.Literal("ENTREGA_PEDIDO"),
  Type.Literal("VENTA"),
]);

const itemSalidaProductoSchema = Type.Object({
  productoId: Type.String(),
  pigmentoId: Type.String(),
  cantidad: Type.Integer({ exclusiveMinimum: 0 }),
});

export const salidaProductoBodySchema = Type.Object({
  motivo: motivoSalidaProductoSchema,
  pedidoId: Type.Optional(Type.String()), // obligatorio solo si motivo = ENTREGA_PEDIDO
  items: Type.Array(itemSalidaProductoSchema, { minItems: 1 }),
  descripcion: Type.Optional(Type.String({ maxLength: 300 })),
});

export type SalidaProductoBody = Static<typeof salidaProductoBodySchema>;