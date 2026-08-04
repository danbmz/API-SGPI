import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearProductoBody, EditarProductoBody } from "./producto.schema.js";
import { TipoMaterial } from "../../../prisma/generated/prisma/client/enums.js";

function serializar(producto: {
  id: bigint;
  nombre: string;
  codigo: string;
  tipo: string;
  tipoMaterial: TipoMaterial,
  cavidades: number;
  ciclo: number;
//   Se maneja Unkown para tratar tipos desconocidos para JS, como el tipo de dato Prisma.Decimal que es el que adopta "peso" por haberlo hecho Decimal en el esquema de prisma (Aunque se puede importar dicho tipo para mayor precision).
  peso: unknown;
  activo: boolean;
  piezasPorEmpaque: number;
  precio: unknown;
  descripcion: string;
}) {
  return {
    id: producto.id.toString(),
    nombre: producto.nombre,
    codigo: producto.codigo,
    tipo: producto.tipo,
    TipoMaterial: producto.tipoMaterial,
    cavidades: producto.cavidades,
    ciclo: producto.ciclo,
    peso: Number(producto.peso),
    activo: producto.activo,
    piezasPorEmpaque: producto.piezasPorEmpaque,
    precio: Number(producto.precio),
    descripcion: producto.descripcion,
  };
}

export async function listarProductos() {
  const productos = await prisma.producto.findMany({
    orderBy: { nombre: "asc" },
  });
  return productos.map(serializar);
}

export async function crearProducto(data: CrearProductoBody, actor: AuthUser, ip?: string) {

  const existente = await prisma.producto.findUnique({ where: { codigo: data.codigo } });
  if (existente) {
    throw new Error("PRODUCTO_YA_EXISTE");
  }

  const nuevo = await prisma.producto.create({
    data: {
      nombre: data.nombre,
      codigo: data.codigo,
      tipo: data.tipo,
      cavidades: data.cavidades,
      ciclo: data.ciclo,
      peso: data.peso,
      tipoMaterial: data.tipoMaterial,
      piezasPorEmpaque: data.piezasPorEmpaque,
      precio: data.precio,
      descripcion: data.descripcion,
    },
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
      ...(data.piezasPorEmpaque !== undefined && { piezasPorEmpaque: data.piezasPorEmpaque}),
      ...(data.precio !== undefined && { precio: data.precio}),
      ...(data.descripcion !== undefined && {descripcion: data.descripcion}),
    },
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