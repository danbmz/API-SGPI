import { prisma } from "../../lib/prisma.js"; 
import type { ModuloAuditoria } from "../../../prisma/generated/prisma/client/enums.js";
import type { ListarAuditoriaQuery } from "./auditoria.schema.js";

export async function listarAuditoria(query: ListarAuditoriaQuery) {
  const pagina = query.pagina ?? 1;
  const limite = query.limite ?? 30;

  const where = {
    ...(query.modulo !== undefined && { modulo: query.modulo as ModuloAuditoria }),
    ...(query.usuarioId !== undefined && { usuarioId: BigInt(query.usuarioId) }),
    ...((query.fechaDesde !== undefined || query.fechaHasta !== undefined) && {
      createdAt: {
        ...(query.fechaDesde !== undefined && { gte: new Date(query.fechaDesde) }),
        ...(query.fechaHasta !== undefined && { lte: new Date(query.fechaHasta + "T23:59:59.999Z") }),
      },
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs.map((log) => ({
      id: log.id.toString(),
      usuarioId: log.usuarioId.toString(),
      usuarioLogin: log.usuarioLogin,
      usuarioNombre: log.usuarioNombre,
      modulo: log.modulo,
      accion: log.accion,
      entidad: log.entidad,
      entidadId: log.entidadId !== null ? log.entidadId.toString() : null,
      detalle: log.detalle,
      ip: log.ip,
      createdAt: log.createdAt.toISOString(),
    })),
    paginacion: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
  };
}