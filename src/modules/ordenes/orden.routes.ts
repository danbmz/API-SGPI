import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { listarOrdenes, crearOrden, confirmarMaterialSiguiente, activarOrden, pausarOrden, reanudarOrden, cancelarOrden, sustituirMaterialPigmentado, obtenerOrden } from "./orden.service.js";
import {
  crearOrdenBodySchema,
  ordenParamsSchema,
  ordenResponseSchema,
  listaOrdenResponseSchema,
  okResponseSchema,
  errorResponseSchema,
  cambiarEstadoOrdenBodySchema,
  cancelarOrdenBodySchema,
  sustituirMaterialPigmentadoBodySchema,
  listarOrdenesQuerySchema,
} from "./orden.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function ordenRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  app.get(
    "/ordenes",
    {
      preHandler: [app.authenticate],
      schema: { 
        querystring: listarOrdenesQuerySchema, 
        response: { 200: listaOrdenResponseSchema } 
      },
    },
    async (request, reply) => {
      return reply.send(await listarOrdenes(request.query));
    }
  );

  // ---------- Visualizar una orden (cualquiera)
  app.get(
    "/ordenes/:id",
    {
      schema: { params: ordenParamsSchema, response: {200: ordenResponseSchema, 404: errorResponseSchema}} 
    },
    async (request, reply) => {
      try {
        return reply.send(await obtenerOrden(BigInt(request.params.id)));
      } catch (err) {
        if(manejarErrorConocido(err, reply)) return;
        throw err;
      }
    }
  )

  // Exclusivo de ADMIN: crear órdenes
  app.register(async function adminRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN", "PROGRAMADOR"]));

    // ---------- Crear nueva orden
    app.post(
      "/ordenes",
      {
        schema: {
          body: crearOrdenBodySchema,
          response: {
            201: ordenResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const orden = await crearOrden(request.body, request.authUser!, request.ip);
          return reply.code(201).send(orden);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    // ---------- Activar orden
    app.patch(
    "/ordenes/:id/activar",
    {
        schema: {
        params: ordenParamsSchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
    },
    async (request, reply) => {
        try {
        await activarOrden(BigInt(request.params.id), request.authUser!, request.ip);
        return reply.send({ ok: true });
        } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
        }
    }
    );

    // ---------- Pausar orden
    app.patch(
    "/ordenes/:id/pausar",
    {
        schema: {
        params: ordenParamsSchema,
        body: cambiarEstadoOrdenBodySchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
    },
    async (request, reply) => {
        try {
        await pausarOrden(
            BigInt(request.params.id),
            request.authUser!,
            request.body.motivo,
            request.ip
        );
        return reply.send({ ok: true });
        } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
        }
    }
    );

    // ---------- Reanudar orden
    app.patch(
    "/ordenes/:id/reanudar",
    {
        schema: {
        params: ordenParamsSchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
    },
    async (request, reply) => {
        try {
        await reanudarOrden(BigInt(request.params.id), request.authUser!, request.ip);
        return reply.send({ ok: true });
        } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
        }
    }
    );

    // ---------- Cancelar orden
    app.patch(
    "/ordenes/:id/cancelar",
    {
        schema: {
        params: ordenParamsSchema,
        body: cancelarOrdenBodySchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
    },
    async (request, reply) => {
        try {
        await cancelarOrden(BigInt(request.params.id), request.body, request.authUser!, request.ip);
        return reply.send({ ok: true });
        } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
        }
    }
    );
  });

  // Exclusivo de PIGMENTOS: confirmar que el material está listo
  app.register(async function pigmentosRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["PIGMENTOS"]));

    app.patch(
      "/ordenes/:id/confirmar-material",
      {
        schema: {
          params: ordenParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await confirmarMaterialSiguiente(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    app.patch(
        "/ordenes/:id/sustituir-material-pigmentado",
      {
        schema: {
          params: ordenParamsSchema,
          body: sustituirMaterialPigmentadoBodySchema,
          response: {
            200: ordenResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const orden = await sustituirMaterialPigmentado(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(orden);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  });
}