-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'SUPERVISOR', 'MOLINO', 'PIGMENTOS', 'PROGRAMADOR');

-- CreateEnum
CREATE TYPE "ModuloAuditoria" AS ENUM ('AUTH', 'USUARIOS', 'INVENTARIO', 'ORDENES', 'MOLINO', 'CATALOGOS', 'PIGMENTOS');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('POLIPROPILENO', 'POLIESTIRENO', 'POLIETILENO');

-- CreateEnum
CREATE TYPE "UnidadMedida" AS ENUM ('KILOGRAMO', 'GRAMO', 'LITRO', 'MILILITRO', 'PIEZA');

-- CreateEnum
CREATE TYPE "OrigenMolido" AS ENUM ('INTERNO', 'COMPRADO');

-- CreateEnum
CREATE TYPE "CategoriaColorPigmento" AS ENUM ('SOLIDO', 'SOLIDO_PASTEL', 'NEON_TRASLUCIDO', 'JARRA_NEON_PASTEL', 'NATURAL');

-- CreateEnum
CREATE TYPE "TipoPigmento" AS ENUM ('MASTER', 'POLVO');

-- CreateEnum
CREATE TYPE "TipoProcesoMaquina" AS ENUM ('INYECCION');

-- CreateEnum
CREATE TYPE "EstadoMaquina" AS ENUM ('ACTIVA', 'INACTIVA', 'MANTENIMIENTO');

-- CreateEnum
CREATE TYPE "CategoriaMotivoParo" AS ENUM ('INICIO', 'MATERIAL', 'MOLDE', 'MAQUINA', 'OTROS');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoOrdenProduccion" AS ENUM ('BORRADOR', 'ACTIVA', 'EN_PROGRESO', 'PAUSADA', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoMaterialOrden" AS ENUM ('VIRGEN', 'MEZCLA_MOLIDO_INTERNO', 'MEZCLA_RECICLADO');

-- CreateEnum
CREATE TYPE "TurnoTrabajo" AS ENUM ('MANANA', 'TARDE', 'NOCHE');

-- CreateEnum
CREATE TYPE "EstadoAvanceTurno" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TipoMaterialSolicitud" AS ENUM ('VIRGEN', 'MOLIDO');

-- CreateEnum
CREATE TYPE "DestinoPiezasMalPigmentadas" AS ENUM ('STOCK', 'MOLINO');

