import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarPedidos,
  obtenerPedido,
  crearPedido,
  editarPedido,
  cancelarPedido,
  agregarDetallePedido,
} from "./pedido.service.js";
import {
  crearPedidoBodySchema,
  editarPedidoBodySchema,
  cancelarPedidoBodySchema,
  crearPedidoDetalleBodySchema,
  pedidoParamsSchema,
  pedidoResponseSchema,
  listaPedidoResponseSchema,
  okResponseSchema,
  errorResponseSchema,
} from "./pedido.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function pedidoRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  // Listar pedidos  
  app.get(
    "/pedidos",
    { schema: { response: { 200: listaPedidoResponseSchema } } },
    async (request, reply) => {
      return reply.send(await listarPedidos());
    }
  );

  // Visualizar un pedido en especifico   
  app.get(
    "/pedidos/:id",
    {
      schema: { params: pedidoParamsSchema, response: { 200: pedidoResponseSchema, 404: errorResponseSchema } },
    },
    async (request, reply) => {
      try {
        return reply.send(await obtenerPedido(BigInt(request.params.id)));
      } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
      }
    }
  );
 
  // Crear un nuevo pedido  
  app.post(
    "/pedidos",
    {
      schema: {
        body: crearPedidoBodySchema,
        response: { 201: pedidoResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const pedido = await crearPedido(request.body, request.authUser!, request.ip);
        return reply.code(201).send(pedido);
      } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
      }
    }
  );

  // Actualizar un pedido
  app.patch(
    "/pedidos/:id",
    {
      schema: {
        params: pedidoParamsSchema,
        body: editarPedidoBodySchema,
        response: { 200: pedidoResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const pedido = await editarPedido(
          BigInt(request.params.id),
          request.body,
          request.authUser!,
          request.ip
        );
        return reply.send(pedido);
      } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
      }
    }
  );

  // Cancelar un pedido
  app.patch(
    "/pedidos/:id/cancelar",
    {
      schema: {
        params: pedidoParamsSchema,
        body: cancelarPedidoBodySchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        await cancelarPedido(BigInt(request.params.id), request.body, request.authUser!, request.ip);
        return reply.send({ ok: true });
      } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
      }
    }
  );

  // Crear detalle de pedido (indica el producto, color y cantidad)
  app.post(
    "/pedidos/:id/detalle",
    {
      schema: {
        params: pedidoParamsSchema,
        body: crearPedidoDetalleBodySchema,
        response: {
          201: pedidoResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const pedido = await agregarDetallePedido(
          BigInt(request.params.id),
          request.body,
          request.authUser!,
          request.ip
        );
        return reply.code(201).send(pedido);
      } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
      }
    }
  );
}