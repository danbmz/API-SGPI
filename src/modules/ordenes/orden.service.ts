import { prisma } from "../../lib/prisma.js";
import {
  registrarMovimientoMateriaPrima,
  registrarMovimientoPigmento,
  registrarMovimientoMolido,
} from "../../shared/inventario/movimiento-inventario.service.js";
import type { PrismaTransactionClient } from "../../shared/inventario/movimiento-inventario.types.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearOrdenBody, CancelarOrdenBody } from "./orden.schema.js";
import { redondear3 } from "../../utils/redondear3.js";

const FACTOR_COLCHON = 1.05;

function serializar(orden: any) {
  return {
    id: orden.id.toString(),
    folio: orden.folio,
    estado: orden.estado,
    productoId: orden.productoId.toString(),
    productoNombre: orden.producto.nombre,
    totalPiezas: orden.totalPiezas,
    clienteDestino: orden.clienteDestino,
    remision: orden.remision,
    observaciones: orden.observaciones,
    tipoMaterial: orden.tipoMaterial,
    clienteEfectivo: orden.pedido ? orden.pedido.cliente : orden.clienteDestino,
    materiaPrimaId: orden.materiaPrimaId.toString(),
    materiaPrimaNombre: orden.materiaPrima.nombre,
    inventarioMolidoId: orden.inventarioMolidoId ? orden.inventarioMolidoId.toString() : null,
    porcentajeVirgen: Number(orden.porcentajeVirgen),
    porcentajeMolido: Number(orden.porcentajeMolido),
    pigmentoId: orden.pigmentoId.toString(),
    pigmentoColor: orden.pigmento.color,
    aditivoDescripcion: orden.aditivoDescripcion,
    maquinaId: orden.maquinaId.toString(),
    maquinaNombre: orden.maquina.nombre,
    piezasPorHora: orden.piezasPorHora,
    piezasPorTurno: orden.piezasPorTurno,
    piezasPorDia: orden.piezasPorDia,
    tiempoEstimadoHrs: Number(orden.tiempoEstimadoHrs),
    materiaPrimaTotalKg: Number(orden.materiaPrimaTotalKg),
    materiaPrimaVirgenKg: Number(orden.materiaPrimaVirgenKg),
    materialMolidoKg: Number(orden.materialMolidoKg),
    pigmentoRequeridoKg: Number(orden.pigmentoRequeridoKg),
    materialSiguienteConfirmado: orden.materialSiguienteConfirmado,
    materialConfirmadoEn: orden.materialConfirmadoEn
      ? orden.materialConfirmadoEn.toISOString()
      : null,
    usuarioCreadorNombre: orden.usuarioCreador.nombre,
    createdAt: orden.createdAt.toISOString(),
  };
}

const includeCompleto = {
  producto: true,
  materiaPrima: true,
  pigmento: true,
  maquina: true,
  usuarioCreador: true,
};

export async function listarOrdenes() {
  const ordenes = await prisma.ordenProduccion.findMany({
    include: includeCompleto,
    orderBy: { createdAt: "desc" },
  });
  return ordenes.map(serializar);
}

