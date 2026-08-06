import { prisma } from "../../lib/prisma.js";
import { registrarMovimientoMaterialPigmentado, registrarMovimientoMateriaPrima, registrarMovimientoMolido, registrarMovimientoPigmento, registrarMovimientoProducto } from "../../shared/inventario/movimiento-inventario.service.js";
import type { PrismaTransactionClient } from "../../shared/inventario/movimiento-inventario.types.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import type { AuthUser } from "../../types/fastify.js";
import type {
  CrearAvanceTurnoBody,
  ActualizarAvanceTurnoBody,
  CerrarAvanceTurnoBody,
  ConfirmarMolinoBody,
  ConfirmarSobranteBody,
  CrearSolicitudMaterialBody,
  CrearIncidenciaMalPigmentadoBody,
  ConfirmarIncidenciaMolinoBody,
  ResolverIncidenciaBody,
  CrearTiempoParoBody,
} from "./avanceTurno.schema.js";

const includeCompleto = {
  orden: true,
  supervisor: true,
  defectoProducto: true,
  operador: true,
};

function serializar(avance: any) {
  return {
    id: avance.id.toString(),
    ordenId: avance.ordenId.toString(),
    ordenFolio: avance.orden.folio,
    supervisorId: avance.supervisorId.toString(),
    supervisorNombre: avance.supervisor.nombre,
    turno: avance.turno,
    fecha: avance.fecha.toISOString().split("T")[0],
    horaInicio: avance.horaInicio.toISOString(),
    horaFin: avance.horaFin ? avance.horaFin.toISOString() : null,
    estado: avance.estado,
    piezasBuenas: avance.piezasBuenas,
    piezasDefectuosas: avance.piezasDefectuosas,
    defectoId: avance.defectoProductoId !== null ? avance.defectoProductoId.toString() : null,
    defectoNombre: avance.defectoProducto ? avance.defectoProducto.nombre : null,
    cicloReal: avance.cicloReal,
    materialKG: avance.materialKG !== null ? Number(avance.materialKG) : null,
    operadorId: avance.operadorId !== null ? avance.operadorId.toString() : null,
    operadorNombre: avance.operador ? avance.operador.nombre : null,
    kgMerma: Number(avance.kgMerma),
    kgPlasta: Number(avance.kgPlasta),
    piezasCambioColor: avance.piezasCambioColor,
    kgSobrante: avance.kgSobrante !== null ? Number(avance.kgSobrante) : null,
    sobranteConfirmado: avance.sobranteConfirmado,
    confirmacionMolinoConfirmado: avance.confirmacionMolinoConfirmado,
    observaciones: avance.observaciones,
  };
}

function serializarSolicitud(solicitud: any) {
  return {
    id: solicitud.id.toString(),
    avanceTurnoId: solicitud.avanceTurnoId.toString(),
    tipoMaterial: solicitud.tipoMaterial,
    kgSolicitados: Number(solicitud.kgSolicitados),
    motivo: solicitud.motivo,
    confirmado: solicitud.confirmado,
    confirmadoPorNombre: solicitud.confirmadoPor ? solicitud.confirmadoPor.nombre : null,
    confirmadoEn: solicitud.confirmadoEn ? solicitud.confirmadoEn.toISOString() : null,
  };
}

function serializarTiempoParo(tiempo: any) {
  return {
    id: tiempo.id.toString(),
    avanceTurnoId: tiempo.avanceTurnoId.toString(),
    motivoParoId: tiempo.motivoParoId.toString(),
    motivoParoNombre: tiempo.motivoParo.nombre,
    minutos: tiempo.minutos,
    observaciones: tiempo.observaciones,
  };
}

function serializarIncidencia(inc: any) {
  return {
    id: inc.id.toString(),
    avanceTurnoId: inc.avanceTurnoId.toString(),
    piezasAfectadas: inc.piezasAfectadas,
    destino: inc.destino,
    confirmadoMolino: inc.confirmadoMolino,
    resuelto: inc.resuelto,
    tipoMaterialAgregado: inc.tipoMaterialAgregado,
    kgMaterialAgregado: inc.kgMaterialAgregado !== null ? Number(inc.kgMaterialAgregado) : null,
    gramosPigmentoAgregado:
      inc.gramosPigmentoAgregado !== null ? Number(inc.gramosPigmentoAgregado) : null,
  };
}

