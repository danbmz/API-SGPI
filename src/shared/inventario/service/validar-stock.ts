import { prisma } from "../../../lib/prisma.js";

export async function validarStockMateriaPrima(materiaPrimaId: bigint, cantidadRequerida: number) {
  const inventario = await prisma.inventarioMateriaPrima.findUnique({ where: { materiaPrimaId } });
  if (!inventario || Number(inventario.cantidadActual) < cantidadRequerida) {
    throw new Error("STOCK_INSUFICIENTE_MATERIA_PRIMA");
  }
}

export async function validarStockPigmento(pigmentoId: bigint, cantidadRequerida: number) {
  const inventario = await prisma.inventarioPigmento.findUnique({ where: { pigmentoId } });
  if (!inventario || Number(inventario.cantidadActual) < cantidadRequerida) {
    throw new Error("STOCK_INSUFICIENTE_PIGMENTO");
  }
}

export async function validarStockMolido(inventarioMolidoId: bigint, cantidadRequerida: number) {
  const inventario = await prisma.inventarioMolido.findUnique({ where: { id: inventarioMolidoId } });
  if (!inventario || Number(inventario.cantidadActual) < cantidadRequerida) {
    throw new Error("STOCK_INSUFICIENTE_MOLIDO");
  }
}