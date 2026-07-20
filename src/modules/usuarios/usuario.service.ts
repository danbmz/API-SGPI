import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import type { CrearUsuarioBody, EditarUsuarioBody } from "./usuario.schema.js";
import type { RolUsuario } from "../../../prisma/generated/prisma/client/enums.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import type { AuthUser } from "../../types/fastify.js";
import { compararCambios } from "../../utils/comparar-cambios.js";

function serializarUsuario(usuario: {
  id: bigint;
  nombre: string;
  usuario: string;
  role: RolUsuario;
  activo: boolean;
  createdAt: Date;
}) {
  return {
    id: usuario.id.toString(),
    nombre: usuario.nombre,
    usuario: usuario.usuario,
    role: usuario.role,
    activo: usuario.activo,
    createdAt: usuario.createdAt.toISOString(),
  };
}

export async function listarUsuarios() {
  const usuarios = await prisma.usuario.findMany({
    orderBy: { createdAt: "desc" },
  });
  return usuarios.map(serializarUsuario);
}

export async function crearUsuario(data: CrearUsuarioBody, actor: AuthUser, ip?: string) {
  const existente = await prisma.usuario.findUnique({
    where: { usuario: data.usuario },
  });

  if (existente) {
    throw new Error("USUARIO_YA_EXISTE");
  }

  const passwordHash = await argon2.hash(data.password);

  const nuevoUsuario = await prisma.usuario.create({
    data: {
      nombre: data.nombre,
      usuario: data.usuario,
      password: passwordHash,
      role: data.role,
    },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "USUARIOS",
    accion: "crear",
    entidad: "usuario",
    entidadId: nuevoUsuario.id,
    ...(ip !== undefined && { ip }),
  });

  return serializarUsuario(nuevoUsuario);
}

export async function editarUsuario(id: bigint, data: EditarUsuarioBody, actor: AuthUser, ip?: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new Error("USUARIO_NO_ENCONTRADO");

  const detalle = compararCambios(
    usuario,
    data,
    { nombre: "nombre", role: "rol" } // etiquetas legibles para el mensaje
  );

  const actualizado = await prisma.usuario.update({
    where: { id },
    data: {
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.role !== undefined && { role: data.role }),
    },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "USUARIOS",
    accion: "editar",
    entidad: "usuario",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

  return serializarUsuario(actualizado);
}

export async function desactivarUsuario(id: bigint, actor: AuthUser, ip?: string) {
  if (id === actor.id) {
    throw new Error("NO_PUEDES_DESACTIVARTE_A_TI_MISMO");
  }
  
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  if (!usuario.activo) {
    throw new Error("USUARIO_YA_INACTIVO");
  }

  if (usuario.role === "ADMIN") {
    const adminsActivos = await prisma.usuario.count({
      where: { role: "ADMIN", activo: true },
    });
    if (adminsActivos <= 1) {
      throw new Error("NO_PUEDE_QUEDAR_SIN_ADMIN_ACTIVO");
    }
  }

  const desactivado = await prisma.usuario.update({
    where: { id },
    data: { activo: false },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "USUARIOS",
    accion: "desactivar",
    entidad: "usuario",
    entidadId: desactivado.id,
    ...(ip !== undefined && { ip }),
  });
}

export async function reactivarUsuario(id: bigint, actor: AuthUser, ip?: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  if (usuario.activo) {
    throw new Error("USUARIO_YA_ACTIVO");
  }

  const reactivado = await prisma.usuario.update({
    where: { id },
    data: { activo: true },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "USUARIOS",
    accion: "reactivar",
    entidad: "usuario",
    entidadId: reactivado.id,
    ...(ip !== undefined && { ip }),
  });
}

export async function cambiarPassword(id: bigint, nuevaPassword: string, actor: AuthUser, ip?: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  const passwordHash = await argon2.hash(nuevaPassword);

  await prisma.usuario.update({
    where: { id },
    data: { password: passwordHash },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "USUARIOS",
    accion: "cambiar_password",
    entidad: "usuario",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}