export async function listarAvancesTurno(actor: AuthUser) {
  // El supervisor solo ve sus propios avances; otros roles ven todos.
  const where = actor.role === "SUPERVISOR" ? { supervisorId: actor.id } : {};

  const avances = await prisma.avanceTurno.findMany({
    where,
    include: includeCompleto,
    orderBy: { createdAt: "desc" },
  });

  return avances.map(serializar);
}

export async function listarSolicitudesMaterial(avanceTurnoId: bigint) {
  const solicitudes = await prisma.solicitudMaterial.findMany({
    where: { avanceTurnoId },
    include: { confirmadoPor: true },
    orderBy: { createdAt: "desc" },
  });
  return solicitudes.map(serializarSolicitud);
}

export async function listarTiemposParo(avanceTurnoId: bigint) {
  const tiempos = await prisma.tiempoParo.findMany({
    where: { avanceTurnoId },
    include: { motivoParo: true },
    orderBy: { createdAt: "desc" },
  });
  return tiempos.map(serializarTiempoParo);
}

export async function crearAvanceTurno(data: CrearAvanceTurnoBody, actor: AuthUser, ip?: string) {
  const ordenId = BigInt(data.ordenId);

  const orden = await prisma.ordenProduccion.findUnique({ where: { id: ordenId } });
  if (!orden) throw new Error("ORDEN_NO_ENCONTRADA");

  if (orden.estado !== "ACTIVA" && orden.estado !== "EN_PROGRESO") {
    throw new Error("ORDEN_NO_DISPONIBLE_PARA_AVANCE");
  }

  // Evitamos duplicar avances de una orden al mismo tiempo (sea del mismo supervisor o de otros)
  const avanceAbierto = await prisma.avanceTurno.findFirst({
    where: { ordenId, estado: "ABIERTO" },
  });
  if (avanceAbierto) {
    throw new Error("ORDEN_YA_TIENE_AVANCE_ABIERTO");
  }

  // Usamos transaction para asegurarnos que se crea el avance y cambia el estado de la orden
  const nuevo = await prisma.$transaction(async (tx) => {
    const avance = await tx.avanceTurno.create({
      data: {
        ordenId,
        supervisorId: actor.id,
        turno: data.turno,
        fecha: new Date(data.fecha),
        horaInicio: new Date(data.horaInicio),
        estado: "ABIERTO",
      },
    });

    // Primera vez que se trabaja esta orden: transición automática a EN_PROGRESO
    if (orden.estado === "ACTIVA") {
      await tx.ordenProduccion.update({
        where: { id: ordenId },
        data: { estado: "EN_PROGRESO" },
      });
    }

    return avance;
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "MOLINO", // reutilizamos el módulo existente más cercano; ver nota abajo
    accion: "crear_avance",
    entidad: "avance_turno",
    entidadId: nuevo.id,
    ...(ip !== undefined && { ip }),
  });

  const final = await prisma.avanceTurno.findUniqueOrThrow({
    where: { id: nuevo.id },
    include: includeCompleto,
  });

  return serializar(final);
}

