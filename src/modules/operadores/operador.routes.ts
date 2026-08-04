import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { 
    listarOperadores,
    crearOperador,
    editarOperador,
    desactivarOperador,
    reactivarOperador
} from "./operador.service.js";
import { 
    crearOperadorBodySchema,
    editarOperadorBodySchema,
    operadorParamsSchema,
    operadorResponseSchema,
    listaOperadorResponseSchema,
    okResponseSchema,
    errorResponseSchema,
    
} from "./operador.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function operdaorRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.register(async function adminRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN"]));

    app.get(
        "/operadores",
        {
        preHandler: [app.authenticate],
        schema: { response: { 200: listaOperadorResponseSchema } },
        },
        async (request, reply) => {
        return reply.send(await listarOperadores());
        }
    );

    app.post(
      "/operadores",
      {
        schema: {
          body: crearOperadorBodySchema,
          response: { 201: operadorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const defecto = await crearOperador(request.body, request.authUser!, request.ip);
          return reply.code(201).send(defecto);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/operadores/:id",
      {
        schema: {
          params: operadorParamsSchema,
          body: editarOperadorBodySchema,
          response: { 200: operadorResponseSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const defecto = await editarOperador(
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
      "/operadores/:id",
      {
        schema: {
          params: operadorParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await desactivarOperador(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/operadores/:id/reactivar",
      {
        schema: {
          params: operadorParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await reactivarOperador(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}