import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearProductoBody, EditarProductoBody } from "./producto.schema.js";

function serializar(producto: {
  id: bigint;
  nombre: string;
  codigo: string;
  tipo: string;
  materiaPrimaId: bigint;
  materiaPrima: { nombre: string };
  cavidades: number;
  ciclo: number;
//   Se maneja Unkown para tratar tipos desconocidos para JS, como el tipo de dato Prisma.Decimal que es el que adopta "peso" por haberlo hecho Decimal en el esquema de prisma (Aunque se puede importar dicho tipo para mayor precision).
  peso: unknown;
  activo: boolean;
}) {
  return {
    id: producto.id.toString(),
    nombre: producto.nombre,
    codigo: producto.codigo,
    tipo: producto.tipo,
    materiaPrimaId: producto.materiaPrimaId.toString(),
    materiaPrimaNombre: producto.materiaPrima.nombre,
    cavidades: producto.cavidades,
    ciclo: producto.ciclo,
    peso: Number(producto.peso),
    activo: producto.activo,
  };
}

export async function listarProductos() {
  const productos = await prisma.producto.findMany({
    include: { materiaPrima: true },
    orderBy: { nombre: "asc" },
  });
  return productos.map(serializar);
}

export async function crearProducto(data: CrearProductoBody, actor: AuthUser, ip?: string) {
// Transformamos a BigInt para que coincida con el tipo de dato en la base
  const materiaPrimaId = BigInt(data.materiaPrimaId);

  const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id: materiaPrimaId } });
  if (!materiaPrima) {
    throw new Error("MATERIA_PRIMA_NO_ENCONTRADA");
  }

  const existente = await prisma.producto.findUnique({ where: { codigo: data.codigo } });
  if (existente) {
    throw new Error("PRODUCTO_YA_EXISTE");
  }

  const nuevo = await prisma.producto.create({
    data: {
      nombre: data.nombre,
      codigo: data.codigo,
      tipo: data.tipo,
      materiaPrimaId,
      cavidades: data.cavidades,
      ciclo: data.ciclo,
      peso: data.peso,
    },
    include: { materiaPrima: true },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "crear",
    entidad: "producto",
    entidadId: nuevo.id,
    ...(ip !== undefined && { ip }),
  });

  return serializar(nuevo);
}

export async function editarProducto(
  id: bigint,
  data: EditarProductoBody,
  actor: AuthUser,
  ip?: string
) {
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) throw new Error("PRODUCTO_NO_ENCONTRADO");

  const detalle = compararCambios(producto, data, {
    nombre: "nombre",
    tipo: "tipo",
    cavidades: "cavidades",
    ciclo: "ciclo (seg)",
    peso: "peso (gr)",
  });

  const actualizado = await prisma.producto.update({
    where: { id },
    data: {
    // Recordemos que esto se usa cada que los campos no son obligatorios (opcionales)
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.cavidades !== undefined && { cavidades: data.cavidades }),
      ...(data.ciclo !== undefined && { ciclo: data.ciclo }),
      ...(data.peso !== undefined && { peso: data.peso }),
    },
    include: { materiaPrima: true },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "editar",
    entidad: "producto",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

  return serializar(actualizado);
}

export async function desactivarProducto(id: bigint, actor: AuthUser, ip?: string) {
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) throw new Error("PRODUCTO_NO_ENCONTRADO");
  if (!producto.activo) throw new Error("PRODUCTO_YA_INACTIVO");

  await prisma.producto.update({ where: { id }, data: { activo: false } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "desactivar",
    entidad: "producto",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function reactivarProducto(id: bigint, actor: AuthUser, ip?: string) {
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) throw new Error("PRODUCTO_NO_ENCONTRADO");
  if (producto.activo) throw new Error("PRODUCTO_YA_ACTIVO");

  await prisma.producto.update({ where: { id }, data: { activo: true } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "reactivar",
    entidad: "producto",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}