// Funcion que GuardaBorrador, no validamos nada, solo guardamos los datos y mantenemos el avance abierto.
export async function actualizarAvanceTurno(
  id: bigint,
  data: ActualizarAvanceTurnoBody,
  actor: AuthUser,
  ip?: string
) {
  const avance = await prisma.avanceTurno.findUnique({ where: { id } });
  if (!avance) throw new Error("AVANCE_TURNO_NO_ENCONTRADO");
  if (avance.supervisorId !== actor.id) throw new Error("AVANCE_TURNO_NO_PROPIO");
  if (avance.estado !== "ABIERTO") throw new Error("AVANCE_TURNO_YA_CERRADO");

  const actualizado = await prisma.avanceTurno.update({
    where: { id },
    data: {
      ...(data.piezasBuenas !== undefined && { piezasBuenas: data.piezasBuenas }),
      ...(data.piezasDefectuosas !== undefined && { piezasDefectuosas: data.piezasDefectuosas }),
      ...(data.kgMerma !== undefined && { kgMerma: data.kgMerma }),
      ...(data.kgPlasta !== undefined && { kgPlasta: data.kgPlasta }),
      ...(data.piezasCambioColor !== undefined && { piezasCambioColor: data.piezasCambioColor }),
      ...(data.kgSobrante !== undefined && { kgSobrante: data.kgSobrante }),
      ...(data.tipoMaterialSobrante !== undefined && {
        tipoMaterialSobrante: data.tipoMaterialSobrante,
      }),
      ...(data.defectoId !== undefined && { defectoId: BigInt(data.defectoId) }),
      ...(data.descripcionOtro !== undefined && {
        descripcionOtro: data.descripcionOtro,
      }),
      ...(data.operadorId !== undefined && { operadorId: BigInt(data.operadorId) }),
      ...(data.cicloReal !== undefined && { cicloReal: data.cicloReal }),
      ...(data.materialKG !== undefined && { materialKG: data.materialKG }),
      ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
      borradorGuardado: true,
    },
    include: includeCompleto,
  });

  return serializar(actualizado);
}

