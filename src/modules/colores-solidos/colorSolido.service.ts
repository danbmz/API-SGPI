import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearColorSolidoBody, EditarColorSolidoBody } from "./colorSolido.schema.js";

function serializar(color: { id: bigint; nombre: string; activo: boolean }) {
  return {
    id: color.id.toString(),
    nombre: color.nombre,
    activo: color.activo,
  };
}

export async function listarColoresSolidos() {
  const colores = await prisma.colorSolido.findMany({ orderBy: { nombre: "asc" } });
  return colores.map(serializar);
}

export async function crearColorSolido(data: CrearColorSolidoBody, actor: AuthUser, ip?: string) {
  const existente = await prisma.colorSolido.findUnique({ where: { nombre: data.nombre } });
  if (existente) throw new Error("COLOR_SOLIDO_YA_EXISTE");

  const nuevo = await prisma.colorSolido.create({ data: { nombre: data.nombre } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "crear",
    entidad: "color_solido",
    entidadId: nuevo.id,
    ...(ip !== undefined && { ip }),
  });

  return serializar(nuevo);
}

export async function editarColorSolido(
  id: bigint,
  data: EditarColorSolidoBody,
  actor: AuthUser,
  ip?: string
) {
  const color = await prisma.colorSolido.findUnique({ where: { id } });
  if (!color) throw new Error("COLOR_SOLIDO_NO_ENCONTRADO");

  const detalle = compararCambios(color, data, { nombre: "nombre" });

  const actualizado = await prisma.colorSolido.update({
    where: { id },
    data: { nombre: data.nombre },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "editar",
    entidad: "color_solido",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

  return serializar(actualizado);
}

export async function desactivarColorSolido(id: bigint, actor: AuthUser, ip?: string) {
  const color = await prisma.colorSolido.findUnique({ where: { id } });
  if (!color) throw new Error("COLOR_SOLIDO_NO_ENCONTRADO");
  if (!color.activo) throw new Error("COLOR_SOLIDO_YA_INACTIVO");

  await prisma.colorSolido.update({ where: { id }, data: { activo: false } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "desactivar",
    entidad: "color_solido",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function reactivarColorSolido(id: bigint, actor: AuthUser, ip?: string) {
  const color = await prisma.colorSolido.findUnique({ where: { id } });
  if (!color) throw new Error("COLOR_SOLIDO_NO_ENCONTRADO");
  if (color.activo) throw new Error("COLOR_SOLIDO_YA_ACTIVO");

  await prisma.colorSolido.update({ where: { id }, data: { activo: true } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "reactivar",
    entidad: "color_solido",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}