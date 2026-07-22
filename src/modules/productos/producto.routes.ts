import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarProductos,
  crearProducto,
  editarProducto,
  desactivarProducto,
  reactivarProducto,
} from "./producto.service.js";
import {
  crearProductoBodySchema,
  editarProductoBodySchema,
  productoParamsSchema,
  productoResponseSchema,
  listaProductoResponseSchema,
  okResponseSchema,
  errorResponseSchema,
} from "./producto.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function productoRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.get(
    "/productos",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: listaProductoResponseSchema } },
    },
    async (request, reply) => {
      const productos = await listarProductos();
      return reply.send(productos);
    }
  );

  app.register(async function adminRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN"]));

    app.post(
      "/productos",
      {
        schema: {
          body: crearProductoBodySchema,
          response: {
            201: productoResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const producto = await crearProducto(request.body, request.authUser!, request.ip);
          return reply.code(201).send(producto);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/productos/:id",
      {
        schema: {
          params: productoParamsSchema,
          body: editarProductoBodySchema,
          response: { 200: productoResponseSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const producto = await editarProducto(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(producto);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.delete(
      "/productos/:id",
      {
        schema: {
          params: productoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await desactivarProducto(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/productos/:id/reactivar",
      {
        schema: {
          params: productoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await reactivarProducto(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}