// Aqui ya validamos los datos, cambiamos el estado del avance a cerrado y calculamos piezas para cerrar o continuar la orden
export async function cerrarAvanceTurno(
  id: bigint,
  data: CerrarAvanceTurnoBody,
  actor: AuthUser,
  ip?: string
) {
  const avance = await prisma.avanceTurno.findUnique({
    where: { id },
    include: { orden: { include: { pedidoDetalle: true } } },
  });
  if (!avance) throw new Error("AVANCE_TURNO_NO_ENCONTRADO");
  if (avance.supervisorId !== actor.id) throw new Error("AVANCE_TURNO_NO_PROPIO");
  if (avance.estado !== "ABIERTO") throw new Error("AVANCE_TURNO_YA_CERRADO");

  const operadorId = BigInt(data.operadorId);
  const operador = await prisma.operador.findUnique({ where: { id: operadorId } });
  if (!operador) throw new Error("OPERADOR_NO_ENCONTRADO");
  if (!operador.activo) throw new Error("OPERADOR_INACTIVO");

  let defectoId: bigint | undefined;
  if (data.defectoId !== undefined) {
    defectoId = BigInt(data.defectoId);
    const defecto = await prisma.defectoProducto.findUnique({ where: { id: defectoId } });
    if (!defecto) throw new Error("DEFECTO_NO_ENCONTRADO");
    if (!defecto.activo) throw new Error("DEFECTO_INACTIVO");
  }

  // Comprobamos que venga el valor del tipo de material que se devolvera a inventario  
  if (data.kgSobrante !== undefined && data.kgSobrante > 0 && data.tipoMaterialSobrante === undefined) {
    throw new Error("TIPO_MATERIAL_SOBRANTE_REQUERIDO");
  }

  const resultado = await prisma.$transaction(async (tx) => {
    await tx.avanceTurno.update({
      where: { id },
      data: {
        estado: "CERRADO",
        horaFin: new Date(data.horaFin),
        piezasBuenas: data.piezasBuenas,
        piezasDefectuosas: data.piezasDefectuosas,
        kgMerma: data.kgMerma,
        kgPlasta: data.kgPlasta,
        ...(data.operadorId !== undefined && { operadorId: operadorId }),
        cicloReal: data.cicloReal,
        materialKG: data.materialKG,
        ...(defectoId !== undefined && { defectoProductoId: defectoId }),
        ...(data.descripcionOtro !== undefined && {
          descripcionOtro: data.descripcionOtro,
        }),
        ...(data.piezasCambioColor !== undefined && { piezasCambioColor: data.piezasCambioColor }),
        ...(data.kgSobrante !== undefined && { kgSobrante: data.kgSobrante }),
        ...(data.tipoMaterialSobrante !== undefined && {
          tipoMaterialSobrante: data.tipoMaterialSobrante,
        }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
      },
    });

    if (data.piezasBuenas > 0) {
      await registrarMovimientoProducto(
        {
          productoId: avance.orden.productoId,
          pigmentoId: avance.orden.pigmentoId,
          tipoMovimiento: "ENTRADA",
          motivo: "PRODUCCION",
          cantidad: data.piezasBuenas,
          usuarioId: actor.id,
          referenciaTipo: "AVANCE_TURNO",
          referenciaId: id,
        },
        tx as unknown as PrismaTransactionClient
      );
    }

    // ---------- Verificar si la orden se completa con este cierre ----------
    const agregado = await tx.avanceTurno.aggregate({ // aggregate indica a la base que haga calculos sobre un conjunto de filas, basicamente suma todos los numeros de cada columna "piezasBuenas" de cada avance que tenga el ordenId.
      where: { ordenId: avance.ordenId, estado: "CERRADO" },
      _sum: { piezasBuenas: true }, // definimos la operacion y la columna sobre la cual se ejecutara
    });

    // asi accedemos al resultado de la suma, porque aggregate devuelve un objeto
    const totalPiezasBuenasAcumuladas = agregado._sum.piezasBuenas ?? 0;
    let ordenCompletada = false;
    let pedidoCompletado = false;

    if (
      totalPiezasBuenasAcumuladas >= avance.orden.totalPiezas &&
      avance.orden.estado !== "COMPLETADA"
    ) {
      await tx.ordenProduccion.update({
        where: { id: avance.ordenId },
        data: { estado: "COMPLETADA" },
      });
      ordenCompletada = true;

    // ---------- Verificar si TODO el pedido se completa con esto ----------
      const pedidoId = avance.orden.pedidoDetalle.pedidoId;

      const detallesDelPedido = await tx.pedidoDetalle.findMany({
        where: { pedidoId },
        include: { ordenes: true },
      });

      // Hay al menos una orden por línea, y todas las que existen están COMPLETADA. (una línea sin ninguna orden todavía no cuenta como cubierta)
      const todoCubierto = detallesDelPedido.every((linea) => {
        if (linea.ordenes.length === 0) return false; // línea sin ninguna orden = no cubierta
        return linea.ordenes.every((o) => o.estado === "COMPLETADA" || o.id === avance.ordenId);
      });

      if (todoCubierto) {
        const pedido = await tx.pedido.findUniqueOrThrow({ where: { id: pedidoId } });
        if (pedido.estado !== "COMPLETADO" && pedido.estado !== "CANCELADO") {
          await tx.pedido.update({ where: { id: pedidoId }, data: { estado: "COMPLETADO" } });
          pedidoCompletado = true;
        }
      }
    }

    return { ordenCompletada, pedidoCompletado, totalPiezasBuenasAcumuladas };
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "cerrar_avance",
    entidad: "avance_turno",
    entidadId: id,
    ...(resultado.ordenCompletada && {
      detalle: `Orden completada automáticamente (${resultado.totalPiezasBuenasAcumuladas}/${avance.orden.totalPiezas} piezas)${
        resultado.pedidoCompletado ? " — pedido completado también" : ""
      }`,
    }),
    ...(ip !== undefined && { ip }),
  });

  const final = await prisma.avanceTurno.findUniqueOrThrow({
    where: { id },
    include: includeCompleto,
  });

  return serializar(final);
}

export async function crearSolicitudMaterial(
  avanceTurnoId: bigint,
  data: CrearSolicitudMaterialBody,
  actor: AuthUser,
  ip?: string
) {
  const avance = await prisma.avanceTurno.findUnique({
    where: { id: avanceTurnoId },
    include: { orden: true },
  });
  if (!avance) throw new Error("AVANCE_TURNO_NO_ENCONTRADO");
  if (avance.supervisorId !== actor.id) throw new Error("AVANCE_TURNO_NO_PROPIO");
  if (avance.estado !== "ABIERTO") throw new Error("AVANCE_TURNO_YA_CERRADO");

  if (data.tipoMaterial === "MOLIDO" && !avance.orden.inventarioMolidoId) {
    throw new Error("ORDEN_SIN_MOLIDO_ASIGNADO");
  }

  const nueva = await prisma.solicitudMaterial.create({
    data: {
      avanceTurnoId,
      tipoMaterial: data.tipoMaterial,
      kgSolicitados: data.kgSolicitados,
      motivo: data.motivo,
    },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "crear_solicitud_material",
    entidad: "solicitud_material",
    entidadId: nueva.id,
    ...(ip !== undefined && { ip }),
  });

  return serializarSolicitud(nueva);
}

export async function crearTiempoParo(
  avanceTurnoId: bigint,
  data: CrearTiempoParoBody,
  actor: AuthUser,
  ip?: string
) {
  const avance = await prisma.avanceTurno.findUnique({ where: { id: avanceTurnoId } });
  if (!avance) throw new Error("AVANCE_TURNO_NO_ENCONTRADO");
  if (avance.supervisorId !== actor.id) throw new Error("AVANCE_TURNO_NO_PROPIO");
  if (avance.estado !== "ABIERTO") throw new Error("AVANCE_TURNO_YA_CERRADO");

  const motivoParoId = BigInt(data.motivoParoId);
  const motivoParo = await prisma.motivoParo.findUnique({ where: { id: motivoParoId } });
  if (!motivoParo) throw new Error("MOTIVO_PARO_NO_ENCONTRADO");
  if (!motivoParo.activo) throw new Error("MOTIVO_PARO_INACTIVO");

  const nuevo = await prisma.tiempoParo.create({
    data: {
      avanceTurnoId,
      motivoParoId,
      minutos: data.minutos,
      ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
    },
    include: { motivoParo: true },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "crear_tiempo_paro",
    entidad: "tiempo_paro",
    entidadId: nuevo.id,
    ...(ip !== undefined && { ip }),
  });

  return serializarTiempoParo(nuevo);
}

// Caso especial material mal pigmentado
export async function crearIncidenciaMalPigmentado(
  avanceTurnoId: bigint,
  data: CrearIncidenciaMalPigmentadoBody,
  actor: AuthUser,
  ip?: string
) {
  const avance = await prisma.avanceTurno.findUnique({
    where: { id: avanceTurnoId },
    include: { orden: true },
  });
  if (!avance) throw new Error("AVANCE_TURNO_NO_ENCONTRADO");
  if (avance.supervisorId !== actor.id) throw new Error("AVANCE_TURNO_NO_PROPIO");
  if (avance.estado !== "ABIERTO") throw new Error("AVANCE_TURNO_YA_CERRADO");

  const nueva = await prisma.$transaction(async (tx) => {
    const incidencia = await tx.incidenciaMaterialMalPigmentado.create({
      data: {
        avanceTurnoId,
        piezasAfectadas: data.piezasAfectadas,
        destino: data.destino,
      },
    });

    if (data.destino === "STOCK") {
      // Entra directo al inventario, con el color/pigmento original de la orden
      await registrarMovimientoProducto(
        {
          productoId: avance.orden.productoId,
          pigmentoId: avance.orden.pigmentoId,
          tipoMovimiento: "ENTRADA",
          motivo: "PRODUCTO_DEFECTUOSO",
          cantidad: data.piezasAfectadas,
          usuarioId: actor.id,
          referenciaTipo: "INCIDENCIA_MAL_PIGMENTADO",
          referenciaId: incidencia.id,
        },
        tx as unknown as PrismaTransactionClient
      );
    }
    // Si destino = MOLINO, no se dispara nada aún — queda pendiente de confirmación

    return incidencia;
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "reportar_material_mal_pigmentado",
    entidad: "incidencia_mal_pigmentado",
    entidadId: nueva.id,
    ...(ip !== undefined && { ip }),
  });

  return serializarIncidencia(nueva);
}

// ========= Acciones del encargado de molino =========

export async function confirmarMolino(
  id: bigint,
  data: ConfirmarMolinoBody,
  actor: AuthUser,
  ip?: string
) {
  const avance = await prisma.avanceTurno.findUnique({ where: { id } });
  if (!avance) throw new Error("AVANCE_TURNO_NO_ENCONTRADO");
  if (avance.estado !== "CERRADO") throw new Error("AVANCE_TURNO_NO_CERRADO");
  if (avance.confirmacionMolinoConfirmado !== null) {
    throw new Error("AVANCE_TURNO_YA_CONFIRMADO_MOLINO");
  }

  // Retorna true si hay diferencia en alguno.  
  const hayDiferencia =
    data.kgMermaRecibida !== Number(avance.kgMerma) ||
    data.kgPlastaRecibida !== Number(avance.kgPlasta) ||
    data.piezasMalasRecibidas !== avance.piezasDefectuosas ||
    data.piezasCambioColorRecibidas !== avance.piezasCambioColor;

  // Agregamos al avance los datos confirmados por el encargado de Molino (sean iguales a los reportados o no)
  const actualizado = await prisma.avanceTurno.update({
    where: { id },
    data: {
      confirmacionMolinoConfirmado: true,
      kgMermaRecibida: data.kgMermaRecibida,
      kgPlastaRecibida: data.kgPlastaRecibida,
      piezasMalasRecibidas: data.piezasMalasRecibidas,
      piezasCambioColorRecibidas: data.piezasCambioColorRecibidas,
      confirmacionMolinoHayDiferencia: hayDiferencia,
      confirmacionMolinoPorId: actor.id,
      confirmacionMolinoEn: new Date(),
    },
    include: includeCompleto,
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "MOLINO",
    accion: "confirmar_material_recibido",
    entidad: "avance_turno",
    entidadId: id,
    ...(hayDiferencia && { detalle: "Diferencia detectada entre lo reportado y lo recibido" }),
    ...(ip !== undefined && { ip }),
  });

  return serializar(actualizado);
}

// ========== Acciones del encargado de pigmentos =========
export async function confirmarSobrante(
  id: bigint,
  data: ConfirmarSobranteBody,
  actor: AuthUser,
  ip?: string
) {
  const avance = await prisma.avanceTurno.findUnique({ where: { id }, include: { orden: true} });
  if (!avance) throw new Error("AVANCE_TURNO_NO_ENCONTRADO");
  if (avance.kgSobrante === null) throw new Error("AVANCE_TURNO_SIN_SOBRANTE");
  if (avance.sobranteConfirmado) throw new Error("SOBRANTE_YA_CONFIRMADO");

  // Una sola transaccion, actualizamos avanceTurno y registramos movimientos en inventario (molino o pigmentado)
  const confirmado = await prisma.$transaction( async (tx) => {
    const actualizado = await tx.avanceTurno.update({
        where: { id },
        data: {
        sobranteConfirmado: data.confirmado,
        sobranteConfirmadoPorId: actor.id,
        sobranteConfirmadoEn: new Date(),
        },
        include: includeCompleto,
    });

    // Validamos qué material se esta regresando para saber sobre que material haremos el movimiento
    if(avance.tipoMaterialSobrante === "VIRGEN") {
        // Ya no regresa como material virgen 100% ya esta mezclado con pigmento
        await registrarMovimientoMaterialPigmentado(
            {
                tipoMovimiento: "ENTRADA",
                motivo: "DEVOLUCION_MATERIAL",
                cantidad: Number(avance.kgSobrante),
                usuarioId: actor.id,
                referenciaTipo: "AVANCE_TURNO",
                referenciaId: actualizado.id,
                materiaPrimaId: avance.orden.materiaPrimaId,
                pigmentoId: avance.orden.pigmentoId,
            },
            tx as unknown as PrismaTransactionClient
        )

    } else {
        // MOLIDO: la orden ya tiene fija la fila de inventario de molido
        if (!avance.orden.inventarioMolidoId) {
            throw new Error("ORDEN_SIN_MOLIDO_ASIGNADO");
        }

        const inventarioMolido = await tx.inventarioMolido.findUniqueOrThrow({
            where: { id: avance.orden.inventarioMolidoId },
        });

        await registrarMovimientoMolido(
            {
            tipoMaterial: inventarioMolido.tipoMaterial,
            origen: inventarioMolido.origen,
            colorSolidoId: inventarioMolido.colorSolidoId,
            tipoMovimiento: "ENTRADA",
            motivo: "DEVOLUCION_MATERIAL",
            cantidad: Number(avance.kgSobrante),
            usuarioId: actor.id,
            referenciaTipo: "SOLICITUD_MATERIAL",
            referenciaId: id,
            },
            tx as unknown as PrismaTransactionClient
        );
    }


    return actualizado;
  })

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "PIGMENTOS",
    accion: "confirmar_sobrante",
    entidad: "avance_turno",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });

  return serializar(confirmado);
}

