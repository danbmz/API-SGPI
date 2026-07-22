import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearPigmentoBody, EditarPigmentoBody } from "./pigmento.schema.js";
import type { CategoriaColorPigmento, TipoPigmento } from "../../../prisma/generated/prisma/client/enums.js";

function serializar(pigmento: {
  id: bigint;
  color: string;
  categoriaColor: CategoriaColorPigmento;
  tipo: TipoPigmento;
  dosisGrPorKg: unknown;
  materiaPrimaId: bigint;
  materiaPrima: { nombre: string };
  activo: boolean;
  inventario: { cantidadActual: unknown; stockMinimo: unknown } | null;
}) {

  return {
    id: pigmento.id.toString(),
    color: pigmento.color,
    categoriaColor: pigmento.categoriaColor,
    tipo: pigmento.tipo,
    dosisGrPorKg: Number(pigmento.dosisGrPorKg),
    materiaPrimaId: pigmento.materiaPrimaId.toString(),
    materiaPrimaNombre: pigmento.materiaPrima.nombre,
    activo: pigmento.activo,
    stockActual: pigmento.inventario ? Number(pigmento.inventario.cantidadActual) : 0,
    stockMinimo: pigmento.inventario ? Number(pigmento.inventario.stockMinimo) : 0,
  };
}

export async function listarPigmentos() {
  const pigmentos = await prisma.pigmento.findMany({
    include: { materiaPrima: true, inventario: true },
    orderBy: [{ materiaPrimaId: "asc" }, { color: "asc" }],
  });
  return pigmentos.map(serializar);
}

export async function crearPigmento(data: CrearPigmentoBody, actor: AuthUser, ip?: string) {
  const materiaPrimaId = BigInt(data.materiaPrimaId);

  const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id: materiaPrimaId } });
  if (!materiaPrima) {
    throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");
  }

  const existente = await prisma.pigmento.findUnique({
    where: {
    // Cuando defines @@unique([materiaPrimaId, color, categoriaColor, tipo]) en Prisma, el cliente genera automáticamente un nombre compuesto uniendo los campos con guión bajo en el mismo orden. Es el nombre que Prisma espera cuando queremos consultar por esa combinación exacta.
      materiaPrimaId_color_categoriaColor_tipo: {
        materiaPrimaId,
        color: data.color,
        categoriaColor: data.categoriaColor,
        tipo: data.tipo,
      },
    },
  });

  if (existente) {
    throw new Error("PIGMENTO_YA_EXISTE");
  }

  const nuevo = await prisma.pigmento.create({
    data: {
      color: data.color,
      categoriaColor: data.categoriaColor,
      tipo: data.tipo,
      dosisGrPorKg: data.dosisGrPorKg,
      materiaPrimaId,
      inventario: {
        create: {
          cantidadActual: 0,
          stockMinimo: data.stockMinimo,
        },
      },
    },
    include: { materiaPrima: true, inventario: true },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "PIGMENTOS",
    accion: "crear",
    entidad: "pigmento",
    entidadId: nuevo.id,
    ...(ip !== undefined && { ip }),
  });

  return serializar(nuevo);
}

export async function editarPigmento(
  id: bigint,
  data: EditarPigmentoBody,
  actor: AuthUser,
  ip?: string
) {
  const pigmento = await prisma.pigmento.findUnique({ where: { id } });
  if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");

  const detalle = compararCambios(pigmento, data, {
    stockMinimo: "stockMínimo",
    dosisGrPorKg: "dosis (gr/kg)",
  });

  await prisma.pigmento.update({
    where: { id },
    data: {
    // Hacemos esto porque los campos son opcionales y debemos verificar que si existe un valor (no undefined)
      ...(data.stockMinimo !== undefined && { stockMinimo: data.stockMinimo }),
      ...(data.dosisGrPorKg !== undefined && { dosisGrPorKg: data.dosisGrPorKg }),
    },
  });

//   Si se cambio el stockMinimo, entonces actualizamos en la tabla de Inventario.
  if (data.stockMinimo !== undefined) {
    await prisma.inventarioPigmento.update({
      where: { pigmentoId: id },
      data: { stockMinimo: data.stockMinimo },
    });
  }

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "PIGMENTOS",
    accion: "editar",
    entidad: "pigmento",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

//   Devolvemos el registro ahora actualizado con los nuevos cambios
  const final = await prisma.pigmento.findUniqueOrThrow({
    where: { id },
    include: { materiaPrima: true, inventario: true },
  });

  return serializar(final);
}

export async function desactivarPigmento(id: bigint, actor: AuthUser, ip?: string) {
  const pigmento = await prisma.pigmento.findUnique({ where: { id } });
  if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");
  if (!pigmento.activo) throw new Error("PIGMENTO_YA_INACTIVO");

  await prisma.pigmento.update({ where: { id }, data: { activo: false } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "PIGMENTOS",
    accion: "desactivar",
    entidad: "pigmento",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function reactivarPigmento(id: bigint, actor: AuthUser, ip?: string) {
  const pigmento = await prisma.pigmento.findUnique({ where: { id } });
  if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");
  if (pigmento.activo) throw new Error("PIGMENTO_YA_ACTIVO");

  await prisma.pigmento.update({ where: { id }, data: { activo: true } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "PIGMENTOS",
    accion: "reactivar",
    entidad: "pigmento",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}