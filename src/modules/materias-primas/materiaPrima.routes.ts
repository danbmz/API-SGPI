import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarMateriasPrimas,
  crearMateriaPrima,
  editarMateriaPrima,
  desactivarMateriaPrima,
  reactivarMateriaPrima,
} from "./materiaPrima.service.js";
import {
  crearMateriaPrimaBodySchema,
  editarMateriaPrimaBodySchema,
  materiaPrimaParamsSchema,
  materiaPrimaResponseSchema,
  listaMateriaPrimaResponseSchema,
  okResponseSchema,
  errorResponseSchema,
} from "./materiaPrima.Schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function materiaPrimaRoutes(
  app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>
) {
  // Listar: cualquier usuario autenticado
  app.get(
    "/materias-primas",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: listaMateriaPrimaResponseSchema } },
    },
    async (request, reply) => {
      const materias = await listarMateriasPrimas();
      return reply.send(materias);
    }
  );

  // Resto de operaciones: solo ADMIN
  app.register(async function adminRoutes(
    app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>
) {
    app.addHook("preHandler", app.authorize(["ADMIN"]));

    app.post(
      "/materias-primas",
      {
        schema: {
          body: crearMateriaPrimaBodySchema,
          response: {
            201: materiaPrimaResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const materiaPrima = await crearMateriaPrima(
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.code(201).send(materiaPrima);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/materias-primas/:id",
      {
        schema: {
          params: materiaPrimaParamsSchema,
          body: editarMateriaPrimaBodySchema,
          response: {
            200: materiaPrimaResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const materiaPrima = await editarMateriaPrima(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(materiaPrima);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.delete(
      "/materias-primas/:id",
      {
        schema: {
          params: materiaPrimaParamsSchema,
          response: {
            200: okResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          await desactivarMateriaPrima(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/materias-primas/:id/reactivar",
      {
        schema: {
          params: materiaPrimaParamsSchema,
          response: {
            200: okResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          await reactivarMateriaPrima(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}