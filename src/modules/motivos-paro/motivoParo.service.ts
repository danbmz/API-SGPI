import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearMotivoParoBody, EditarMotivoParoBody } from "./motivoParo.schema.js";
import type { CategoriaMotivoParo } from "../../../prisma/generated/prisma/client/enums.js";

function serializar(motivo: { id: bigint; nombre: string; activo: boolean; categoria: CategoriaMotivoParo }) {
  return {
    id: motivo.id.toString(),
    nombre: motivo.nombre,
    categoria: motivo.categoria,
    activo: motivo.activo,
  };
}

export async function listarMotivosParo() {
  const motivos = await prisma.motivoParo.findMany({ orderBy: { nombre: "asc" } });
  return motivos.map(serializar);
}

export async function crearMotivoParo(data: CrearMotivoParoBody, actor: AuthUser, ip?: string) {
  const existente = await prisma.motivoParo.findUnique({ where: { nombre: data.nombre } });
  if (existente) throw new Error("MOTIVO_PARO_YA_EXISTE");

  const nuevo = await prisma.motivoParo.create({ data: { nombre: data.nombre, categoria: data.categoria } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "crear",
    entidad: "motivo_paro",
    entidadId: nuevo.id,
    ...(ip !== undefined && { ip }),
  });

  return serializar(nuevo);
}

export async function editarMotivoParo(
  id: bigint,
  data: EditarMotivoParoBody,
  actor: AuthUser,
  ip?: string
) {
  const motivo = await prisma.motivoParo.findUnique({ where: { id } });
  if (!motivo) throw new Error("MOTIVO_PARO_NO_ENCONTRADO");

  const detalle = compararCambios(motivo, data, { nombre: "nombre" });

  const actualizado = await prisma.motivoParo.update({
    where: { id },
    data: { nombre: data.nombre },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "editar",
    entidad: "motivo_paro",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

  return serializar(actualizado);
}

export async function desactivarMotivoParo(id: bigint, actor: AuthUser, ip?: string) {
  const motivo = await prisma.motivoParo.findUnique({ where: { id } });
  if (!motivo) throw new Error("MOTIVO_PARO_NO_ENCONTRADO");
  if (!motivo.activo) throw new Error("MOTIVO_PARO_YA_INACTIVO");

  await prisma.motivoParo.update({ where: { id }, data: { activo: false } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "desactivar",
    entidad: "motivo_paro",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function reactivarMotivoParo(id: bigint, actor: AuthUser, ip?: string) {
  const motivo = await prisma.motivoParo.findUnique({ where: { id } });
  if (!motivo) throw new Error("MOTIVO_PARO_NO_ENCONTRADO");
  if (motivo.activo) throw new Error("MOTIVO_PARO_YA_ACTIVO");

  await prisma.motivoParo.update({ where: { id }, data: { activo: true } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "reactivar",
    entidad: "motivo_paro",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}