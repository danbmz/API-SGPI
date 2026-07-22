import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarMotivosParo,
  crearMotivoParo,
  editarMotivoParo,
  desactivarMotivoParo,
  reactivarMotivoParo,
} from "./motivoParo.service.js";
import {
  crearMotivoParoBodySchema,
  editarMotivoParoBodySchema,
  motivoParoParamsSchema,
  motivoParoResponseSchema,
  listaMotivoParoResponseSchema,
  okResponseSchema,
  errorResponseSchema,
} from "./motivoParo.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function motivoParoRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.get(
    "/motivos-paro",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: listaMotivoParoResponseSchema } },
    },
    async (request, reply) => {
      const motivos = await listarMotivosParo();
      return reply.send(motivos);
    }
  );

  app.register(async function adminRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN"]));

    app.post(
      "/motivos-paro",
      {
        schema: {
          body: crearMotivoParoBodySchema,
          response: { 201: motivoParoResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const motivo = await crearMotivoParo(request.body, request.authUser!, request.ip);
          return reply.code(201).send(motivo);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/motivos-paro/:id",
      {
        schema: {
          params: motivoParoParamsSchema,
          body: editarMotivoParoBodySchema,
          response: { 200: motivoParoResponseSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const motivo = await editarMotivoParo(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(motivo);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.delete(
      "/motivos-paro/:id",
      {
        schema: {
          params: motivoParoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await desactivarMotivoParo(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/motivos-paro/:id/reactivar",
      {
        schema: {
          params: motivoParoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await reactivarMotivoParo(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}