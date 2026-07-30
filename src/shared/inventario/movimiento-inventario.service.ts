import { prisma } from "../../lib/prisma.js";
import type { TipoMovimientoInventario } from "../../../prisma/generated/prisma/client/enums.js";
import type {
  MovimientoMateriaPrimaInput,
  MovimientoPigmentoInput,
  MovimientoProductoInput,
  MovimientoMolidoInput,
  MovimientoMaterialPigmentadoInput,
  PrismaTransactionClient
} from "./movimiento-inventario.types.js";
import { redondear3 } from "../../utils/redondear3.js";

// Calcula el valor con signo real que se guarda en cantidadMovimiento
function calcularCantidadConSigno(
  tipoMovimiento: TipoMovimientoInventario,
  cantidad: number
): number {
//   Math.abs() devuelve el numero absoluto entero (remueve el signo con el que viene la cantidad y aqui lo normalizamos dependiendo el movimiento)
  if (tipoMovimiento === "ENTRADA") return Math.abs(cantidad);
  if (tipoMovimiento === "SALIDA") return -Math.abs(cantidad);
  return cantidad; // AJUSTE: se respeta el signo que mandó quien llama
}

// ---------- MATERIA PRIMA ----------

export async function registrarMovimientoMateriaPrima(
  input: MovimientoMateriaPrimaInput, 
  txExterna?:PrismaTransactionClient
) {
  // Usamos $transaction(), el metodo de control de Prisma para ejecutar multiples operaciones de bases de datos como un bloque unico, asegura que todas se realizen con exito o ninguna se guarde (RollBack).
  const ejecutar = async (tx: PrismaTransactionClient) => {
    // tx: version especial de prisma con los mismos metodos, permite que todas las operaciones ocurran dentro de transaction y no como operaciones sueltas.
    const inventario = await tx.inventarioMateriaPrima.findUnique({
      where: { materiaPrimaId: input.materiaPrimaId },
      include: { materiaPrima: true },
    });

    if (!inventario) {
      throw new Error("INVENTARIO_MATERIA_PRIMA_NO_ENCONTRADO");
    }

    const cantidadAnterior = redondear3(Number(inventario.cantidadActual));
    const cantidadMovimiento = redondear3(calcularCantidadConSigno(input.tipoMovimiento, input.cantidad));
    // + sumara o restara dependiendo el signo con el que devuelva el numero la funcion de arriba (50+50 o 50 + (-50) se transforma en resta)
    const cantidadNueva = redondear3(cantidadAnterior + cantidadMovimiento);

    // Creamos un nuevo registro en el historial de movimientos
    await tx.historialMovimientoInventario.create({
      data: {
        tipoInventario: "MATERIA_PRIMA",
        tipoMovimiento: input.tipoMovimiento,
        motivo: input.motivo,
        materiaPrimaId: input.materiaPrimaId,
        // No agregamos explicitamente las propiedades porque se llaman igual aqui que como en la tabla.
        cantidadAnterior,
        cantidadMovimiento,
        cantidadNueva,
        unidadMedida: inventario.materiaPrima.unidadMedida,
        usuarioId: input.usuarioId,
        ...(input.descripcion !== undefined && { descripcion: input.descripcion }),
        ...(input.referenciaTipo !== undefined && { referenciaTipo: input.referenciaTipo }),
        ...(input.referenciaId !== undefined && { referenciaId: input.referenciaId }),
      },
    });

    // Actualizamos el inventario despues de haber generado el registro en historial y lo devolvemos como respuesta de la funcion.
    return tx.inventarioMateriaPrima.update({
      where: { materiaPrimaId: input.materiaPrimaId },
      data: { cantidadActual: cantidadNueva },
    });
  };

  // Si hay una transaccion abierta, ejecutamos la funcion junto a esa transaccion
  if(txExterna) {
    return ejecutar(txExterna)
  }
  // Si no, abrimos una propia transaccion.
  return prisma.$transaction(ejecutar);
}

// ---------- PIGMENTO ----------

