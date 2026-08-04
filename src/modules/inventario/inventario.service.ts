import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import {
  registrarMovimientoMateriaPrima,
  registrarMovimientoPigmento,
  registrarMovimientoProducto,
  registrarMovimientoMolido,
  registrarMovimientoMaterialPigmentado,
} from "../../shared/inventario/movimiento-inventario.service.js";
import type { PrismaTransactionClient } from "../../shared/inventario/movimiento-inventario.types.js";
import type { AuthUser } from "../../types/fastify.js";
import type { EntradaProveedorBody, AjusteManualBody, HistorialQuery, SalidaProductoBody } from "./inventario.schema.js";

// Aqui no hay funcion serializar porque cada funcion trata con una tabla diferente
// ---------- LISTADOS ----------

export async function listarInventarioMateriaPrima() {
  const registros = await prisma.inventarioMateriaPrima.findMany({
    include: { materiaPrima: true },
    orderBy: { materiaPrima: { nombre: "asc" } },
  });

  return registros.map((r) => ({
    materiaPrimaId: r.materiaPrimaId.toString(),
    nombre: r.materiaPrima.nombre,
    codigoInterno: r.materiaPrima.codigoInterno,
    unidadMedida: r.materiaPrima.unidadMedida,
    cantidadActual: Number(r.cantidadActual),
    stockMinimo: Number(r.stockMinimo),
  }));
}

export async function listarInventarioPigmento() {
  const registros = await prisma.inventarioPigmento.findMany({
    include: { pigmento: true },
    orderBy: { pigmento: { color: "asc" } },
  });

  return registros.map((r) => ({
    pigmentoId: r.pigmentoId.toString(),
    color: r.pigmento.color,
    categoriaColor: r.pigmento.categoriaColor,
    tipo: r.pigmento.tipo,
    tipoMaterial: r.pigmento.tipoMaterial,
    cantidadActual: Number(r.cantidadActual),
    stockMinimo: Number(r.stockMinimo),
  }));
}

export async function listarInventarioProducto() {
  const registros = await prisma.inventarioProductoTerminado.findMany({
    include: { producto: true, pigmento: true },
    orderBy: { producto: { nombre: "asc" } },
  });

  return registros.map((r) => ({
    productoId: r.productoId.toString(),
    productoNombre: r.producto.nombre,
    pigmentoId: r.pigmentoId.toString(),
    color: r.pigmento.color,
    categoriaColor: r.pigmento.categoriaColor,
    cantidadActual: Number(r.cantidadActual),
  }));
}

export async function listarInventarioMolido() {
  const registros = await prisma.inventarioMolido.findMany({
    include: { colorSolido: true },
    orderBy: { tipoMaterial: "asc" },
  });

  const tiposMolido = await prisma.tipoMolido.findMany();

  return registros.map((r) => {
    const tipo = tiposMolido.find(
      (t) => t.tipoMaterial === r.tipoMaterial && t.origen === r.origen
    );
    return {
      tipoMaterial: r.tipoMaterial,
      origen: r.origen,
      codigoInterno: tipo?.codigoInterno ?? null,
      colorSolidoId: r.colorSolidoId.toString(),
      colorSolidoNombre: r.colorSolido.nombre,
      cantidadActual: Number(r.cantidadActual),
    };
  });
}

export async function listarInventarioMaterialPigmentado() {
  const registros = await prisma.inventarioMaterialPigmentado.findMany({
    include: { combinacion: { include: { materiaPrima: true, pigmento: true  } } },
    orderBy: { combinacion: { materiaPrima: { nombre: "asc" } } },
  });

  return registros.map((r) => ({
    combinacionId: r.combinacionId.toString(),
    materiaPrimaNombre: r.combinacion.materiaPrima.nombre,
    pigmentoColor: r.combinacion.pigmento.color,
    pigmentoCategoria: r.combinacion.pigmento.categoriaColor,
    cantidadActual: Number(r.cantidadActual),
  }));
}

// ---------- ENTRADA DE PROVEEDOR ----------

export async function registrarEntradaProveedor(
  data: EntradaProveedorBody,
  actor: AuthUser,
  ip?: string
) {
  const base = {
    tipoMovimiento: "ENTRADA" as const,
    motivo: "ENTRADA_PROVEEDOR" as const,
    cantidad: data.cantidad,
    usuarioId: actor.id,
    ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
  };

  switch (data.tipoInventario) {
    case "MATERIA_PRIMA": {
      const materiaPrimaId = BigInt(data.materiaPrimaId);
      const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id: materiaPrimaId } });
      if (!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");

      return registrarMovimientoMateriaPrima({ ...base, materiaPrimaId });
    }

    case "PIGMENTO": {
      const pigmentoId = BigInt(data.pigmentoId);
      const pigmento = await prisma.pigmento.findUnique({ where: { id: pigmentoId } });
      if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");

      return registrarMovimientoPigmento({ ...base, pigmentoId });
    }

    case "MOLIDO": {
      const tipoMaterial = data.tipoMaterial;
      const colorSolidoId = BigInt(data.colorSolidoId);

      // const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id: materiaPrimaId } });
      // if (!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");

      const color = await prisma.colorSolido.findUnique({ where: { id: colorSolidoId } });
      if (!color) throw new Error("COLOR_SOLIDO_NO_ENCONTRADO");

      return registrarMovimientoMolido({
        ...base,
        tipoMaterial,
        origen: "COMPRADO", // entrada de proveedor de molido siempre es comprado, nunca interno
        colorSolidoId,
      });
    }
  }
}

// ---------- AJUSTE MANUAL ----------

