import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearMateriaPrimaBody, EditarMateriaPrimaBody } from "./materiaPrima.Schema.js";
import type { UnidadMedida } from "../../../prisma/generated/prisma/client/enums.js";
import type { TipoMaterial } from "../../../prisma/generated/prisma/client/enums.js";

function serializar(materiaPrima: {
  id: bigint;
  nombre: string;
  codigoInterno: string;
  tipo: TipoMaterial;
  proveedor: string | null;
  unidadMedida: UnidadMedida;
  costoUnitario: unknown;
  activo: boolean;
  inventarioVirgen: { cantidadActual: unknown; stockMinimo: unknown } | null;
}) {
  return {
    id: materiaPrima.id.toString(),
    nombre: materiaPrima.nombre,
    codigoInterno: materiaPrima.codigoInterno,
    tipo: materiaPrima.tipo,
    proveedor: materiaPrima.proveedor,
    unidadMedida: materiaPrima.unidadMedida,
    costoUnitario: materiaPrima.costoUnitario ? Number(materiaPrima.costoUnitario) : null,
    activo: materiaPrima.activo,
    stockActual: materiaPrima.inventarioVirgen ? Number(materiaPrima.inventarioVirgen.cantidadActual) : 0,
    stockMinimo: materiaPrima.inventarioVirgen ? Number(materiaPrima.inventarioVirgen.stockMinimo) : 0,
  };
}

export async function listarMateriasPrimas() {
  const materias = await prisma.materiaPrima.findMany({
    include: { inventarioVirgen: true },
    orderBy: { nombre: "asc" },
  });
  return materias.map(serializar);
}

export async function crearMateriaPrima(
  data: CrearMateriaPrimaBody,
  actor: AuthUser,
  ip?: string
) {
  const existente = await prisma.materiaPrima.findUnique({
    where: { codigoInterno: data.codigoInterno },
  });

  if (existente) {
    throw new Error("MATERIA_PRIMA_YA_EXISTE");
  }

  const nueva = await prisma.materiaPrima.create({
    data: {
      nombre: data.nombre,
      codigoInterno: data.codigoInterno,
      tipo: data.tipo,
      unidadMedida: data.unidadMedida,
      ...(data.proveedor !== undefined && { proveedor: data.proveedor }),
      ...(data.costoUnitario !== undefined && { costoUnitario: data.costoUnitario }),
      inventarioVirgen: {
        create: {
          cantidadActual: 0,
          stockMinimo: data.stockMinimo,
        },
      },
    },
    include: { inventarioVirgen: true },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "crear",
    entidad: "materia_prima",
    entidadId: nueva.id,
    ...(ip !== undefined && { ip }),
  });

  return serializar(nueva);
}

export async function editarMateriaPrima(
  id: bigint,
  data: EditarMateriaPrimaBody,
  actor: AuthUser,
  ip?: string
) {
  const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id } });
  if (!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");

  const detalle = compararCambios(materiaPrima, data, {
    nombre: "nombre",
    proveedor: "proveedor",
    costoUnitario: "costo unitario",
  });

  const actualizada = await prisma.materiaPrima.update({
    where: { id },
    data: {
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.proveedor !== undefined && { proveedor: data.proveedor }),
      ...(data.costoUnitario !== undefined && { costoUnitario: data.costoUnitario }),
    },
    include: { inventarioVirgen: true },
  });

  if (data.stockMinimo !== undefined) {
    await prisma.inventarioMateriaPrima.update({
      where: { materiaPrimaId: id },
      data: { stockMinimo: data.stockMinimo },
    });
  }

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "editar",
    entidad: "materia_prima",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

  // Volvemos a leer para reflejar el stockMinimo actualizado en la respuesta
  const final = await prisma.materiaPrima.findUniqueOrThrow({
    where: { id },
    include: { inventarioVirgen: true },
  });

  return serializar(final);
}

export async function desactivarMateriaPrima(id: bigint, actor: AuthUser, ip?: string) {
  const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id } });
  if (!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");
  if (!materiaPrima.activo) throw new Error("MATERIA_PRIMA_YA_INACTIVA");

  await prisma.materiaPrima.update({
    where: { id },
    data: { activo: false },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "desactivar",
    entidad: "materia_prima",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function reactivarMateriaPrima(id: bigint, actor: AuthUser, ip?: string) {
  const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id } });
  if (!materiaPrima) throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");
  if (materiaPrima.activo) throw new Error("MATERIA_PRIMA_YA_ACTIVA");

  await prisma.materiaPrima.update({
    where: { id },
    data: { activo: true },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "reactivar",
    entidad: "materia_prima",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}