export async function confirmarSolicitudMaterial(id: bigint, actor: AuthUser, ip?: string) {
  const solicitud = await prisma.solicitudMaterial.findUnique({
    where: { id },
    include: { avanceTurno: { include: { orden: { include: { pigmento: true } } } } },
  });
  if (!solicitud) throw new Error("SOLICITUD_MATERIAL_NO_ENCONTRADA");
  if (solicitud.confirmado) throw new Error("SOLICITUD_MATERIAL_YA_CONFIRMADA");

  const orden = solicitud.avanceTurno.orden;
  const kgSolicitados = Number(solicitud.kgSolicitados);

  await prisma.$transaction(async (tx) => {
    await tx.solicitudMaterial.update({
      where: { id },
      data: { confirmado: true, confirmadoPorId: actor.id, confirmadoEn: new Date() },
    });

    if (solicitud.tipoMaterial === "VIRGEN") {
      // Salida de materia prima virgen
      await registrarMovimientoMateriaPrima(
        {
          materiaPrimaId: orden.materiaPrimaId,
          tipoMovimiento: "SALIDA",
          motivo: "CONSUMO_PRODUCCION",
          cantidad: kgSolicitados,
          usuarioId: actor.id,
          referenciaTipo: "SOLICITUD_MATERIAL",
          referenciaId: id,
        },
        tx as unknown as PrismaTransactionClient
      );

      // Salida de pigmento correspondiente, calculada con la misma dosis de la orden
      const kgPigmento = (kgSolicitados * Number(orden.pigmento.dosisGrPorKg)) / 1000;

      await registrarMovimientoPigmento(
        {
          pigmentoId: orden.pigmentoId,
          tipoMovimiento: "SALIDA",
          motivo: "CONSUMO_PRODUCCION",
          cantidad: kgPigmento,
          usuarioId: actor.id,
          referenciaTipo: "SOLICITUD_MATERIAL",
          referenciaId: id,
        },
        tx as unknown as PrismaTransactionClient
      );
    } else {
        // MOLIDO: la orden ya tiene fija la fila de inventario de molido
        if (!orden.inventarioMolidoId) {
            throw new Error("ORDEN_SIN_MOLIDO_ASIGNADO");
        }

        const inventarioMolido = await tx.inventarioMolido.findUniqueOrThrow({
            where: { id: orden.inventarioMolidoId },
        });

        await registrarMovimientoMolido(
            {
            tipoMaterial: inventarioMolido.tipoMaterial,
            origen: inventarioMolido.origen,
            colorSolidoId: inventarioMolido.colorSolidoId,
            tipoMovimiento: "SALIDA",
            motivo: "CONSUMO_PRODUCCION",
            cantidad: kgSolicitados,
            usuarioId: actor.id,
            referenciaTipo: "SOLICITUD_MATERIAL",
            referenciaId: id,
            },
            tx as unknown as PrismaTransactionClient
        );
    }
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "PIGMENTOS",
    accion: "confirmar_material_preparado",
    entidad: "solicitud_material",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });
}

