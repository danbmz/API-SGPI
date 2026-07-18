import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import type { CrearUsuarioBody, EditarUsuarioBody, RolUsuario } from "./usuario.schema.js";

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

export async function crearUsuario(data: CrearUsuarioBody) {
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

  return serializarUsuario(nuevoUsuario);
}

export async function editarUsuario(id: bigint, data: EditarUsuarioBody) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  const actualizado = await prisma.usuario.update({
    where: { id },
    data: {
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.role !== undefined && { role: data.role }),
    },
  });

  return serializarUsuario(actualizado);
}

export async function desactivarUsuario(id: bigint) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  await prisma.usuario.update({
    where: { id },
    data: { activo: false },
  });
}

export async function reactivarUsuario(id: bigint) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  await prisma.usuario.update({
    where: { id },
    data: { activo: true },
  });
}

export async function cambiarPassword(id: bigint, nuevaPassword: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  const passwordHash = await argon2.hash(nuevaPassword);

  await prisma.usuario.update({
    where: { id },
    data: { password: passwordHash },
  });
}