export async function crearOrden(data: CrearOrdenBody, actor: AuthUser, ip?: string) {
  const existente = await prisma.ordenProduccion.findUnique({ where: { folio: data.folio } });
  if (existente) throw new Error("ORDEN_FOLIO_YA_EXISTE");

  const productoId = BigInt(data.productoId);
  const materiaPrimaId = BigInt(data.materiaPrimaId);
  const pigmentoId = BigInt(data.pigmentoId);
  const maquinaId = BigInt(data.maquinaId);

  const [producto, materiaPrima, pigmento, maquina] = await Promise.all([
    prisma.producto.findUnique({ where: { id: productoId } }),
    prisma.materiaPrima.findUnique({ where: { id: materiaPrimaId } }),
    prisma.pigmento.findUnique({ where: { id: pigmentoId } }),
    prisma.maquina.findUnique({ where: { id: maquinaId } }),
  ]);

  if (!producto) throw new Error("PRODUCTO_NO_ENCONTRADO");
  if (!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");
  if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");
  if (!maquina) throw new Error("MAQUINA_NO_ENCONTRADA");

  // La materia prima debe ser compatible con el tipo de materia prima del producto
  if(producto.tipoMaterial !== materiaPrima.tipo){
    throw new Error("MATERIAL_INCOMPATIBLE_CON_PRODUCTO");
  }

  // El pigmento debe ser compatible con el tipo de materia prima elegida (Asi garantizamos que producto-pigmento-materia sean compatibles)
  if (pigmento.tipoMaterial !== materiaPrima.tipo) {
    throw new Error("PIGMENTO_INCOMPATIBLE_CON_MATERIAL");
  }

  // Si hay mezcla, el molido también debe ser del mismo tipoMaterial
  if (data.tipoMaterial !== "VIRGEN") {
    const inventarioMolidoId = BigInt(data.inventarioMolidoId);
    const inventarioMolido = await prisma.inventarioMolido.findUnique({
      where: { id: inventarioMolidoId },
    });
    if (!inventarioMolido) throw new Error("INVENTARIO_MOLIDO_NO_ENCONTRADO");

    if (inventarioMolido.tipoMaterial !== materiaPrima.tipo) {
      throw new Error("MOLIDO_INCOMPATIBLE_CON_MATERIAL");
    }
  }

  let pedidoId: bigint | undefined;
  let clienteDestino: string | undefined;

  if (data.pedidoId !== undefined) {
    pedidoId = BigInt(data.pedidoId);
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw new Error("PEDIDO_NO_ENCONTRADO");
    if (pedido.estado === "CANCELADO") throw new Error("PEDIDO_CANCELADO");

    const detalleCoincide = await prisma.pedidoDetalle.findFirst({
      where: { pedidoId, productoId, ...(pigmentoId !== undefined && { pigmentoId }) },
    });
    if (!detalleCoincide) throw new Error("PRODUCTO_NO_SOLICITADO_EN_PEDIDO");

    clienteDestino = pedido.cliente; // ← aquí sí copiamos el nombre real del cliente
  } else {
    clienteDestino = data.clienteDestino; // sin pedido, se usa lo que venga en el body (ej. "STOCK")
  }

  // ---------- Cálculos (snapshots) ----------
  const piezasPorHora = Math.round(3600 / producto.ciclo);
  const piezasPorTurno = piezasPorHora * 8;
  const piezasPorDia = piezasPorHora * 24;
  const tiempoEstimadoHrs = data.totalPiezas / piezasPorHora;

  const materiaPrimaTotalKg =
    redondear3(((data.totalPiezas * Number(producto.peso)) / 1000) * FACTOR_COLCHON);

  const porcentajeVirgen = data.tipoMaterial === "VIRGEN" ? 100 : data.porcentajeVirgen;
  const porcentajeMolido = data.tipoMaterial === "VIRGEN" ? 0 : data.porcentajeMolido;

  const materiaPrimaVirgenKg = redondear3(materiaPrimaTotalKg * (porcentajeVirgen / 100));
  const materialMolidoKg = redondear3(materiaPrimaTotalKg * (porcentajeMolido / 100));

  const pigmentoRequeridoKg = redondear3((materiaPrimaVirgenKg * Number(pigmento.dosisGrPorKg)) / 1000);

  // ---------- Validación de stock ----------
  const inventarioMateriaPrima = await prisma.inventarioMateriaPrima.findUnique({
    where: { materiaPrimaId },
  });
  if (!inventarioMateriaPrima || Number(inventarioMateriaPrima.cantidadActual) < materiaPrimaVirgenKg) {
    throw new Error("STOCK_INSUFICIENTE_MATERIA_PRIMA");
  }

  const inventarioPigmento = await prisma.inventarioPigmento.findUnique({ where: { pigmentoId } });
  if (!inventarioPigmento || Number(inventarioPigmento.cantidadActual) < pigmentoRequeridoKg) {
    throw new Error("STOCK_INSUFICIENTE_PIGMENTO");
  }

  let inventarioMolidoId: bigint | undefined;
  if (data.tipoMaterial !== "VIRGEN") {
    inventarioMolidoId = BigInt(data.inventarioMolidoId);
    const inventarioMolido = await prisma.inventarioMolido.findUnique({
      where: { id: inventarioMolidoId },
    });
    if (!inventarioMolido || Number(inventarioMolido.cantidadActual) < materialMolidoKg) {
      throw new Error("STOCK_INSUFICIENTE_MOLIDO");
    }
  }

  // ---------- Transacción: crear orden + descontar los 3 inventarios ----------
  const ordenCreada = await prisma.$transaction(async (tx) => {
    const nueva = await tx.ordenProduccion.create({
      data: {
        folio: data.folio,
        estado: "BORRADOR",
        productoId,
        pedidoId,
        totalPiezas: data.totalPiezas,
        clienteDestino,
        ...(data.remision !== undefined && { remision: data.remision }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
        ...(data.aditivoDescripcion !== undefined && {
          aditivoDescripcion: data.aditivoDescripcion,
        }),
        tipoMaterial: data.tipoMaterial,
        materiaPrimaId,
        ...(inventarioMolidoId !== undefined && { inventarioMolidoId }),
        porcentajeVirgen,
        porcentajeMolido,
        pigmentoId,
        maquinaId,
        piezasPorHora,
        piezasPorTurno,
        piezasPorDia,
        tiempoEstimadoHrs,
        materiaPrimaTotalKg,
        materiaPrimaVirgenKg,
        materialMolidoKg,
        pigmentoRequeridoKg,
        usuarioCreadorId: actor.id,
      },
    });

    await registrarMovimientoMateriaPrima(
      {
        materiaPrimaId,
        tipoMovimiento: "SALIDA",
        motivo: "CONSUMO_PRODUCCION",
        cantidad: materiaPrimaVirgenKg,
        usuarioId: actor.id,
        referenciaTipo: "ORDEN_PRODUCCION",
        referenciaId: nueva.id,
      },
      tx as unknown as PrismaTransactionClient
    );

    await registrarMovimientoPigmento(
      {
        pigmentoId,
        tipoMovimiento: "SALIDA",
        motivo: "CONSUMO_PRODUCCION",
        cantidad: pigmentoRequeridoKg,
        usuarioId: actor.id,
        referenciaTipo: "ORDEN_PRODUCCION",
        referenciaId: nueva.id,
      },
      tx as unknown as PrismaTransactionClient
    );

    if (inventarioMolidoId !== undefined) {
      const inventarioMolido = await tx.inventarioMolido.findUniqueOrThrow({
        where: { id: inventarioMolidoId },
      });

      await registrarMovimientoMolido(
        {
          tipoMaterial: inventarioMolido.tipoMaterial,
          origen: inventarioMolido.origen,
          colorSolidoId: inventarioMolido.colorSolidoId,
          tipoMovimiento: "SALIDA",
          motivo: "CONSUMO_PRODUCCION",
          cantidad: materialMolidoKg,
          usuarioId: actor.id,
          referenciaTipo: "ORDEN_PRODUCCION",
          referenciaId: nueva.id,
        },
        tx as unknown as PrismaTransactionClient
      );
    }

    return nueva;
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "crear",
    entidad: "orden_produccion",
    entidadId: ordenCreada.id,
    ...(ip !== undefined && { ip }),
  });

  const final = await prisma.ordenProduccion.findUniqueOrThrow({
    where: { id: ordenCreada.id },
    include: includeCompleto,
  });

  return serializar(final);
}

export async function confirmarMaterialSiguiente(id: bigint, actor: AuthUser, ip?: string) {
  const orden = await prisma.ordenProduccion.findUnique({ where: { id } });
  if (!orden) throw new Error("ORDEN_NO_ENCONTRADA");
  if (orden.materialSiguienteConfirmado) throw new Error("MATERIAL_YA_CONFIRMADO");

  await prisma.ordenProduccion.update({
    where: { id },
    data: { materialSiguienteConfirmado: true, materialConfirmadoEn: new Date() },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "confirmar_material_siguiente",
    entidad: "orden_produccion",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function activarOrden(id: bigint, actor: AuthUser, ip?: string) {
  const orden = await prisma.ordenProduccion.findUnique({ where: { id } });
  if (!orden) throw new Error("ORDEN_NO_ENCONTRADA");
  if (orden.estado !== "BORRADOR") throw new Error("ORDEN_NO_SE_PUEDE_ACTIVAR");

  await prisma.ordenProduccion.update({ where: { id }, data: { estado: "ACTIVA" } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "activar",
    entidad: "orden_produccion",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function pausarOrden(id: bigint, actor: AuthUser, motivo?: string, ip?: string) {
  const orden = await prisma.ordenProduccion.findUnique({ where: { id } });
  if (!orden) throw new Error("ORDEN_NO_ENCONTRADA");
  if (orden.estado !== "ACTIVA" && orden.estado !== "EN_PROGRESO") {
    throw new Error("ORDEN_NO_SE_PUEDE_PAUSAR");
  }

  await prisma.ordenProduccion.update({ where: { id }, data: { estado: "PAUSADA" } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "pausar",
    entidad: "orden_produccion",
    entidadId: id,
    ...(motivo !== undefined && { detalle: motivo }),
    ...(ip !== undefined && { ip }),
  });
}

export async function reanudarOrden(id: bigint, actor: AuthUser, ip?: string) {
  const orden = await prisma.ordenProduccion.findUnique({ where: { id } });
  if (!orden) throw new Error("ORDEN_NO_ENCONTRADA");
  if (orden.estado !== "PAUSADA") throw new Error("ORDEN_NO_SE_PUEDE_REANUDAR");

  // Nota: al reanudar, no sabemos si venía de ACTIVA o EN_PROGRESO sin avances_turno.
  // Por ahora, siempre regresa a ACTIVA — se ajustará cuando exista el historial de avances.
  await prisma.ordenProduccion.update({ where: { id }, data: { estado: "ACTIVA" } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "reanudar",
    entidad: "orden_produccion",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function cancelarOrden(
  id: bigint,
  data: CancelarOrdenBody,
  actor: AuthUser,
  ip?: string
) {
  const orden = await prisma.ordenProduccion.findUnique({ where: { id } });
  if (!orden) throw new Error("ORDEN_NO_ENCONTRADA");

  if (orden.estado === "COMPLETADA" || orden.estado === "CANCELADA") {
    throw new Error("ORDEN_NO_SE_PUEDE_CANCELAR");
  }

  if (orden.estado === "EN_PROGRESO") {
    // Requiere calcular consumo real desde avances_turno, que aún no existe.
    throw new Error("CANCELACION_EN_PROGRESO_NO_DISPONIBLE");
  }

  await prisma.$transaction(async (tx) => {
    await tx.ordenProduccion.update({
      where: { id },
      data: { estado: "CANCELADA" },
    });

    // Revertir 100% de lo reservado: materia prima virgen
    await registrarMovimientoMateriaPrima(
      {
        materiaPrimaId: orden.materiaPrimaId,
        tipoMovimiento: "ENTRADA",
        motivo: "CANCELACION_ORDEN",
        cantidad: Number(orden.materiaPrimaVirgenKg),
        usuarioId: actor.id,
        referenciaTipo: "ORDEN_PRODUCCION",
        referenciaId: id,
        descripcion: `Cancelación de orden ${orden.folio}: ${data.motivo}`,
      },
      tx as unknown as PrismaTransactionClient
    );

    // Revertir pigmento
    await registrarMovimientoPigmento(
      {
        pigmentoId: orden.pigmentoId,
        tipoMovimiento: "ENTRADA",
        motivo: "CANCELACION_ORDEN",
        cantidad: Number(orden.pigmentoRequeridoKg),
        usuarioId: actor.id,
        referenciaTipo: "ORDEN_PRODUCCION",
        referenciaId: id,
        descripcion: `Cancelación de orden ${orden.folio}: ${data.motivo}`,
      },
      tx as unknown as PrismaTransactionClient
    );

    // Revertir molido, si aplica
    if (orden.inventarioMolidoId) {
      const inventarioMolido = await tx.inventarioMolido.findUniqueOrThrow({
        where: { id: orden.inventarioMolidoId },
      });

      await registrarMovimientoMolido(
        {
          tipoMaterial: inventarioMolido.tipoMaterial,
          origen: inventarioMolido.origen,
          colorSolidoId: inventarioMolido.colorSolidoId,
          tipoMovimiento: "ENTRADA",
          motivo: "CANCELACION_ORDEN",
          cantidad: Number(orden.materialMolidoKg),
          usuarioId: actor.id,
          referenciaTipo: "ORDEN_PRODUCCION",
          referenciaId: id,
          descripcion: `Cancelación de orden ${orden.folio}: ${data.motivo}`,
        },
        tx as unknown as PrismaTransactionClient
      );
    }
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "cancelar",
    entidad: "orden_produccion",
    entidadId: id,
    detalle: data.motivo,
    ...(ip !== undefined && { ip }),
  });
}