export async function confirmarIncidenciaMolino(
  id: bigint,
  data: ConfirmarIncidenciaMolinoBody,
  actor: AuthUser,
  ip?: string
) {
  const incidencia = await prisma.incidenciaMaterialMalPigmentado.findUnique({ where: { id } });
  if (!incidencia) throw new Error("INCIDENCIA_NO_ENCONTRADA");
  if (incidencia.destino !== "MOLINO") throw new Error("INCIDENCIA_NO_ES_PARA_MOLINO");
  if (incidencia.confirmadoMolino !== null) throw new Error("INCIDENCIA_YA_CONFIRMADA_MOLINO");

  const actualizada = await prisma.incidenciaMaterialMalPigmentado.update({
    where: { id },
    data: {
      confirmadoMolino: data.confirmado,
      confirmadoMolinoPorId: actor.id,
      confirmadoMolinoEn: new Date(),
    },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "MOLINO",
    accion: "confirmar_incidencia_mal_pigmentado",
    entidad: "incidencia_mal_pigmentado",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });

  return serializarIncidencia(actualizada);
}

export async function resolverIncidencia(
  id: bigint,
  data: ResolverIncidenciaBody,
  actor: AuthUser,
  ip?: string
) {
  const incidencia = await prisma.incidenciaMaterialMalPigmentado.findUnique({
    where: { id },
    include: { avanceTurno: { include: { orden: true } } },
  });
  if (!incidencia) throw new Error("INCIDENCIA_NO_ENCONTRADA");
  if (incidencia.resuelto) throw new Error("INCIDENCIA_YA_RESUELTA");

  const orden = incidencia.avanceTurno.orden;

  await prisma.$transaction(async (tx) => {
    await tx.incidenciaMaterialMalPigmentado.update({
      where: { id },
      data: {
        resuelto: true,
        ...(data.tipoMaterialAgregado !== undefined && {
          tipoMaterialAgregado: data.tipoMaterialAgregado,
        }),
        ...(data.kgMaterialAgregado !== undefined && {
          kgMaterialAgregado: data.kgMaterialAgregado,
        }),
        ...(data.gramosPigmentoAgregado !== undefined && {
          gramosPigmentoAgregado: data.gramosPigmentoAgregado,
        }),
        resueltoPorId: actor.id,
        resueltoEn: new Date(),
      },
    });

    if (data.tipoMaterialAgregado === "VIRGEN" && data.kgMaterialAgregado !== undefined) {
      await registrarMovimientoMateriaPrima(
        {
          materiaPrimaId: orden.materiaPrimaId,
          tipoMovimiento: "SALIDA",
          motivo: "REPIGMENTAR",
          cantidad: data.kgMaterialAgregado,
          usuarioId: actor.id,
          referenciaTipo: "INCIDENCIA_MAL_PIGMENTADO",
          referenciaId: id,
        },
        tx as unknown as PrismaTransactionClient
      );
    }

    if (data.tipoMaterialAgregado === "MOLIDO" && data.kgMaterialAgregado !== undefined) {
      if (!orden.inventarioMolidoId) throw new Error("ORDEN_SIN_MOLIDO_ASIGNADO");
      const inventarioMolido = await tx.inventarioMolido.findUniqueOrThrow({
        where: { id: orden.inventarioMolidoId },
      });

      await registrarMovimientoMolido(
        {
          tipoMaterial: inventarioMolido.tipoMaterial,
          origen: inventarioMolido.origen,
          colorSolidoId: inventarioMolido.colorSolidoId,
          tipoMovimiento: "SALIDA",
          motivo: "REPIGMENTAR",
          cantidad: data.kgMaterialAgregado,
          usuarioId: actor.id,
          referenciaTipo: "INCIDENCIA_MAL_PIGMENTADO",
          referenciaId: id,
        },
        tx as unknown as PrismaTransactionClient
      );
    }

    if (data.gramosPigmentoAgregado !== undefined && data.gramosPigmentoAgregado > 0) {
      await registrarMovimientoPigmento(
        {
          pigmentoId: orden.pigmentoId,
          tipoMovimiento: "SALIDA",
          motivo: "REPIGMENTAR",
          cantidad: data.gramosPigmentoAgregado / 1000, // gramos a kg
          usuarioId: actor.id,
          referenciaTipo: "INCIDENCIA_MAL_PIGMENTADO",
          referenciaId: id,
        },
        tx as unknown as PrismaTransactionClient
      );
    }
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "PIGMENTOS",
    accion: "resolver_incidencia_mal_pigmentado",
    entidad: "incidencia_mal_pigmentado",
    entidadId: id,
    ...(ip !== undefined && { ip }),
  });

  const final = await prisma.incidenciaMaterialMalPigmentado.findUniqueOrThrow({ where: { id } });
  return serializarIncidencia(final);
}
