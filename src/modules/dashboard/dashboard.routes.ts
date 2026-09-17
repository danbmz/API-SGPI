import type { FastifyInstance } from "fastify";
import { dashboardResponseSchema } from "./dashboard.schema.js";
import { obtenerDashboard } from "./dashboard.service.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

export default async function dashboardRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  app.get(
    "/dashboard",
    { schema: { response: { 200: dashboardResponseSchema } } },
    async (request, reply) => {
      return reply.send(await obtenerDashboard());
    }
  );
}