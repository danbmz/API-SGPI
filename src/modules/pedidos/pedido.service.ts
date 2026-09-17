import { prisma } from "../../lib/prisma.js";
import { registrarAccion } from "../../shared/auditoria/auditoria.service.js";
import { compararCambios } from "../../utils/comparar-cambios.js";
import type { AuthUser } from "../../types/fastify.js";
import type {
  CrearPedidoBody,
  EditarPedidoBody,
  CancelarPedidoBody,
  CrearPedidoDetalleBody,
  ListarPedidosQuery,
} from "./pedido.schema.js";
import { cancelarOrden } from "../ordenes/orden.service.js";

const includeCompleto = {
  detalle: { include: { producto: true, pigmento: true, ordenes: true } },
};

async function serializar(pedido: any) {
  // Promise.all() ejecuta todas las promesas en paralelo, todas las consultas aggregate de cada línea (map itera cada objeto de detalle, lo que siginifa que cada una es una promesa) se disparan al mismo tiempo
  const detalleConProgreso = await Promise.all(
    pedido.detalle.map(async (linea: any) => {
      // agregado es la suma de todas las piezasBuenas de todos los avances 
      // const agregado = await prisma.avanceTurno.aggregate({
      //   where: {
      //     orden: { pedidoDetalleId: linea.id },
      //     estado: "CERRADO",
      //   },
      //   _sum: { piezasBuenas: true },
      // });

      // const movimientosEntrega = await prisma.historialMovimientoInventario.aggregate({
      //   where: {
      //     tipoInventario: "PRODUCTO",
      //     productoId: linea.productoId,
      //     ...(linea.pigmentoId !== null && { pigmentoProductoId: linea.pigmentoId }),
      //     motivo: "ENTREGA_PEDIDO",
      //     referenciaTipo: "PEDIDO",
      //     referenciaId: pedido.id,
      //   },
      //   _sum: { cantidadMovimiento: true },
      // });

      // cantidadMovimiento es negativo en salidas, así que invertimos el signo
      // const cantidadEntregada = Math.abs(Number(movimientosEntrega._sum.cantidadMovimiento ?? 0));
      // const cantidadProducida = agregado._sum.piezasBuenas ?? 0;

      return {
        id: linea.id.toString(),
        productoId: linea.productoId.toString(),
        productoNombre: linea.producto.nombre,
        tipoMaterial: linea.producto.tipoMaterial,
        pigmentoId: linea.pigmentoId ? linea.pigmentoId.toString() : null,
        pigmentoColor: linea.pigmento ? linea.pigmento.color : null,
        categoriaColor: linea.pigmento ? linea.pigmento.categoriaColor : null,
        cantidadSolicitada: linea.cantidadSolicitada,
        cantidadProducida: linea.cantidadProducida,
        cantidadEntregada: linea.cantidadEntregada,
      };
    })
  );


  // Para totalOrdenes/ordenesCompletadas, ahora hay que juntar las órdenes de todas las líneas:
  const todasLasOrdenes = pedido.detalle.flatMap((linea: any) => linea.ordenes);
  const totalOrdenes = todasLasOrdenes.length;
  const ordenesCompletadas = todasLasOrdenes.filter((o: any) => o.estado === "COMPLETADA").length;

  return {
    id: pedido.id.toString(),
    numeroPedido: pedido.numeroPedido,
    cliente: pedido.cliente,
    descripcion: pedido.descripcion,
    remision: pedido.remision,
    estado: pedido.estado,
    activo: pedido.activo,
    // detalle es cada pedidoDetalle o linea unido al pedido general.
    detalle: detalleConProgreso,
    totalOrdenes,
    ordenesCompletadas,
    createdAt: pedido.createdAt.toISOString(),
    fechaEntrega: pedido.fechaEntrega ? pedido.fechaEntrega.toISOString().split("T")[0] : null,
  };
}

export async function listarPedidos(query: ListarPedidosQuery) {
  const pagina = query.pagina ?? 1;
  const limite = query.limite ?? 20;

  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({
      where: { ...(query.estado !== undefined && { estado: query.estado }) },
      include: includeCompleto,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.pedido.count({
      where: { ...(query.estado !== undefined && { estado: query.estado }) },
    }),
  ]);

  return {
    data: await Promise.all(pedidos.map(serializar)),
    paginacion: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  };
}

export async function obtenerPedido(id: bigint) {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: includeCompleto });
  if (!pedido) throw new Error("PEDIDO_NO_ENCONTRADO");
  return serializar(pedido);
}

export async function crearPedido(data: CrearPedidoBody, actor: AuthUser, ip?: string) {
  const existente = await prisma.pedido.findUnique({ where: { numeroPedido: data.numeroPedido } });
  if (existente) throw new Error("PEDIDO_NUMERO_YA_EXISTE");

  const nuevo = await prisma.pedido.create({
    data: {
      numeroPedido: data.numeroPedido,
      cliente: data.cliente,
      ...(data.remision !== undefined && { remision: data.remision}),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.fechaEntrega !== undefined && { fechaEntrega: new Date(data.fechaEntrega) }),
      estado: "PENDIENTE",
    },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "crear_pedido",
    entidad: "pedido",
    entidadId: nuevo.id,
    ...(ip !== undefined && { ip }),
  });

  return obtenerPedido(nuevo.id);
}

