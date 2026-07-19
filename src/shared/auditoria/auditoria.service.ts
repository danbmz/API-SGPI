import { prisma } from "../../lib/prisma.js";
import type { ModuloAuditoria } from "../../../prisma/generated/prisma/client/enums.js";

interface RegistrarAccionParams {
  usuarioId: bigint;
  usuarioLogin: string;
  usuarioNombre: string;
  modulo: ModuloAuditoria;
  accion: string;
  entidad?: string;
  entidadId?: bigint;
  detalle?: string;
  ip?: string;
}

// Creamos el registro de las acciones en la tabla de la DB
export async function registrarAccion(params: RegistrarAccionParams) {
  await prisma.auditLog.create({
    data: {
      usuarioId: params.usuarioId,
      usuarioLogin: params.usuarioLogin,
      usuarioNombre: params.usuarioNombre,
      modulo: params.modulo,
      accion: params.accion,
      ...(params.entidad !== undefined && { entidad: params.entidad }),
      ...(params.entidadId !== undefined && { entidadId: params.entidadId }),
      ...(params.detalle !== undefined && { detalle: params.detalle }),
      ...(params.ip !== undefined && { ip: params.ip }),
    },
  });
}