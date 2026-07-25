import type {
  TipoMovimientoInventario,
  MotivoMovimientoInventario,
  ReferenciaMovimientoInventario,
  OrigenMolido,
  Prisma,
  PrismaClient
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
  colorSolidoId: bigint;
  cantidad: number;
}

export interface MovimientoMaterialPigmentadoInput extends MovimientoBase {
  materiaPrimaId: bigint;
  pigmentoId: bigint;
  cantidad: number;
}

// La forma de TX dentro del cliente transaccional, tipada para poder condicionar el uso de una transaccion externa en las funciones de movimiento-inventario.service.ts
export type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;