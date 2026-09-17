import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type {
  CrearMaquinaBody,
  EditarMaquinaBody,
  CambiarEstadoMaquinaBody,
} from "./maquina.schema.js";
import type { EstadoMaquina, TipoProcesoMaquina } from "../../../prisma/generated/prisma/client/enums.js";

function serializar(maquina: {
  id: bigint;
  nombre: string;
  codigo: string;
  numero: number;
  tipoProceso: TipoProcesoMaquina;
  capacidadTon: unknown;
  estado: EstadoMaquina;
}) {
  return {
    id: maquina.id.toString(),
    nombre: maquina.nombre,
    codigo: maquina.codigo,
    numero: maquina.numero,
    tipoProceso: maquina.tipoProceso,
    capacidadTon: Number(maquina.capacidadTon),
    estado: maquina.estado,
  };
}

export async function listarMaquinas() {
  const maquinas = await prisma.maquina.findMany({
    orderBy: { numero: "asc" },
  });
  return maquinas.map(serializar);
}

export async function crearMaquina(data: CrearMaquinaBody, actor: AuthUser, ip?: string) {
  const existentePorCodigo = await prisma.maquina.findUnique({ where: { codigo: data.codigo } });
  if (existentePorCodigo) throw new Error("MAQUINA_YA_EXISTE");

  const existentePorNumero = await prisma.maquina.findUnique({ where: { numero: data.numero } });
  if (existentePorNumero) throw new Error("MAQUINA_NUMERO_YA_EXISTE");

  const nueva = await prisma.maquina.create({
    data: {
      nombre: data.nombre,
      codigo: data.codigo,
      numero: data.numero,
      tipoProceso: data.tipoProceso,
      capacidadTon: data.capacidadTon,
      estado: "ACTIVA",
    },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "crear",
    entidad: "maquina",
    entidadId: nueva.id,
    ...(ip !== undefined && { ip }),
  });

  return serializar(nueva);
}

export async function editarMaquina(
  id: bigint,
  data: EditarMaquinaBody,
  actor: AuthUser,
  ip?: string
) {
  const maquina = await prisma.maquina.findUnique({ where: { id } });
  if (!maquina) throw new Error("MAQUINA_NO_ENCONTRADA");

  const detalle = compararCambios(maquina, data, {
    nombre: "nombre",
    capacidadTon: "capacidad (ton)",
  });

  const actualizada = await prisma.maquina.update({
    where: { id },
    data: {
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.capacidadTon !== undefined && { capacidadTon: data.capacidadTon }),
    },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "editar",
    entidad: "maquina",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

  return serializar(actualizada);
}

export async function cambiarEstadoMaquina(
  id: bigint,
  data: CambiarEstadoMaquinaBody,
  actor: AuthUser,
  ip?: string
) {
  const maquina = await prisma.maquina.findUnique({ where: { id } });
  if (!maquina) throw new Error("MAQUINA_NO_ENCONTRADA");

  if (maquina.estado === data.estado) {
    throw new Error("MAQUINA_YA_EN_ESE_ESTADO");
  }

  // Si se intenta sacar la máquina de ACTIVA, verificar que no tenga producción en curso
  if (data.estado !== "ACTIVA") {
    const ordenEnCurso = await prisma.ordenProduccion.findFirst({
      where: {
        maquinaId: id,
        estado: { in: ["ACTIVA", "EN_PROGRESO"] },
      },
    });
    if (ordenEnCurso) throw new Error("MAQUINA_CON_ORDEN_EN_CURSO");
  }

  const estadoAnterior = maquina.estado;

  const actualizada = await prisma.maquina.update({
    where: { id },
    data: { estado: data.estado },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "CATALOGOS",
    accion: "cambiar_estado",
    entidad: "maquina",
    entidadId: id,
    detalle: `estado: ${estadoAnterior} → ${data.estado}${data.motivo ? ` (${data.motivo})` : ""}`,
    ...(ip !== undefined && { ip }),
  });

  return serializar(actualizada);
}