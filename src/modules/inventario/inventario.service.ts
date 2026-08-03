import { prisma } from "../../lib/prisma.js";
import {
  registrarMovimientoMateriaPrima,
  registrarMovimientoPigmento,
  registrarMovimientoProducto,
  registrarMovimientoMolido,
  registrarMovimientoMaterialPigmentado,
} from "../../shared/inventario/movimiento-inventario.service.js";
import type { AuthUser } from "../../types/fastify.js";
import type { EntradaProveedorBody, AjusteManualBody, HistorialQuery } from "./inventario.schema.js";

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
    include: { colorSolido: true }
  });

  return registros.map((r) => ({
    tipoMaterial: r.tipoMaterial,
    origen: r.origen,
    colorSolidoId: r.colorSolidoId.toString(),
    colorSolidoNombre: r.colorSolido.nombre,
    cantidadActual: Number(r.cantidadActual),
  }));
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