import type { PedidoDetalle, Prisma } from "../../../prisma/generated/prisma/client/browser.js";
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
      id: r.id.toString(),
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
    materiaPrimaId: r.combinacion.materiaPrimaId.toString(),
    materiaPrimaNombre: r.combinacion.materiaPrima.nombre,
    pigmentoId: r.combinacion.pigmentoId.toString(),
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
      if(!materiaPrima.activo) throw new Error("MATERIA_PRIMA_INACTIVA");

      return registrarMovimientoMateriaPrima({ ...base, materiaPrimaId });
    }

    case "PIGMENTO": {
      const pigmentoId = BigInt(data.pigmentoId);
      const pigmento = await prisma.pigmento.findUnique({ where: { id: pigmentoId } });
      if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");
      if(!pigmento.activo) throw new Error("PIGMENTO_INACTIVO");

      return registrarMovimientoPigmento({ ...base, pigmentoId });
    }

    case "MOLIDO": {
      const tipoMaterial = data.tipoMaterial;
      const colorSolidoId = BigInt(data.colorSolidoId);

      const color = await prisma.colorSolido.findUnique({ where: { id: colorSolidoId } });
      if (!color) throw new Error("COLOR_SOLIDO_NO_ENCONTRADO");
      if(!color.activo) throw new Error("COLOR_SOLIDO_INACTIVO")

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
      if (!materiaPrima.activo) throw new Error("MATERIA_PRIMA_INACTIVA");

      return registrarMovimientoMateriaPrima({ ...base, materiaPrimaId });
    }

    case "PIGMENTO": {
      const pigmentoId = BigInt(data.pigmentoId);
      const pigmento = await prisma.pigmento.findUnique({ where: { id: pigmentoId } });
      if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");
      if (!pigmento.activo) throw new Error("PIGMENTO_INACTIVO");

      return registrarMovimientoPigmento({ ...base, pigmentoId });
    }

    case "PRODUCTO": {
      const productoId = BigInt(data.productoId);
      const pigmentoId = BigInt(data.pigmentoId);

      const producto = await prisma.producto.findUnique({ where: { id: productoId } });
      if (!producto) throw new Error("PRODUCTO_NO_ENCONTRADO");
      if (!producto.activo) throw new Error("PRODUCTO_INACTIVO");

      const pigmento = await prisma.pigmento.findUnique({ where: { id: pigmentoId } });
      if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");
      if (!pigmento.activo) throw new Error("PIGMENTO_INACTIVO");

      return registrarMovimientoProducto({ ...base, productoId, pigmentoId });
    }

    case "MOLIDO": {
      const tipoMaterial = data.tipoMaterial;
      const colorSolidoId = BigInt(data.colorSolidoId);

      const color = await prisma.colorSolido.findUnique({ where: { id: colorSolidoId } });
      if (!color) throw new Error("COLOR_SOLIDO_NO_ENCONTRADO");
      if (!color.activo) throw new Error("COLOR_SOLIDO_INACTIVO");

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

      const materiaPrima = await prisma.materiaPrima.findUnique({where: {id: materiaPrimaId}});
      if(!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");
      if(!materiaPrima.activo) throw new Error("MATERIA_PRIMA_INACTIVA");

      const pigmento = await prisma.pigmento.findUnique({ where: { id: pigmentoId } });
      if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");
      if (!pigmento.activo) throw new Error("PIGMENTO_INACTIVO");

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
      ...(query.tipoMaterial !== undefined && {
          materialMolidoTipo: query.tipoMaterial,
        }),
      ...(query.colorSolidoId !== undefined && { colorSolidoId: BigInt(query.colorSolidoId)}),
      ...(query.origen !== undefined && { origenMolido: query.origen}),
      ...(query.combinacionMaterialPigmentadoId !== undefined && { combinacionMaterialPigmentadoId: BigInt(query.combinacionMaterialPigmentadoId)}),
      ...(query.pigmentoId !== undefined && query.tipoInventario === "PIGMENTO" && { pigmentoId: BigInt(query.pigmentoId) }),
      ...(query.pigmentoId !== undefined && query.tipoInventario === "PRODUCTO" && { pigmentoProductoId: BigInt(query.pigmentoId) }),
      ...(query.productoId !== undefined && { productoId: BigInt(query.productoId) }),
    },
    include: {
      usuario: true,
      materiaPrima: true,
      pigmento: true,
      producto: true,
      pigmentoProducto: true, // el pigmento asociado a un movimiento de tipo PRODUCTO
      colorSolido: true,
      combinacionMaterialPigmentado: {
        include: { materiaPrima: true, pigmento: true },
      },
    },
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

    materiaPrimaNombre:
      m.tipoInventario === "MATERIA_PRIMA" ? m.materiaPrima?.nombre ?? null :
      m.tipoInventario === "MATERIAL_PIGMENTADO" ? m.combinacionMaterialPigmentado?.materiaPrima.nombre ?? null :
      m.tipoInventario === "PRODUCTO" ? m.producto?.tipoMaterial ?? null : // si Producto tiene materiaPrima
      null,

    pigmentoColor:
      m.tipoInventario === "PIGMENTO" ? m.pigmento?.color ?? null :
      m.tipoInventario === "PRODUCTO" ? m.pigmentoProducto?.color ?? null :
      m.tipoInventario === "MATERIAL_PIGMENTADO" ? m.combinacionMaterialPigmentado?.pigmento.color ?? null :
      null,

    pigmentoCategoria:
      m.tipoInventario === "PIGMENTO" ? m.pigmento?.categoriaColor ?? null :
      m.tipoInventario === "PRODUCTO" ? m.pigmentoProducto?.categoriaColor ?? null :
      m.tipoInventario === "MATERIAL_PIGMENTADO" ? m.combinacionMaterialPigmentado?.pigmento.categoriaColor ?? null :
      null,

    productoNombre: m.tipoInventario === "PRODUCTO" ? m.producto?.nombre ?? null : null,

    materialMolidoTipo: m.tipoInventario === "MOLIDO" ? m.materialMolidoTipo ?? null : null,

    colorSolidoNombre: m.tipoInventario === "MOLIDO" ? m.colorSolido?.nombre ?? null : null,
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

  // Tipo especial para tipar una variable que contendra el valor crudo que devuelve Prisma (valores decimal, bigInt, etc).
  type PedidoConDetalle = Prisma.PedidoGetPayload<{ include: { detalle: true } }>;
  let pedido: PedidoConDetalle | null = null;
  let pedidoId: bigint | undefined;

  if (data.pedidoId !== undefined) {
    pedidoId = BigInt(data.pedidoId);
    pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalle: true },
    });
    if (!pedido) throw new Error("PEDIDO_NO_ENCONTRADO");
    if (pedido.estado === "CANCELADO") throw new Error("PEDIDO_CANCELADO");

    // Validación flexible: que el producto sea el mismo que los indicados en los detalles y que la cantidad no sea superior a la indicada.
    for (const item of data.items) {
      const lineaCoincidente = pedido.detalle.find(
        (d) =>
          d.productoId === BigInt(item.productoId) &&
          (d.pigmentoId === null || d.pigmentoId === BigInt(item.pigmentoId))
      );
      if (!lineaCoincidente) {
        throw new Error("PRODUCTO_NO_PERTENECE_AL_PEDIDO");
      }

      // Nueva validación: no exceder lo solicitado
      const cantidadRestante = lineaCoincidente.cantidadSolicitada - lineaCoincidente.cantidadEntregada;
      if (item.cantidad > cantidadRestante) {
        throw new Error("CANTIDAD_EXCEDE_LO_SOLICITADO");
      }
    }
  }

  // Validación de stock suficiente para cada item, antes de mover nada
  for (const item of data.items) {
    const inventario = await prisma.inventarioProductoTerminado.findUnique({
      where: {
        productoId_pigmentoId: {
          productoId: BigInt(item.productoId),
          pigmentoId: BigInt(item.pigmentoId),
        },
      },
    });

    if (!inventario || Number(inventario.cantidadActual) < item.cantidad) {
      throw new Error("STOCK_INSUFICIENTE_PRODUCTO");
    }
  }

  // Registramos el movimiento en el historial y si es salida de un pedido entonces sumamos la nueva cantidad de salida a el valor que ya tenia dicho pedido.
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

      if (data.motivo === "ENTREGA_PEDIDO" && pedido) {
        const lineaCoincidente = pedido.detalle.find(
          (d) => d.productoId === BigInt(item.productoId) &&
            (d.pigmentoId === null || d.pigmentoId === BigInt(item.pigmentoId))
        );
        await tx.pedidoDetalle.update({
          where: { id: lineaCoincidente!.id },
          data: { cantidadEntregada: { increment: item.cantidad } },
        });
      }
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