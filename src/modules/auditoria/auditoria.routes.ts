import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { listarAuditoriaQuerySchema, listaAuditLogResponseSchema } from "./auditoria.schema.js";
import { listarAuditoria } from "./auditoria.service.js";

export default async function auditoriaRoutes(
  app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>
) {
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  app.get(
    "/audit-logs",
    {
      schema: {
        querystring: listarAuditoriaQuerySchema,
        response: { 200: listaAuditLogResponseSchema },
      },
    },
    async (request, reply) => {
      return reply.send(await listarAuditoria(request.query));
    }
  );
}