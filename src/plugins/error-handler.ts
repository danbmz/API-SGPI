import fp from "fastify-plugin";
import type { FastifyInstance, FastifyError } from "fastify";

export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler(function (error: FastifyError, request, reply) {
    // Errores de validación de schema (TypeBox/Ajv) — Fastify ya los marca con este código
    if (error.validation) {
      return reply.code(400).send({
        error: "Datos inválidos",
        detalles: error.validation.map((v) => v.message),
      });
    }

    // Errores de rate limit
    if (error.statusCode === 429) {
      return reply.code(429).send({ error: "Demasiadas solicitudes, intenta más tarde" });
    }

    // Cualquier otro error no manejado explícitamente en las rutas
    request.log.error(error); // se loguea completo para mi, nunca se expone al cliente
    return reply.code(500).send({ error: "Error interno del servidor" });
  });
});