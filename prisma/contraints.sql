ALTER TABLE historial_movimientos_inventario
ADD CONSTRAINT chk_exclusive_material CHECK (
  ("tipoInventario" = 'MATERIA_PRIMA'
    AND "materiaPrimaId" IS NOT NULL
    AND "pigmentoId" IS NULL AND "productoId" IS NULL AND "pigmentoProductoId" IS NULL
    AND "materialMolidoTipo" IS NULL AND "combinacionMaterialPigmentadoId" IS NULL)
  OR
  ("tipoInventario" = 'PIGMENTO'
    AND "pigmentoId" IS NOT NULL
    AND "materiaPrimaId" IS NULL AND "productoId" IS NULL AND "pigmentoProductoId" IS NULL
    AND "materialMolidoTipo" IS NULL AND "combinacionMaterialPigmentadoId" IS NULL)
  OR
  ("tipoInventario" = 'PRODUCTO'
    AND "productoId" IS NOT NULL AND "pigmentoProductoId" IS NOT NULL
    AND "materiaPrimaId" IS NULL AND "pigmentoId" IS NULL
    AND "materialMolidoTipo" IS NULL AND "combinacionMaterialPigmentadoId" IS NULL)
  OR
  ("tipoInventario" = 'MOLIDO'
    AND "materialMolidoTipo" IS NOT NULL AND "origenMolido" IS NOT NULL AND "colorSolidoId" IS NOT NULL
    AND "materiaPrimaId" IS NULL AND "pigmentoId" IS NULL AND "productoId" IS NULL
    AND "pigmentoProductoId" IS NULL AND "combinacionMaterialPigmentadoId" IS NULL)
  OR
  ("tipoInventario" = 'MATERIAL_PIGMENTADO'
    AND "combinacionMaterialPigmentadoId" IS NOT NULL
    AND "materiaPrimaId" IS NULL AND "pigmentoId" IS NULL AND "productoId" IS NULL
    AND "pigmentoProductoId" IS NULL AND "materialMolidoTipo" IS NULL)
);

ALTER TABLE historial_movimientos_inventario
ADD CONSTRAINT chk_aritmetica_movimiento CHECK (
  "cantidadAnterior" + "cantidadMovimiento" = "cantidadNueva"
);

ALTER TABLE historial_movimientos_inventario
ADD CONSTRAINT chk_signo_movimiento CHECK (
  ("tipoMovimiento" = 'ENTRADA' AND "cantidadMovimiento" > 0) OR
  ("tipoMovimiento" = 'SALIDA' AND "cantidadMovimiento" < 0) OR
  ("tipoMovimiento" = 'AJUSTE')
);