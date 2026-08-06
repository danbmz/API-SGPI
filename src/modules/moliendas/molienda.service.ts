import { prisma } from "../../lib/prisma.js";
import { registrarMovimientoMolido } from "../../shared/inventario/movimiento-inventario.service.js";
import type { PrismaTransactionClient } from "../../shared/inventario/movimiento-inventario.types.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import type { AuthUser } from "../../types/fastify.js";
import type { CrearMoliendaBody } from "./molienda.schema.js";


function serializar(molienda: any) {
  return {
    id: molienda.id.toString(),
    tipoMaterial: molienda.tipoMaterial,
    colorSolidoId: molienda.colorSolidoId.toString(),
    colorSolidoNombre: molienda.colorSolido.nombre,
    kgIngresados: Number(molienda.kgIngresados),
    fecha: molienda.fecha.toISOString().split("T")[0],
    observaciones: molienda.observaciones,
    totalAvances: molienda.avancesTurno.length,
    totalIncidencias: molienda.incidencias.length,
    createdAt: molienda.createdAt.toISOString(),
  };
}

const includeCompleto = {
  colorSolido: true,
  avancesTurno: true,
  incidencias: true,
};

export async function listarPendientesMoler(tipoMaterial?: string) {
  const avances = await prisma.avanceTurno.findMany({
    where: {
      confirmacionMolinoConfirmado: true,
      moliendas: { none: {} }, // que no esté ya incluido en ninguna molienda
      ...(tipoMaterial !== undefined && {
        orden: { materiaPrima: { tipo: tipoMaterial as any } },
      }),
    },
    include: { orden: { include: { pigmento: true } } },
  });

  const incidencias = await prisma.incidenciaMaterialMalPigmentado.findMany({
    where: {
      destino: "MOLINO",
      confirmadoMolino: true,
      moliendas: { none: {} },
      ...(tipoMaterial !== undefined && {
        avanceTurno: { orden: { materiaPrima: { tipo: tipoMaterial as any } } },
      }),
    },
    include: { avanceTurno: { include: { orden: { include: { pigmento: true } } } } },
  });

  return {
    avances: avances.map((a) => ({
      id: a.id.toString(),
      ordenFolio: a.orden.folio,
      pigmentoColor: a.orden.pigmento.color,
      kgMerma: Number(a.kgMerma),
      kgPlasta: Number(a.kgPlasta),
    })),
    incidencias: incidencias.map((i) => ({
      id: i.id.toString(),
      ordenFolio: i.avanceTurno.orden.folio,
      pigmentoColor: i.avanceTurno.orden.pigmento.color,
      piezasAfectadas: i.piezasAfectadas,
    })),
  };
}

export async function listarMoliendas() {
  const moliendas = await prisma.molienda.findMany({
    include: includeCompleto,
    orderBy: { createdAt: "desc" },
  });
  return moliendas.map(serializar);
}

export async function crearMolienda(data: CrearMoliendaBody, actor: AuthUser, ip?: string) {
  if (data.avanceTurnoIds.length === 0 && data.incidenciaIds.length === 0) {
    throw new Error("MOLIENDA_SIN_ITEMS");
  }

  const colorSolidoId = BigInt(data.colorSolidoId);
  const color = await prisma.colorSolido.findUnique({ where: { id: colorSolidoId } });
  if (!color) throw new Error("COLOR_SOLIDO_NO_ENCONTRADO");

  const avanceIds = data.avanceTurnoIds.map((id) => BigInt(id));
  const incidenciaIds = data.incidenciaIds.map((id) => BigInt(id));

  // Validar que cada avance/incidencia esté disponible (confirmado y no molido ya)
  const avancesValidos = await prisma.avanceTurno.findMany({
    where: {
      id: { in: avanceIds },
      confirmacionMolinoConfirmado: true,
      moliendas: { none: {} },
    },
  });

  // Validamos que los avances seleccionados por el molino cumplan la validacion, si todoas las cumplen entonces todas estan disponibles 
  if (avancesValidos.length !== avanceIds.length) {
    throw new Error("AVANCE_NO_DISPONIBLE_PARA_MOLIENDA");
  }

  const incidenciasValidas = await prisma.incidenciaMaterialMalPigmentado.findMany({
    where: {
      id: { in: incidenciaIds },
      destino: "MOLINO",
      confirmadoMolino: true,
      moliendas: { none: {} },
    },
  });
  if (incidenciasValidas.length !== incidenciaIds.length) {
    throw new Error("INCIDENCIA_NO_DISPONIBLE_PARA_MOLIENDA");
  }

  const nueva = await prisma.$transaction(async (tx) => {
    const molienda = await tx.molienda.create({
      data: {
        tipoMaterial: data.tipoMaterial,
        colorSolidoId,
        kgIngresados: data.kgIngresados,
        fecha: new Date(data.fecha),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
      },
    });

    for (const avanceTurnoId of avanceIds) {
      await tx.moliendaAvanceTurno.create({ data: { moliendaId: molienda.id, avanceTurnoId } });
    }
    for (const incidenciaId of incidenciaIds) {
      await tx.moliendaIncidencia.create({ data: { moliendaId: molienda.id, incidenciaId } });
    }

    await registrarMovimientoMolido(
      {
        tipoMaterial: data.tipoMaterial,
        origen: "INTERNO",
        colorSolidoId,
        tipoMovimiento: "ENTRADA",
        motivo: "PLASTA", // o un motivo genérico "molienda" si prefieres distinguirlo — ver nota
        cantidad: data.kgIngresados,
        usuarioId: actor.id,
        referenciaTipo: "MOLIENDA",
        referenciaId: molienda.id,
      },
      tx as unknown as PrismaTransactionClient
    );

    return molienda;
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "MOLINO",
    accion: "crear_molienda",
    entidad: "molienda",
    entidadId: nueva.id,
    ...(ip !== undefined && { ip }),
  });

  const final = await prisma.molienda.findUniqueOrThrow({
    where: { id: nueva.id },
    include: includeCompleto,
  });

  return serializar(final);
}