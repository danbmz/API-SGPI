import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AuthUser } from "../types/fastify.js";

export default fp(async function authenticatePlugin(app: FastifyInstance) {
  app.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        const payload = await request.jwtVerify<{ sub: string; role: string }>();

        request.authUser = {
          id: BigInt(payload.sub),
          role: payload.role as AuthUser["role"],
        };
      } catch (err) {
        return reply.code(401).send({ error: "No autenticado" });
      }
    }
  );

  app.decorate("authorize", function (rolesPermitidos: AuthUser["role"][]) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      await app.authenticate(request, reply);

      if (reply.sent) return; // authenticate ya respondió con 401, no seguimos

      if (!request.authUser || !rolesPermitidos.includes(request.authUser.role)) {
        return reply.code(403).send({ error: "No tienes permiso para esta acción" });
      }
    };
  });
});