export async function registrarMovimientoPigmento(
  input: MovimientoPigmentoInput,
  txExterna?: PrismaTransactionClient
) {
  const ejecutar = async (tx: PrismaTransactionClient) => {
    // El doble include indica que traiga el registro de materiaPrima relacionado a Pigmento que a su vez esta relacionado a InventarioPigmento.
    const inventario = await tx.inventarioPigmento.findUnique({
      where: { pigmentoId: input.pigmentoId },
      include: { pigmento: { include: { materiaPrima: true } } },
    });

    if (!inventario) {
      throw new Error("INVENTARIO_PIGMENTO_NO_ENCONTRADO");
    }

    const cantidadAnterior = redondear3(Number(inventario.cantidadActual));
    const cantidadMovimiento = redondear3(calcularCantidadConSigno(input.tipoMovimiento, input.cantidad));
    const cantidadNueva = redondear3(cantidadAnterior + cantidadMovimiento);

    await tx.historialMovimientoInventario.create({
      data: {
        tipoInventario: "PIGMENTO",
        tipoMovimiento: input.tipoMovimiento,
        motivo: input.motivo,
        pigmentoId: input.pigmentoId,
        cantidadAnterior,
        cantidadMovimiento,
        cantidadNueva,
        unidadMedida: inventario.pigmento.materiaPrima.unidadMedida,
        usuarioId: input.usuarioId,
        ...(input.descripcion !== undefined && { descripcion: input.descripcion }),
        ...(input.referenciaTipo !== undefined && { referenciaTipo: input.referenciaTipo }),
        ...(input.referenciaId !== undefined && { referenciaId: input.referenciaId }),
      },
    });

    // JavaScript automáticamente espera esta promesa antes de considerar que la función async completó — sin tener que escribir await de forma explicita como los demas
    return tx.inventarioPigmento.update({
      where: { pigmentoId: input.pigmentoId },
      data: { cantidadActual: cantidadNueva },
    });
  };

  // Si hay una transaccion abierta, ejecutamos la funcion junto a esa transaccion
  if(txExterna) {
    return ejecutar(txExterna)
  }
  // Si no, abrimos una propia transaccion.
  return prisma.$transaction(ejecutar);
}

// ---------- PRODUCTO TERMINADO (identidad: producto + pigmento) ----------

export async function registrarMovimientoProducto(
  input: MovimientoProductoInput,
  txExterna?: PrismaTransactionClient
) {
  const ejecutar = async (tx:PrismaTransactionClient) => {
    // Upsert: (Update n Insert) puede ser la primera vez que se produce esta combinación
    const inventario = await tx.inventarioProductoTerminado.upsert({
      where: {
        productoId_pigmentoId: {
          productoId: input.productoId,
          pigmentoId: input.pigmentoId,
        },
      },
    //  Si es asi, la creamos y fijamos su cantidad inicial en 0.
      create: {
        productoId: input.productoId,
        pigmentoId: input.pigmentoId,
        cantidadActual: 0,
      },
    // Si ya existe, entonces no hacemos nada, aun.
      update: {},
    });

    // Si ya existe, continuamos y hacemos los calculos
    const cantidadAnterior = redondear3(Number(inventario.cantidadActual));
    const cantidadMovimiento = redondear3(calcularCantidadConSigno(input.tipoMovimiento, input.cantidad));
    const cantidadNueva = redondear3(cantidadAnterior + cantidadMovimiento);

    await tx.historialMovimientoInventario.create({
      data: {
        tipoInventario: "PRODUCTO",
        tipoMovimiento: input.tipoMovimiento,
        motivo: input.motivo,
        productoId: input.productoId,
        pigmentoProductoId: input.pigmentoId,
        cantidadAnterior,
        cantidadMovimiento,
        cantidadNueva,
        unidadMedida: "PIEZA",
        usuarioId: input.usuarioId,
        ...(input.descripcion !== undefined && { descripcion: input.descripcion }),
        ...(input.referenciaTipo !== undefined && { referenciaTipo: input.referenciaTipo }),
        ...(input.referenciaId !== undefined && { referenciaId: input.referenciaId }),
      },
    });

    // Actualizamos el inventario (productoId_pigmentoId es el nombre compuesto que prisma genera al usar @@unique([...])) y a las columnas individuales se les pasa los datos correspondientes (Id's) para hacer la busqueda)
    return tx.inventarioProductoTerminado.update({
      where: {
        productoId_pigmentoId: { productoId: input.productoId, pigmentoId: input.pigmentoId },
      },
      data: { cantidadActual: cantidadNueva },
    });
  };

  // Si hay una transaccion abierta, ejecutamos la funcion junto a esa transaccion
  if(txExterna) {
    return ejecutar(txExterna)
  }
  // Si no, abrimos una propia transaccion.
  return prisma.$transaction(ejecutar);
}

// ---------- MOLIDO (identidad: materiaPrima + origen + color) ----------

