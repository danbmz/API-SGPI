import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarPigmentos,
  crearPigmento,
  editarPigmento,
  desactivarPigmento,
  reactivarPigmento,
} from "./pigmento.service.js";
import {
  crearPigmentoBodySchema,
  editarPigmentoBodySchema,
  pigmentoParamsSchema,
  pigmentoResponseSchema,
  listaPigmentoResponseSchema,
  okResponseSchema,
  errorResponseSchema,
} from "./pigmento.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function pigmentoRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.get(
    "/pigmentos",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: listaPigmentoResponseSchema } },
    },
    async (request, reply) => {
      const pigmentos = await listarPigmentos();
      return reply.send(pigmentos);
    }
  );

  app.register(async function adminRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN"]));

    app.post(
      "/pigmentos",
      {
        schema: {
          body: crearPigmentoBodySchema,
          response: {
            201: pigmentoResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const pigmento = await crearPigmento(request.body, request.authUser!, request.ip);
          return reply.code(201).send(pigmento);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/pigmentos/:id",
      {
        schema: {
          params: pigmentoParamsSchema,
          body: editarPigmentoBodySchema,
          response: { 200: pigmentoResponseSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const pigmento = await editarPigmento(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(pigmento);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.delete(
      "/pigmentos/:id",
      {
        schema: {
          params: pigmentoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await desactivarPigmento(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/pigmentos/:id/reactivar",
      {
        schema: {
          params: pigmentoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await reactivarPigmento(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}