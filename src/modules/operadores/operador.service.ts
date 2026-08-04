import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearOperadorBody, EditarOperadorBody } from "./operador.schema.js";

function serializar(defecto: { id: bigint; nombre: string; activo: boolean }) {
  return { id: defecto.id.toString(), nombre: defecto.nombre, activo: defecto.activo };
}

export async function listarOperadores() {
  const operadores = await prisma.operador.findMany({ orderBy: { id: "asc" } });
  return operadores.map(serializar);
}

export async function crearOperador(
  data: CrearOperadorBody,
  actor: AuthUser,
  ip?: string
) {
  const existente = await prisma.operador.findFirst({ where: { nombre: data.nombre } });
  if (existente) throw new Error("OPERADOR_YA_EXISTE");

  const nuevo = await prisma.operador.create({ data: { nombre: data.nombre } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "crear",
    entidad: "operador",
    entidadId: nuevo.id,
    ...(ip !== undefined && { ip }),
  });

  return serializar(nuevo);
}

export async function editarOperador(
  id: bigint,
  data: EditarOperadorBody,
  actor: AuthUser,
  ip?: string
) {
  const operador = await prisma.operador.findUnique({ where: { id } });
  if (!operador) throw new Error("OPERADOR_NO_ENCONTRADO");

  const detalle = compararCambios(operador, data, { nombre: "nombre" });

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
    entidad: "operador",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

  return serializar(actualizado);
}

export async function desactivarOperador(id: bigint, actor: AuthUser, ip?: string) {
  const operador = await prisma.operador.findUnique({ where: { id } });
  if (!operador) throw new Error("OPERADOR_NO_ENCONTRADO");
  if (!operador.activo) throw new Error("OPERADOR_YA_INACTIVO");

  await prisma.operador.update({ where: { id }, data: { activo: false } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "desactivar",
    entidad: "operador",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function reactivarOperador(id: bigint, actor: AuthUser, ip?: string) {
  const operador = await prisma.operador.findUnique({ where: { id } });
  if (!operador) throw new Error("OPERADOR_NO_ENCONTRADO");
  if (operador.activo) throw new Error("OPERADOR_YA_ACTIVO");

  await prisma.operador.update({ where: { id }, data: { activo: true } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "reactivar",
    entidad: "operador",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}