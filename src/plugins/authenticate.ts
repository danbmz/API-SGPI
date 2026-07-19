import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AuthUser } from "../types/fastify.js";
import { prisma } from "../lib/prisma.js";

export default fp(async function authenticatePlugin(app: FastifyInstance) {
  
  app.decorate("authenticate", async function (request, reply) {
    try {
      // Verificamos el JWT
      const payload = await request.jwtVerify<{ sub: string; role: string }>();

      // Consultamos en la base el usuario que coincida y obtenemos solo las columnas necesarias
      const usuario = await prisma.usuario.findUnique({
        where: { id: BigInt(payload.sub) },
        select: {
          id: true,
          usuario: true,
          nombre: true,
          role: true,
          activo: true,
        },
      });

      // Si no existe o no esta activo denegamos el login
      if (!usuario || !usuario.activo) {
        return reply.code(401).send({ error: "No autenticado" });
      }

      // Si existe, entonces agregamos el objeto authUser al objeto request 
      request.authUser = {
        id: usuario.id,
        usuario: usuario.usuario,
        nombre: usuario.nombre,
        role: usuario.role as AuthUser["role"],
      };
    } catch (err) {
      return reply.code(401).send({ error: "No autenticado" });
    }
  });



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

