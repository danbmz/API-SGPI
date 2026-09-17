import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { listarPendientesMoler, listarMoliendas, crearMolienda } from "./molienda.service.js";
import {
  crearMoliendaBodySchema,
  moliendaResponseSchema,
  listaMoliendaResponseSchema,
  pendientesResponseSchema,
  errorResponseSchema,
} from "./molienda.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function moliendaRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.addHook("preHandler", app.authorize(["MOLINO", "ADMIN"]));

  app.get(
    "/moliendas/pendientes",
    { schema: { response: { 200: pendientesResponseSchema } } },
    async (request, reply) => {
      return reply.send(await listarPendientesMoler());
    }
  );

  app.get(
    "/moliendas",
    { schema: { response: { 200: listaMoliendaResponseSchema } } },
    async (request, reply) => {
      return reply.send(await listarMoliendas());
    }
  );

  app.post(
    "/moliendas",
    {
      schema: {
        body: crearMoliendaBodySchema,
        response: {
          201: moliendaResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const molienda = await crearMolienda(request.body, request.authUser!, request.ip);
        return reply.code(201).send(molienda);
      } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
      }
    }
  );
}