export async function registrarAjusteManual(
  data: AjusteManualBody,
  actor: AuthUser,
  ip?: string
) {
  const base = {
    tipoMovimiento: "AJUSTE" as const,
    motivo: "AJUSTE_MANUAL" as const,
    cantidad: data.diferencia,
    usuarioId: actor.id,
    descripcion: data.descripcion,
  };

  switch (data.tipoInventario) {
    case "MATERIA_PRIMA": {
      const materiaPrimaId = BigInt(data.materiaPrimaId);
      const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id: materiaPrimaId } });
      if (!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");

      return registrarMovimientoMateriaPrima({ ...base, materiaPrimaId });
    }

    case "PIGMENTO": {
      const pigmentoId = BigInt(data.pigmentoId);
      const pigmento = await prisma.pigmento.findUnique({ where: { id: pigmentoId } });
      if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");

      return registrarMovimientoPigmento({ ...base, pigmentoId });
    }

    case "PRODUCTO": {
      const productoId = BigInt(data.productoId);
      const pigmentoId = BigInt(data.pigmentoId);

      const producto = await prisma.producto.findUnique({ where: { id: productoId } });
      if (!producto) throw new Error("PRODUCTO_NO_ENCONTRADO");

      const pigmento = await prisma.pigmento.findUnique({ where: { id: pigmentoId } });
      if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");

      return registrarMovimientoProducto({ ...base, productoId, pigmentoId });
    }

    case "MOLIDO": {
      const tipoMaterial = data.tipoMaterial;
      const colorSolidoId = BigInt(data.colorSolidoId);

      const color = await prisma.colorSolido.findUnique({ where: { id: colorSolidoId } });
      if (!color) throw new Error("COLOR_SOLIDO_NO_ENCONTRADO");

      return registrarMovimientoMolido({
        ...base,
        tipoMaterial,
        origen: data.origen,
        colorSolidoId,
      });
    }

    case "MATERIAL_PIGMENTADO": {
      const materiaPrimaId = BigInt(data.materiaPrimaId);
      const pigmentoId = BigInt(data.pigmentoId);

      const pigmento = await prisma.pigmento.findUnique({ where: { id: pigmentoId } });
      if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");

      return registrarMovimientoMaterialPigmentado({ ...base, materiaPrimaId, pigmentoId });
    }
  }
}

// ---------- HISTORIAL DE MOVIMIENTOS ----------

export async function consultarHistorial(query: HistorialQuery) {
  const movimientos = await prisma.historialMovimientoInventario.findMany({
    where: {
      tipoInventario: query.tipoInventario,
      ...(query.materiaPrimaId !== undefined &&
        query.tipoInventario === "MATERIA_PRIMA" && {
          materiaPrimaId: BigInt(query.materiaPrimaId),
        }),
      ...(query.materiaPrimaId !== undefined &&
        query.tipoInventario === "MOLIDO" && {
          materialMolidoId: BigInt(query.materiaPrimaId),
        }),
      ...(query.pigmentoId !== undefined && { pigmentoId: BigInt(query.pigmentoId) }),
      ...(query.productoId !== undefined && { productoId: BigInt(query.productoId) }),
    },
    include: { usuario: true },
    orderBy: { createdAt: "desc" },
    take: query.limite ?? 50,
  });

  return movimientos.map((m) => ({
    id: m.id.toString(),
    tipoInventario: m.tipoInventario,
    tipoMovimiento: m.tipoMovimiento,
    motivo: m.motivo,
    descripcion: m.descripcion,
    cantidadAnterior: Number(m.cantidadAnterior),
    cantidadMovimiento: Number(m.cantidadMovimiento),
    cantidadNueva: Number(m.cantidadNueva),
    unidadMedida: m.unidadMedida,
    usuarioNombre: m.usuario.nombre,
    createdAt: m.createdAt.toISOString(),
  }));
}

// ---------- SALIDA DE PRODUCTOS ----------

export async function registrarSalidaProducto(
  data: SalidaProductoBody,
  actor: AuthUser,
  ip?: string
) {
  if (data.motivo === "ENTREGA_PEDIDO" && data.pedidoId === undefined) {
    throw new Error("PEDIDO_REQUERIDO_PARA_ENTREGA");
  }

  let pedidoId: bigint | undefined;
  if (data.pedidoId !== undefined) {
    pedidoId = BigInt(data.pedidoId);
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalle: true },
    });
    if (!pedido) throw new Error("PEDIDO_NO_ENCONTRADO");
    if (pedido.estado === "CANCELADO") throw new Error("PEDIDO_CANCELADO");

    // Validación flexible: cada producto del envío debe existir en alguna línea del pedido
    // (sin importar color ni cantidad exacta)
    const productosDelPedido = new Set(pedido.detalle.map((d) => d.productoId.toString()));
    for (const item of data.items) {
      if (!productosDelPedido.has(item.productoId)) {
        throw new Error("PRODUCTO_NO_PERTENECE_AL_PEDIDO");
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      await registrarMovimientoProducto(
        {
          productoId: BigInt(item.productoId),
          pigmentoId: BigInt(item.pigmentoId),
          tipoMovimiento: "SALIDA",
          motivo: data.motivo,
          cantidad: item.cantidad,
          usuarioId: actor.id,
          ...(pedidoId !== undefined && {
            referenciaTipo: "PEDIDO" as const,
            referenciaId: pedidoId,
          }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
        },
        tx as unknown as PrismaTransactionClient
      );
    }
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "INVENTARIO",
    accion: data.motivo === "ENTREGA_PEDIDO" ? "entregar_pedido" : "registrar_venta",
    entidad: "inventario_producto",
    ...(pedidoId !== undefined && { entidadId: pedidoId }),
    ...(ip !== undefined && { ip }),
  });
}