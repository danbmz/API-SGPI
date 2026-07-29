import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarAvancesTurno,
  crearAvanceTurno,
  actualizarAvanceTurno,
  cerrarAvanceTurno,
  confirmarMolino,
  confirmarSobrante,
} from "./avanceTurno.service.js";
import {
  crearAvanceTurnoBodySchema,
  actualizarAvanceTurnoBodySchema,
  cerrarAvanceTurnoBodySchema,
  confirmarMolinoBodySchema,
  confirmarSobranteBodySchema,
  avanceTurnoParamsSchema,
  avanceTurnoResponseSchema,
  listaAvanceTurnoResponseSchema,
  errorResponseSchema,
} from "./avanceTurno.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function avanceTurnoRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.get(
    "/avances-turno",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: listaAvanceTurnoResponseSchema } },
    },
    async (request, reply) => {
      return reply.send(await listarAvancesTurno(request.authUser!));
    }
  );

  // Exclusivo del SUPERVISOR: crear, actualizar (borrador), cerrar
  app.register(async function supervisorRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["SUPERVISOR"]));

    app.post(
      "/avances-turno",
      {
        schema: {
          body: crearAvanceTurnoBodySchema,
          response: { 201: avanceTurnoResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const avance = await crearAvanceTurno(request.body, request.authUser!, request.ip);
          return reply.code(201).send(avance);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/avances-turno/:id",
      {
        schema: {
          params: avanceTurnoParamsSchema,
          body: actualizarAvanceTurnoBodySchema,
          response: { 200: avanceTurnoResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const avance = await actualizarAvanceTurno(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(avance);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
      "/avances-turno/:id/cerrar",
      {
        schema: {
          params: avanceTurnoParamsSchema,
          body: cerrarAvanceTurnoBodySchema,
          response: { 200: avanceTurnoResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const avance = await cerrarAvanceTurno(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(avance);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });

  // Exclusivo de MOLINO
  app.register(async function molinoRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["MOLINO"]));

    app.patch(
      "/avances-turno/:id/confirmar-molino",
      {
        schema: {
          params: avanceTurnoParamsSchema,
          body: confirmarMolinoBodySchema,
          response: { 200: avanceTurnoResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const avance = await confirmarMolino(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(avance);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });

  // Exclusivo de PIGMENTOS
  app.register(async function pigmentosRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["PIGMENTOS"]));

    app.patch(
      "/avances-turno/:id/confirmar-sobrante",
      {
        schema: {
          params: avanceTurnoParamsSchema,
          body: confirmarSobranteBodySchema,
          response: { 200: avanceTurnoResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const avance = await confirmarSobrante(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(avance);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}