export async function editarPedido(
  id: bigint,
  data: EditarPedidoBody,
  actor: AuthUser,
  ip?: string
) {
  const pedido = await prisma.pedido.findUnique({ where: { id } });
  if (!pedido) throw new Error("PEDIDO_NO_ENCONTRADO");
  if (pedido.estado === "CANCELADO" || pedido.estado === "COMPLETADO") throw new Error("PEDIDO_CANCELADO");

  const detalle = compararCambios(pedido, data, { cliente: "cliente", descripcion: "descripción" });

  await prisma.pedido.update({
    where: { id },
    data: {
      ...(data.cliente !== undefined && { cliente: data.cliente }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.fechaEntrega !== undefined && { fechaEntrega: new Date(data.fechaEntrega) }),
    },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "editar_pedido",
    entidad: "pedido",
    entidadId: id,
    ...(detalle !== "" && { detalle }),
    ...(ip !== undefined && { ip }),
  });

  return obtenerPedido(id);
}

export async function cancelarPedido(
  id: bigint,
  data: CancelarPedidoBody,
  actor: AuthUser,
  ip?: string
) {
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { detalle: { include: { ordenes: true } } },
  });
  if (!pedido) throw new Error("PEDIDO_NO_ENCONTRADO");
  if (pedido.estado === "CANCELADO" || pedido.estado === "COMPLETADO") {
    throw new Error("PEDIDO_NO_SE_PUEDE_CANCELAR");
  }

  // Aplanamos el arreglo con flatMap para poder iterar todas las ordenes de cada detalle, juntas (como en la funcion serializar).
  const todasLasOrdenes = pedido.detalle.flatMap((linea) => linea.ordenes);
  const hayOrdenEnProgreso = todasLasOrdenes.some((o) => o.estado === "EN_PROGRESO" || o.estado === "PAUSADA");
  if (hayOrdenEnProgreso) {
    throw new Error("PEDIDO_TIENE_ORDENES_EN_PROGRESO");
  }

  // Cancelar cada orden que todavía esté "viva" (BORRADOR o ACTIVA)
  const ordenesACancelar = todasLasOrdenes.filter(
    (o) => o.estado === "BORRADOR" || o.estado === "ACTIVA"
  );

  for (const orden of ordenesACancelar) {
    await cancelarOrden(
      orden.id,
      { motivo: `Cancelación automática: pedido ${pedido.numeroPedido} cancelado` },
      actor,
      ip
    );
  }

  await prisma.pedido.update({ where: { id }, data: { estado: "CANCELADO" } });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "cancelar_pedido",
    entidad: "pedido",
    entidadId: id,
    detalle: data.motivo,
    ...(ip !== undefined && { ip }),
  });
}

export async function agregarDetallePedido(
  pedidoId: bigint,
  data: CrearPedidoDetalleBody,
  actor: AuthUser,
  ip?: string
) {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) throw new Error("PEDIDO_NO_ENCONTRADO");
  if (pedido.estado === "CANCELADO" || pedido.estado === "COMPLETADO") {
    throw new Error("PEDIDO_NO_SE_PUEDE_MODIFICAR");
  }

  // Verificamos que existan el producto y pigmento (en caso de ser seleccionado) y que su estado sea ACTIVO
  const productoId = BigInt(data.productoId);
  const producto = await prisma.producto.findUnique({ where: { id: productoId } });
  if (!producto) throw new Error("PRODUCTO_NO_ENCONTRADO");
  if(!producto.activo) throw new Error("PRODUCTO_INACTIVO")

  let pigmentoId: bigint | undefined;
  if (data.pigmentoId !== undefined) {
    pigmentoId = BigInt(data.pigmentoId);
    const pigmento = await prisma.pigmento.findUnique({ where: { id: pigmentoId } });
    if (!pigmento) throw new Error("PIGMENTO_NO_ENCONTRADO");
    if(!pigmento.activo) throw new Error("PIGMENTO_INACTIVO")
  }

  await prisma.pedidoDetalle.create({
    data: {
      pedidoId,
      productoId,
      ...(pigmentoId !== undefined && { pigmentoId }),
      cantidadSolicitada: data.cantidadSolicitada,
    },
  });

  await registrarAccion({
    usuarioId: actor.id,
    usuarioLogin: actor.usuario,
    usuarioNombre: actor.nombre,
    modulo: "ORDENES",
    accion: "agregar_detalle_pedido",
    entidad: "pedido",
    entidadId: pedidoId,
    ...(ip !== undefined && { ip }),
  });

  return obtenerPedido(pedidoId);
}