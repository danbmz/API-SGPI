import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearDefectoProductoBody, EditarDefectoProductoBody } from "./defecto.schema.js";

function serializar(defecto: { id: bigint; nombre: string; activo: boolean }) {
  return { id: defecto.id.toString(), nombre: defecto.nombre, activo: defecto.activo };
}

export async function listarDefectosProducto() {
  const defectos = await prisma.defectoProducto.findMany({ orderBy: { nombre: "asc" } });
  return defectos.map(serializar);
}

export async function crearDefectoProducto(
  data: CrearDefectoProductoBody,
  actor: AuthUser,
  ip?: string
) {
  const existente = await prisma.defectoProducto.findUnique({ where: { nombre: data.nombre } });
  if (existente) throw new Error("DEFECTO_YA_EXISTE");

  const nuevo = await prisma.defectoProducto.create({ data: { nombre: data.nombre } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "crear",
    entidad: "defecto_producto",
    entidadId: nuevo.id,
    ...(ip !== undefined && { ip }),
  });

  return serializar(nuevo);
}

export async function editarDefectoProducto(
  id: bigint,
  data: EditarDefectoProductoBody,
  actor: AuthUser,
  ip?: string
) {
  const defecto = await prisma.defectoProducto.findUnique({ where: { id } });
  if (!defecto) throw new Error("DEFECTO_NO_ENCONTRADO");

  const detalle = compararCambios(defecto, data, { nombre: "nombre" });

  const actualizado = await prisma.defectoProducto.update({
    where: { id },
    data: { nombre: data.nombre },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "editar",
    entidad: "defecto_producto",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

  return serializar(actualizado);
}

export async function desactivarDefectoProducto(id: bigint, actor: AuthUser, ip?: string) {
  const defecto = await prisma.defectoProducto.findUnique({ where: { id } });
  if (!defecto) throw new Error("DEFECTO_NO_ENCONTRADO");
  if (!defecto.activo) throw new Error("DEFECTO_INACTIVO");

  await prisma.defectoProducto.update({ where: { id }, data: { activo: false } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "desactivar",
    entidad: "defecto_producto",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function reactivarDefectoProducto(id: bigint, actor: AuthUser, ip?: string) {
  const defecto = await prisma.defectoProducto.findUnique({ where: { id } });
  if (!defecto) throw new Error("DEFECTO_NO_ENCONTRADO");
  if (defecto.activo) throw new Error("DEFECTO_YA_ACTIVO");

  await prisma.defectoProducto.update({ where: { id }, data: { activo: true } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "reactivar",
    entidad: "defecto_producto",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}