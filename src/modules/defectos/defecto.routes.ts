import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarDefectosProducto,
  crearDefectoProducto,
  editarDefectoProducto,
  desactivarDefectoProducto,
  reactivarDefectoProducto,
} from "./defecto.service.js";
import {
  crearDefectoProductoBodySchema,
  editarDefectoProductoBodySchema,
  defectoProductoParamsSchema,
  defectoProductoResponseSchema,
  listaDefectoProductoResponseSchema,
  okResponseSchema,
  errorResponseSchema,
} from "./defecto.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function defectoProductoRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.get(
    "/defectos-producto",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: listaDefectoProductoResponseSchema } },
    },
    async (request, reply) => {
      return reply.send(await listarDefectosProducto());
    }
  );

  app.register(async function adminRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN"]));

    app.post(
      "/defectos-producto",
      {
        schema: {
          body: crearDefectoProductoBodySchema,
          response: { 201: defectoProductoResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const defecto = await crearDefectoProducto(request.body, request.authUser!, request.ip);
          return reply.code(201).send(defecto);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/defectos-producto/:id",
      {
        schema: {
          params: defectoProductoParamsSchema,
          body: editarDefectoProductoBodySchema,
          response: { 200: defectoProductoResponseSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const defecto = await editarDefectoProducto(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(defecto);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.delete(
      "/defectos-producto/:id",
      {
        schema: {
          params: defectoProductoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await desactivarDefectoProducto(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/defectos-producto/:id/reactivar",
      {
        schema: {
          params: defectoProductoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await reactivarDefectoProducto(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}