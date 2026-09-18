import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { reportesQuerySchema, reportesResponseSchema } from "./reportes.schema.js";
import { obtenerReportes } from "./reportes.service.js";

export default async function reportesRoutes(
  app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>
) {
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  app.get(
    "/reportes",
    {
      schema: {
        querystring: reportesQuerySchema,
        response: { 200: reportesResponseSchema },
      },
    },
    async (request, reply) => {
      return reply.send(await obtenerReportes(request.query));
    }
  );
}