export async function registrarMovimientoMolido(
  input: MovimientoMolidoInput,
  txExterna?: PrismaTransactionClient
) {
  const ejecutar = async (tx: PrismaTransactionClient) => {
    // Capa de seguridad, si no existe la materia prima, no deberia poder existir un registro de inventario
    const materiaPrima = await tx.materiaPrima.findUnique({
      where: { id: input.materiaPrimaId },
    });
    // Asi controlamos un posible error desconocido de FK constraint (materiaPrimaId es FK de inventarioMolido)
    if (!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");

    const inventario = await tx.inventarioMolido.upsert({
      where: {
        materiaPrimaId_origen_colorSolidoId: {
          materiaPrimaId: input.materiaPrimaId,
          origen: input.origen,
          colorSolidoId: input.colorSolidoId,
        },
      },
      create: {
        materiaPrimaId: input.materiaPrimaId,
        origen: input.origen,
        colorSolidoId: input.colorSolidoId,
        cantidadActual: 0,
      },
      update: {},
    });

    const cantidadAnterior = redondear3(Number(inventario.cantidadActual));
    const cantidadMovimiento = redondear3(calcularCantidadConSigno(input.tipoMovimiento, input.cantidad));
    const cantidadNueva = redondear3(cantidadAnterior + cantidadMovimiento);

    await tx.historialMovimientoInventario.create({
      data: {
        tipoInventario: "MOLIDO",
        tipoMovimiento: input.tipoMovimiento,
        motivo: input.motivo,
        materialMolidoId: input.materiaPrimaId,
        origenMolido: input.origen,
        colorSolidoId: input.colorSolidoId,
        cantidadAnterior,
        cantidadMovimiento,
        cantidadNueva,
        unidadMedida: materiaPrima.unidadMedida,
        usuarioId: input.usuarioId,
        ...(input.descripcion !== undefined && { descripcion: input.descripcion }),
        ...(input.referenciaTipo !== undefined && { referenciaTipo: input.referenciaTipo }),
        ...(input.referenciaId !== undefined && { referenciaId: input.referenciaId }),
      },
    });

    return tx.inventarioMolido.update({
      where: {
        materiaPrimaId_origen_colorSolidoId: {
          materiaPrimaId: input.materiaPrimaId,
          origen: input.origen,
          colorSolidoId: input.colorSolidoId,
        },
      },
      data: { cantidadActual: cantidadNueva },
    });
  };

  // Si hay una transaccion abierta, ejecutamos la funcion junto a esa transaccion
  if(txExterna) {
    return ejecutar(txExterna)
  }
  // Si no, abrimos una propia transaccion.
  return prisma.$transaction(ejecutar);
}

// ---------- MATERIAL PIGMENTADO (identidad: materiaPrima + pigmento) ----------

export async function registrarMovimientoMaterialPigmentado(
  input: MovimientoMaterialPigmentadoInput,
  txExterna?: PrismaTransactionClient
) {
  const ejecutar = async (tx:PrismaTransactionClient) => {
    const materiaPrima = await tx.materiaPrima.findUnique({
      where: { id: input.materiaPrimaId },
    });
    if (!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");

    // Combinación es como el catalogo que identifica a cada registro de inventario — buscamos si existe, sino, lo creamos
    const combinacion = await tx.combinacionMaterialPigmentado.upsert({
      where: {
        materiaPrimaId_pigmentoId: {
          materiaPrimaId: input.materiaPrimaId,
          pigmentoId: input.pigmentoId,
        },
      },
      create: {
        materiaPrimaId: input.materiaPrimaId,
        pigmentoId: input.pigmentoId,
      },
      update: {},
    });

    // Buscamos un registro de inventario que tenga la combinacionId (nueva o vieja), si la combi es nueva, entonces el inventario no existe y la creamos, si existe, no hacemos nada (update: {}) y simplemente obtenemos el registro con sus respectivos valores ya almacenados.
    const inventario = await tx.inventarioMaterialPigmentado.upsert({
      where: { combinacionId: combinacion.id },
      create: { combinacionId: combinacion.id, cantidadActual: 0 },
      update: {},
    });

    const cantidadAnterior = redondear3(Number(inventario.cantidadActual));
    const cantidadMovimiento = redondear3(calcularCantidadConSigno(input.tipoMovimiento, input.cantidad));
    const cantidadNueva = redondear3(cantidadAnterior + cantidadMovimiento);

    await tx.historialMovimientoInventario.create({
      data: {
        tipoInventario: "MATERIAL_PIGMENTADO",
        tipoMovimiento: input.tipoMovimiento,
        motivo: input.motivo,
        combinacionMaterialPigmentadoId: combinacion.id,
        cantidadAnterior,
        cantidadMovimiento,
        cantidadNueva,
        unidadMedida: materiaPrima.unidadMedida,
        usuarioId: input.usuarioId,
        ...(input.descripcion !== undefined && { descripcion: input.descripcion }),
        ...(input.referenciaTipo !== undefined && { referenciaTipo: input.referenciaTipo }),
        ...(input.referenciaId !== undefined && { referenciaId: input.referenciaId }),
      },
    });

    return tx.inventarioMaterialPigmentado.update({
      where: { combinacionId: combinacion.id },
      data: { cantidadActual: cantidadNueva },
    });
  };

  // Si hay una transaccion abierta, ejecutamos la funcion junto a esa transaccion
  if(txExterna) {
    return ejecutar(txExterna)
  }
  // Si no, abrimos una propia transaccion.
  return prisma.$transaction(ejecutar);
}