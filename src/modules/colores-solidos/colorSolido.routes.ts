import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarColoresSolidos,
  crearColorSolido,
  editarColorSolido,
  desactivarColorSolido,
  reactivarColorSolido,
} from "./colorSolido.service.js";
import {
  crearColorSolidoBodySchema,
  editarColorSolidoBodySchema,
  colorSolidoParamsSchema,
  colorSolidoResponseSchema,
  listaColorSolidoResponseSchema,
  okResponseSchema,
  errorResponseSchema,
} from "./colorSolido.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function colorSolidoRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.get(
    "/colores-solidos",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: listaColorSolidoResponseSchema } },
    },
    async (request, reply) => {
      const colores = await listarColoresSolidos();
      return reply.send(colores);
    }
  );

  app.register(async function adminRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN"]));

    app.post(
      "/colores-solidos",
      {
        schema: {
          body: crearColorSolidoBodySchema,
          response: { 201: colorSolidoResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const color = await crearColorSolido(request.body, request.authUser!, request.ip);
          return reply.code(201).send(color);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/colores-solidos/:id",
      {
        schema: {
          params: colorSolidoParamsSchema,
          body: editarColorSolidoBodySchema,
          response: { 200: colorSolidoResponseSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const color = await editarColorSolido(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(color);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.delete(
      "/colores-solidos/:id",
      {
        schema: {
          params: colorSolidoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await desactivarColorSolido(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/colores-solidos/:id/reactivar",
      {
        schema: {
          params: colorSolidoParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await reactivarColorSolido(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}