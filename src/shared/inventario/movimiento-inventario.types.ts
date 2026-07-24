import type {
  TipoMovimientoInventario,
  MotivoMovimientoInventario,
  ReferenciaMovimientoInventario,
  OrigenMolido,
  ColorSolido,
} from "../../../prisma/generated/prisma/client/client.js";

export interface MovimientoBase {
  tipoMovimiento: TipoMovimientoInventario;
  motivo: MotivoMovimientoInventario;
  descripcion?: string;
  usuarioId: bigint;
  referenciaTipo?: ReferenciaMovimientoInventario;
  referenciaId?: bigint;
}

export interface MovimientoMateriaPrimaInput extends MovimientoBase {
  materiaPrimaId: bigint;
  cantidad: number; // siempre positivo, excepto en AJUSTE donde puede ser negativo
}

export interface MovimientoPigmentoInput extends MovimientoBase {
  pigmentoId: bigint;
  cantidad: number;
}

export interface MovimientoProductoInput extends MovimientoBase {
  productoId: bigint;
  pigmentoId: bigint;
  cantidad: number;
}

export interface MovimientoMolidoInput extends MovimientoBase {
  materiaPrimaId: bigint;
  origen: OrigenMolido;
  color: ColorSolido;
  cantidad: number;
}

export interface MovimientoMaterialPigmentadoInput extends MovimientoBase {
  materiaPrimaId: bigint;
  pigmentoId: bigint;
  cantidad: number;
}