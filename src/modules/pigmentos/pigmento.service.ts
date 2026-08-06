import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearPigmentoBody, EditarPigmentoBody } from "./pigmento.schema.js";
import type { CategoriaColorPigmento, TipoPigmento, TipoMaterial } from "../../../prisma/generated/prisma/client/enums.js";

function serializar(pigmento: {
  id: bigint;
  color: string;
  categoriaColor: CategoriaColorPigmento;
  tipo: TipoPigmento;
  dosisGrPorKg: unknown;
  tipoMaterial: TipoMaterial;
  colorSolidoId: bigint | null;
  colorSolido: { nombre: string } | null;
  activo: boolean;
  costoUnitario: unknown;
  inventario: { cantidadActual: unknown; stockMinimo: unknown } | null;
}) {

  return {
    id: pigmento.id.toString(),
    color: pigmento.color,
    categoriaColor: pigmento.categoriaColor,
    tipo: pigmento.tipo,
    dosisGrPorKg: Number(pigmento.dosisGrPorKg),
    tipoMaterial: pigmento.tipoMaterial,
    colorSolidoId: pigmento.colorSolidoId ? pigmento.colorSolidoId.toString() : null,
    colorSolidoNombre: pigmento.colorSolido ? pigmento.colorSolido.nombre : null,
    activo: pigmento.activo,
    costoUnitario: pigmento.costoUnitario !== null ? Number(pigmento.costoUnitario) : null, // Null
    stockActual: pigmento.inventario ? Number(pigmento.inventario.cantidadActual) : 0,
    stockMinimo: pigmento.inventario ? Number(pigmento.inventario.stockMinimo) : 0,
  };
}

export async function listarPigmentos() {
  const pigmentos = await prisma.pigmento.findMany({
    include: { inventario: true, colorSolido: true },
    orderBy: [{ color: "asc" }],
  });
  return pigmentos.map(serializar);
}

export async function crearPigmento(data: CrearPigmentoBody, actor: AuthUser, ip?: string) {
  // Ya no se valida materiaPrima — tipoMaterial es un enum, no requiere buscar nada

  const existente = await prisma.pigmento.findUnique({
    where: {
    // Cuando defines @@unique([materiaPrimaId, color, categoriaColor, tipo]) en Prisma, el cliente genera automáticamente un nombre compuesto uniendo los campos con guión bajo en el mismo orden. Es el nombre que Prisma espera cuando queremos consultar por esa combinación exacta.
      tipoMaterial_color_categoriaColor_tipo: {
        tipoMaterial: data.tipoMaterial,
        color: data.color,
        categoriaColor: data.categoriaColor,
        tipo: data.tipo,
      },
    },
  });

  if (existente) {
    throw new Error("PIGMENTO_YA_EXISTE");
  }

  // Si viene colorSolidoId validamos que exista
  let colorSolidoId: bigint | undefined;
  if (data.colorSolidoId !== undefined) {
    colorSolidoId = BigInt(data.colorSolidoId);
    const color = await prisma.colorSolido.findUnique({ where: { id: colorSolidoId } });
    if (!color) throw new Error("COLOR_SOLIDO_NO_ENCONTRADO");
  }

  const nuevo = await prisma.pigmento.create({
    data: {
      color: data.color,
      categoriaColor: data.categoriaColor,
      tipo: data.tipo,
      dosisGrPorKg: data.dosisGrPorKg,
      tipoMaterial: data.tipoMaterial,
      ...(colorSolidoId !== undefined && { colorSolidoId }),
      ...(data.costoUnitario !== undefined && { costoUnitario: data.costoUnitario }),
      inventario: {
        create: {
          cantidadActual: data.stockActual,
          stockMinimo: data.stockMinimo,
        },
      },
    },
    include: { inventario: true, colorSolido: true },
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
      ...(data.color !== undefined && { color: data.color}),
      ...(data.costoUnitario !== undefined && { costoUnitario: data.costoUnitario}),
      ...(data.dosisGrPorKg !== undefined && { dosisGrPorKg: data.dosisGrPorKg }),
      ...(data.colorSolidoId !== undefined && { colorSolidoId: BigInt(data.colorSolidoId) }),
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
    include: { inventario: true, colorSolido: true },
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