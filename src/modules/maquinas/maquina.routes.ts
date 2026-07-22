import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarMaquinas,
  crearMaquina,
  editarMaquina,
  cambiarEstadoMaquina,
} from "./maquina.service.js";
import {
  crearMaquinaBodySchema,
  editarMaquinaBodySchema,
  cambiarEstadoMaquinaBodySchema,
  maquinaParamsSchema,
  maquinaResponseSchema,
  listaMaquinaResponseSchema,
  errorResponseSchema,
} from "./maquina.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function maquinaRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.get(
    "/maquinas",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: listaMaquinaResponseSchema } },
    },
    async (request, reply) => {
      const maquinas = await listarMaquinas();
      return reply.send(maquinas);
    }
  );

  app.register(async function adminRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN"]));

    app.post(
      "/maquinas",
      {
        schema: {
          body: crearMaquinaBodySchema,
          response: {
            201: maquinaResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const maquina = await crearMaquina(request.body, request.authUser!, request.ip);
          return reply.code(201).send(maquina);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/maquinas/:id",
      {
        schema: {
          params: maquinaParamsSchema,
          body: editarMaquinaBodySchema,
          response: { 200: maquinaResponseSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const maquina = await editarMaquina(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(maquina);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/maquinas/:id/estado",
      {
        schema: {
          params: maquinaParamsSchema,
          body: cambiarEstadoMaquinaBodySchema,
          response: { 200: maquinaResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const maquina = await cambiarEstadoMaquina(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(maquina);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}