-- CreateEnum
CREATE TYPE "TipoInventario" AS ENUM ('MATERIA_PRIMA', 'PIGMENTO', 'PRODUCTO', 'MOLIDO', 'MATERIAL_PIGMENTADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "MotivoMovimientoInventario" AS ENUM ('ENTRADA_PROVEEDOR', 'PRODUCCION', 'CONSUMO_PRODUCCION', 'DEVOLUCION_MATERIAL', 'MOLIENDA_COMPLETADA', 'PRODUCTO_DEFECTUOSO', 'CAMBIO_COLOR', 'MERMA_PRODUCCION', 'PLASTA', 'VENTA', 'ENTREGA_PEDIDO', 'REPIGMENTAR', 'DESECHO', 'AJUSTE_MANUAL', 'CORRECCION_INVENTARIO', 'CANCELACION_ORDEN', 'SUSTITUCION_MATERIAL_PIGMENTADO');

-- CreateEnum
CREATE TYPE "ReferenciaMovimientoInventario" AS ENUM ('ORDEN_PRODUCCION', 'AVANCE_TURNO', 'MOLIENDA', 'SOLICITUD_MATERIAL', 'PEDIDO', 'INCIDENCIA_MAL_PIGMENTADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "usuarioId" BIGINT NOT NULL,
    "usuarioLogin" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "modulo" "ModuloAuditoria" NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidadId" BIGINT,
    "detalle" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materias_primas" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigoInterno" TEXT NOT NULL,
    "tipo" "TipoMaterial" NOT NULL,
    "proveedor" TEXT,
    "unidadMedida" "UnidadMedida" NOT NULL,
    "costoUnitario" DECIMAL(10,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materias_primas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_materias_primas" (
    "id" BIGSERIAL NOT NULL,
    "materiaPrimaId" BIGINT NOT NULL,
    "cantidadActual" DECIMAL(10,3) NOT NULL,
    "stockMinimo" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_materias_primas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colores_solidos" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colores_solidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_molido" (
    "id" BIGSERIAL NOT NULL,
    "tipoMaterial" "TipoMaterial" NOT NULL,
    "origen" "OrigenMolido" NOT NULL,
    "colorSolidoId" BIGINT NOT NULL,
    "cantidadActual" DECIMAL(10,3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_molido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_molido" (
    "id" BIGSERIAL NOT NULL,
    "tipoMaterial" "TipoMaterial" NOT NULL,
    "origen" "OrigenMolido" NOT NULL,
    "codigoInterno" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_molido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pigmentos" (
    "id" BIGSERIAL NOT NULL,
    "color" TEXT NOT NULL,
    "categoriaColor" "CategoriaColorPigmento" NOT NULL,
    "tipo" "TipoPigmento" NOT NULL,
    "dosisGrPorKg" DECIMAL(10,3) NOT NULL,
    "costoUnitario" DECIMAL(10,2),
    "tipoMaterial" "TipoMaterial" NOT NULL,
    "colorSolidoId" BIGINT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pigmentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_pigmentos" (
    "id" BIGSERIAL NOT NULL,
    "pigmentoId" BIGINT NOT NULL,
    "cantidadActual" DECIMAL(10,3) NOT NULL,
    "stockMinimo" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_pigmentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combinaciones_material_pigmentado" (
    "id" BIGSERIAL NOT NULL,
    "materiaPrimaId" BIGINT NOT NULL,
    "pigmentoId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combinaciones_material_pigmentado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_material_pigmentado" (
    "id" BIGSERIAL NOT NULL,
    "combinacionId" BIGINT NOT NULL,
    "cantidadActual" DECIMAL(10,3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_material_pigmentado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tipoMaterial" "TipoMaterial" NOT NULL,
    "piezasPorEmpaque" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cavidades" INTEGER NOT NULL,
    "ciclo" INTEGER NOT NULL,
    "peso" DECIMAL(10,2) NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_producto_terminado" (
    "id" BIGSERIAL NOT NULL,
    "productoId" BIGINT NOT NULL,
    "pigmentoId" BIGINT NOT NULL,
    "cantidadActual" DECIMAL(10,3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_producto_terminado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maquinas" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipoProceso" "TipoProcesoMaquina" NOT NULL,
    "capacidadTon" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoMaquina" NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maquinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operadores" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivos_paro" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaMotivoParo" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motivos_paro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defectos_producto" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defectos_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_detalle" (
    "id" BIGSERIAL NOT NULL,
    "pedidoId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "pigmentoId" BIGINT,
    "cantidadSolicitada" INTEGER NOT NULL,
    "cantidadProducida" INTEGER NOT NULL DEFAULT 0,
    "cantidadEntregada" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedido_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" BIGSERIAL NOT NULL,
    "numeroPedido" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "remision" TEXT,
    "descripcion" TEXT,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "fechaEntrega" DATE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_produccion" (
    "id" BIGSERIAL NOT NULL,
    "folio" TEXT NOT NULL,
    "estado" "EstadoOrdenProduccion" NOT NULL DEFAULT 'BORRADOR',
    "productoId" BIGINT NOT NULL,
    "totalPiezas" INTEGER NOT NULL,
    "observaciones" TEXT,
    "tipoMaterial" "TipoMaterialOrden" NOT NULL,
    "pedidoDetalleId" BIGINT NOT NULL,
    "materiaPrimaId" BIGINT NOT NULL,
    "inventarioMolidoId" BIGINT,
    "porcentajeVirgen" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "porcentajeMolido" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pigmentoId" BIGINT NOT NULL,
    "aditivoDescripcion" TEXT,
    "maquinaId" BIGINT NOT NULL,
    "piezasPorHora" INTEGER NOT NULL,
    "piezasPorTurno" INTEGER NOT NULL,
    "piezasPorDia" INTEGER NOT NULL,
    "tiempoEstimadoHrs" DECIMAL(10,2) NOT NULL,
    "materiaPrimaTotalKg" DECIMAL(10,3) NOT NULL,
    "materiaPrimaVirgenKg" DECIMAL(10,3) NOT NULL,
    "materialMolidoKg" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "pigmentoRequeridoKg" DECIMAL(10,3) NOT NULL,
    "materialSiguienteConfirmado" BOOLEAN NOT NULL DEFAULT false,
    "materialConfirmadoEn" TIMESTAMP(3),
    "combinacionMaterialPigmentadoUsadaId" BIGINT,
    "materialPigmentadoUsadoKg" DECIMAL(10,3),
    "totalPiezasBuenasFinal" INTEGER,
    "totalPiezasDefectuosasFinal" INTEGER,
    "totalKgMermaFinal" DECIMAL(10,3),
    "totalKgPlastaFinal" DECIMAL(10,3),
    "totalKgMaterialUsadoFinal" DECIMAL(10,3),
    "usuarioCreadorId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avances_turno" (
    "id" BIGSERIAL NOT NULL,
    "ordenId" BIGINT NOT NULL,
    "supervisorId" BIGINT NOT NULL,
    "turno" "TurnoTrabajo" NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TIMESTAMP(3) NOT NULL,
    "horaFin" TIMESTAMP(3),
    "estado" "EstadoAvanceTurno" NOT NULL DEFAULT 'ABIERTO',
    "borradorGuardado" BOOLEAN NOT NULL DEFAULT false,
    "piezasBuenas" INTEGER NOT NULL DEFAULT 0,
    "piezasDefectuosas" INTEGER NOT NULL DEFAULT 0,
    "defectoProductoId" BIGINT,
    "descripcionOtro" TEXT,
    "operadorId" BIGINT,
    "cicloReal" INTEGER,
    "materialKG" DECIMAL(10,3),
    "kgMerma" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "kgPlasta" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "piezasCambioColor" INTEGER NOT NULL DEFAULT 0,
    "kgSobrante" DECIMAL(10,3),
    "tipoMaterialSobrante" "TipoMaterialSolicitud",
    "sobranteConfirmado" BOOLEAN NOT NULL DEFAULT false,
    "sobranteConfirmadoPorId" BIGINT,
    "sobranteConfirmadoEn" TIMESTAMP(3),
    "confirmacionMolinoConfirmado" BOOLEAN,
    "kgMermaRecibida" DECIMAL(10,3),
    "kgPlastaRecibida" DECIMAL(10,3),
    "piezasMalasRecibidas" INTEGER,
    "piezasCambioColorRecibidas" INTEGER,
    "confirmacionMolinoHayDiferencia" BOOLEAN,
    "confirmacionMolinoPorId" BIGINT,
    "confirmacionMolinoEn" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avances_turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiempos_paro" (
    "id" BIGSERIAL NOT NULL,
    "avanceTurnoId" BIGINT NOT NULL,
    "motivoParoId" BIGINT NOT NULL,
    "minutos" INTEGER NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tiempos_paro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_material" (
    "id" BIGSERIAL NOT NULL,
    "avanceTurnoId" BIGINT NOT NULL,
    "tipoMaterial" "TipoMaterialSolicitud" NOT NULL,
    "kgSolicitados" DECIMAL(10,3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "confirmadoPorId" BIGINT,
    "confirmadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencias_material_mal_pigmentado" (
    "id" BIGSERIAL NOT NULL,
    "avanceTurnoId" BIGINT NOT NULL,
    "piezasAfectadas" INTEGER NOT NULL,
    "destino" "DestinoPiezasMalPigmentadas" NOT NULL,
    "confirmadoMolino" BOOLEAN,
    "piezasRecibidas" INTEGER,
    "hayDiferenciaMolino" BOOLEAN,
    "confirmadoMolinoPorId" BIGINT,
    "confirmadoMolinoEn" TIMESTAMP(3),
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "tipoMaterialAgregado" "TipoMaterialSolicitud",
    "kgMaterialAgregado" DECIMAL(10,3),
    "gramosPigmentoAgregado" DECIMAL(10,3),
    "resueltoPorId" BIGINT,
    "resueltoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencias_material_mal_pigmentado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moliendas" (
    "id" BIGSERIAL NOT NULL,
    "tipoMaterial" "TipoMaterial" NOT NULL,
    "colorSolidoId" BIGINT NOT NULL,
    "kgIngresados" DECIMAL(10,3) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moliendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moliendas_avances_turno" (
    "id" BIGSERIAL NOT NULL,
    "moliendaId" BIGINT NOT NULL,
    "avanceTurnoId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moliendas_avances_turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moliendas_incidencias" (
    "id" BIGSERIAL NOT NULL,
    "moliendaId" BIGINT NOT NULL,
    "incidenciaId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moliendas_incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" BIGSERIAL NOT NULL,
    "usuarioId" BIGINT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_movimientos_inventario" (
    "id" BIGSERIAL NOT NULL,
    "tipoInventario" "TipoInventario" NOT NULL,
    "tipoMovimiento" "TipoMovimientoInventario" NOT NULL,
    "motivo" "MotivoMovimientoInventario" NOT NULL,
    "descripcion" TEXT,
    "materiaPrimaId" BIGINT,
    "pigmentoId" BIGINT,
    "productoId" BIGINT,
    "pigmentoProductoId" BIGINT,
    "combinacionMaterialPigmentadoId" BIGINT,
    "materialMolidoTipo" "TipoMaterial",
    "origenMolido" "OrigenMolido",
    "colorSolidoId" BIGINT,
    "cantidadAnterior" DECIMAL(10,3) NOT NULL,
    "cantidadMovimiento" DECIMAL(10,3) NOT NULL,
    "cantidadNueva" DECIMAL(10,3) NOT NULL,
    "unidadMedida" "UnidadMedida" NOT NULL,
    "referenciaTipo" "ReferenciaMovimientoInventario",
    "referenciaId" BIGINT,
    "usuarioId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE INDEX "audit_logs_usuarioId_idx" ON "audit_logs"("usuarioId");

-- CreateIndex
CREATE INDEX "audit_logs_modulo_idx" ON "audit_logs"("modulo");

-- CreateIndex
CREATE INDEX "audit_logs_entidad_entidadId_idx" ON "audit_logs"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "materias_primas_codigoInterno_key" ON "materias_primas"("codigoInterno");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_materias_primas_materiaPrimaId_key" ON "inventario_materias_primas"("materiaPrimaId");

-- CreateIndex
CREATE UNIQUE INDEX "colores_solidos_nombre_key" ON "colores_solidos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_molido_tipoMaterial_origen_colorSolidoId_key" ON "inventario_molido"("tipoMaterial", "origen", "colorSolidoId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_molido_codigoInterno_key" ON "tipos_molido"("codigoInterno");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_molido_tipoMaterial_origen_key" ON "tipos_molido"("tipoMaterial", "origen");

-- CreateIndex
CREATE UNIQUE INDEX "pigmentos_tipoMaterial_color_categoriaColor_tipo_key" ON "pigmentos"("tipoMaterial", "color", "categoriaColor", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_pigmentos_pigmentoId_key" ON "inventario_pigmentos"("pigmentoId");

-- CreateIndex
CREATE UNIQUE INDEX "combinaciones_material_pigmentado_materiaPrimaId_pigmentoId_key" ON "combinaciones_material_pigmentado"("materiaPrimaId", "pigmentoId");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_material_pigmentado_combinacionId_key" ON "inventario_material_pigmentado"("combinacionId");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_producto_terminado_productoId_pigmentoId_key" ON "inventario_producto_terminado"("productoId", "pigmentoId");

-- CreateIndex
CREATE UNIQUE INDEX "maquinas_codigo_key" ON "maquinas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "maquinas_numero_key" ON "maquinas"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "motivos_paro_nombre_key" ON "motivos_paro"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "defectos_producto_nombre_key" ON "defectos_producto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numeroPedido_key" ON "pedidos"("numeroPedido");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_produccion_folio_key" ON "ordenes_produccion"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "moliendas_avances_turno_moliendaId_avanceTurnoId_key" ON "moliendas_avances_turno"("moliendaId", "avanceTurnoId");

-- CreateIndex
CREATE UNIQUE INDEX "moliendas_incidencias_moliendaId_incidenciaId_key" ON "moliendas_incidencias"("moliendaId", "incidenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuarioId_idx" ON "refresh_tokens"("usuarioId");

-- CreateIndex
CREATE INDEX "historial_movimientos_inventario_tipoInventario_materiaPrim_idx" ON "historial_movimientos_inventario"("tipoInventario", "materiaPrimaId");

-- CreateIndex
CREATE INDEX "historial_movimientos_inventario_tipoInventario_pigmentoId_idx" ON "historial_movimientos_inventario"("tipoInventario", "pigmentoId");

-- CreateIndex
CREATE INDEX "historial_movimientos_inventario_tipoInventario_productoId_idx" ON "historial_movimientos_inventario"("tipoInventario", "productoId");

-- CreateIndex
CREATE INDEX "historial_movimientos_inventario_tipoInventario_pigmentoPro_idx" ON "historial_movimientos_inventario"("tipoInventario", "pigmentoProductoId");

-- CreateIndex
CREATE INDEX "historial_movimientos_inventario_tipoInventario_materialMol_idx" ON "historial_movimientos_inventario"("tipoInventario", "materialMolidoTipo");

-- CreateIndex
CREATE INDEX "historial_movimientos_inventario_tipoInventario_combinacion_idx" ON "historial_movimientos_inventario"("tipoInventario", "combinacionMaterialPigmentadoId");

-- CreateIndex
CREATE INDEX "historial_movimientos_inventario_motivo_idx" ON "historial_movimientos_inventario"("motivo");

-- CreateIndex
CREATE INDEX "historial_movimientos_inventario_referenciaTipo_referenciaI_idx" ON "historial_movimientos_inventario"("referenciaTipo", "referenciaId");

-- CreateIndex
CREATE INDEX "historial_movimientos_inventario_createdAt_idx" ON "historial_movimientos_inventario"("createdAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_materias_primas" ADD CONSTRAINT "inventario_materias_primas_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "materias_primas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_molido" ADD CONSTRAINT "inventario_molido_colorSolidoId_fkey" FOREIGN KEY ("colorSolidoId") REFERENCES "colores_solidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pigmentos" ADD CONSTRAINT "pigmentos_colorSolidoId_fkey" FOREIGN KEY ("colorSolidoId") REFERENCES "colores_solidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_pigmentos" ADD CONSTRAINT "inventario_pigmentos_pigmentoId_fkey" FOREIGN KEY ("pigmentoId") REFERENCES "pigmentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combinaciones_material_pigmentado" ADD CONSTRAINT "combinaciones_material_pigmentado_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "materias_primas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combinaciones_material_pigmentado" ADD CONSTRAINT "combinaciones_material_pigmentado_pigmentoId_fkey" FOREIGN KEY ("pigmentoId") REFERENCES "pigmentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_material_pigmentado" ADD CONSTRAINT "inventario_material_pigmentado_combinacionId_fkey" FOREIGN KEY ("combinacionId") REFERENCES "combinaciones_material_pigmentado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_producto_terminado" ADD CONSTRAINT "inventario_producto_terminado_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_producto_terminado" ADD CONSTRAINT "inventario_producto_terminado_pigmentoId_fkey" FOREIGN KEY ("pigmentoId") REFERENCES "pigmentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_detalle" ADD CONSTRAINT "pedido_detalle_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_detalle" ADD CONSTRAINT "pedido_detalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_detalle" ADD CONSTRAINT "pedido_detalle_pigmentoId_fkey" FOREIGN KEY ("pigmentoId") REFERENCES "pigmentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_pedidoDetalleId_fkey" FOREIGN KEY ("pedidoDetalleId") REFERENCES "pedido_detalle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "materias_primas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_inventarioMolidoId_fkey" FOREIGN KEY ("inventarioMolidoId") REFERENCES "inventario_molido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_pigmentoId_fkey" FOREIGN KEY ("pigmentoId") REFERENCES "pigmentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "maquinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_combinacionMaterialPigmentadoUsadaId_fkey" FOREIGN KEY ("combinacionMaterialPigmentadoUsadaId") REFERENCES "combinaciones_material_pigmentado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_usuarioCreadorId_fkey" FOREIGN KEY ("usuarioCreadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances_turno" ADD CONSTRAINT "avances_turno_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances_turno" ADD CONSTRAINT "avances_turno_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances_turno" ADD CONSTRAINT "avances_turno_defectoProductoId_fkey" FOREIGN KEY ("defectoProductoId") REFERENCES "defectos_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances_turno" ADD CONSTRAINT "avances_turno_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "operadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances_turno" ADD CONSTRAINT "avances_turno_sobranteConfirmadoPorId_fkey" FOREIGN KEY ("sobranteConfirmadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances_turno" ADD CONSTRAINT "avances_turno_confirmacionMolinoPorId_fkey" FOREIGN KEY ("confirmacionMolinoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiempos_paro" ADD CONSTRAINT "tiempos_paro_avanceTurnoId_fkey" FOREIGN KEY ("avanceTurnoId") REFERENCES "avances_turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiempos_paro" ADD CONSTRAINT "tiempos_paro_motivoParoId_fkey" FOREIGN KEY ("motivoParoId") REFERENCES "motivos_paro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_material" ADD CONSTRAINT "solicitudes_material_avanceTurnoId_fkey" FOREIGN KEY ("avanceTurnoId") REFERENCES "avances_turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_material" ADD CONSTRAINT "solicitudes_material_confirmadoPorId_fkey" FOREIGN KEY ("confirmadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias_material_mal_pigmentado" ADD CONSTRAINT "incidencias_material_mal_pigmentado_avanceTurnoId_fkey" FOREIGN KEY ("avanceTurnoId") REFERENCES "avances_turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias_material_mal_pigmentado" ADD CONSTRAINT "incidencias_material_mal_pigmentado_confirmadoMolinoPorId_fkey" FOREIGN KEY ("confirmadoMolinoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias_material_mal_pigmentado" ADD CONSTRAINT "incidencias_material_mal_pigmentado_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moliendas" ADD CONSTRAINT "moliendas_colorSolidoId_fkey" FOREIGN KEY ("colorSolidoId") REFERENCES "colores_solidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moliendas_avances_turno" ADD CONSTRAINT "moliendas_avances_turno_moliendaId_fkey" FOREIGN KEY ("moliendaId") REFERENCES "moliendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moliendas_avances_turno" ADD CONSTRAINT "moliendas_avances_turno_avanceTurnoId_fkey" FOREIGN KEY ("avanceTurnoId") REFERENCES "avances_turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moliendas_incidencias" ADD CONSTRAINT "moliendas_incidencias_moliendaId_fkey" FOREIGN KEY ("moliendaId") REFERENCES "moliendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moliendas_incidencias" ADD CONSTRAINT "moliendas_incidencias_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "incidencias_material_mal_pigmentado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_movimientos_inventario" ADD CONSTRAINT "historial_movimientos_inventario_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "materias_primas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_movimientos_inventario" ADD CONSTRAINT "historial_movimientos_inventario_pigmentoId_fkey" FOREIGN KEY ("pigmentoId") REFERENCES "pigmentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_movimientos_inventario" ADD CONSTRAINT "historial_movimientos_inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_movimientos_inventario" ADD CONSTRAINT "historial_movimientos_inventario_pigmentoProductoId_fkey" FOREIGN KEY ("pigmentoProductoId") REFERENCES "pigmentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_movimientos_inventario" ADD CONSTRAINT "historial_movimientos_inventario_combinacionMaterialPigmen_fkey" FOREIGN KEY ("combinacionMaterialPigmentadoId") REFERENCES "combinaciones_material_pigmentado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_movimientos_inventario" ADD CONSTRAINT "historial_movimientos_inventario_colorSolidoId_fkey" FOREIGN KEY ("colorSolidoId") REFERENCES "colores_solidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_movimientos_inventario" ADD CONSTRAINT "historial_movimientos_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add Check Constraint
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