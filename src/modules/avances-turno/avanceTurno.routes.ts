import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarAvancesTurno,
  crearAvanceTurno,
  actualizarAvanceTurno,
  cerrarAvanceTurno,
  confirmarMolino,
  confirmarSobrante,
  crearSolicitudMaterial,
  confirmarSolicitudMaterial,
  listarSolicitudesMaterial,
  crearIncidenciaMalPigmentado,
  confirmarIncidenciaMolino,
  resolverIncidencia,
  listarTiemposParo,
  crearTiempoParo,
  obtenerAvance,
  listarIncidenciasMalPigmentado,
  listarTodasSolicitudesMaterial,
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
  crearSolicitudMaterialBodySchema,
  solicitudMaterialResponseSchema,
  solicitudMaterialParamsSchema,
  okResponseSchema,
  listaSolicitudMaterialResponseSchema,
  crearIncidenciaMalPigmentadoBodySchema,
  incidenciaResponseSchema,
  incidenciaParamsSchema,
  confirmarIncidenciaMolinoBodySchema,
  resolverIncidenciaBodySchema,
  listaTiempoParoResponseSchema,
  crearTiempoParoBodySchema,
  tiempoParoResponseSchema,
  listaIncidenciaResponseSchema,
  listarIncidenciasQuerySchema,
  listarAvancesTurnoQuerySchema,
  listarSolicitudesMaterialQuerySchema,
} from "./avanceTurno.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function avanceTurnoRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  
  // Listamos todos los avances de turno
  app.get(
    "/avances-turno",
    {
      preHandler: [app.authenticate],
      schema: { 
        querystring: listarAvancesTurnoQuerySchema,
        response: { 200: listaAvanceTurnoResponseSchema } 
      },
    },
    async (request, reply) => {
      return reply.send(await listarAvancesTurno(request.authUser!, request.query));
    }
  );

  // Listamos solo 1 avance de turno (todos pueden ver los avances, pero solo deberian ADMIN y SUPER)
  app.get(
    "/avances-turno/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: avanceTurnoParamsSchema,
        response: { 200: avanceTurnoResponseSchema, 404: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const avance = await obtenerAvance(BigInt(request.params.id));
        return reply.send(avance);
      } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
      }
    }
  );

  // Listamos incidencias (accesible para todos pero deberian poder verlo solo MOLINO, PIGMENTOS y SUPERVISOR los suyos)
  app.get(
    "/incidencias-mal-pigmentado",
    {
      preHandler: [app.authenticate],
      schema: {
        querystring: listarIncidenciasQuerySchema,
        response: { 200: listaIncidenciaResponseSchema },
      },
    },
    async (request, reply) => {
      return reply.send(await listarIncidenciasMalPigmentado(request.query));
    }
  );

  // Lista las solicitudes de material que ha hecho
  app.get(
  "/avances-turno/:id/solicitudes-material",
      {
          schema: {
          params: avanceTurnoParamsSchema,
          response: { 200: listaSolicitudMaterialResponseSchema, 404: errorResponseSchema },
          },
      },
      async (request, reply) => {
          return reply.send(await listarSolicitudesMaterial(BigInt(request.params.id)));
      }
  );

    // Lista los tiempos paro del avance
  app.get(
    "/avances-turno/:id/tiempos-paro",
    {
      schema: {
        params: avanceTurnoParamsSchema,
        response: { 200: listaTiempoParoResponseSchema },
      },
    },
    async (request, reply) => {
      return reply.send(await listarTiemposParo(BigInt(request.params.id)));
    }
  );

  // Exclusivo del SUPERVISOR: crear, actualizar (borrador), cerrar
  app.register(async function supervisorRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["SUPERVISOR"]));

    // Crear avance
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

    // Guardar borrador
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

    // Cerrar avance
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

    // Generar una solicitud de material
    app.post(
      "/avances-turno/:id/solicitudes-material",
      {
          schema: {
          params: avanceTurnoParamsSchema,
          body: crearSolicitudMaterialBodySchema,
          response: {
              201: solicitudMaterialResponseSchema,
              404: errorResponseSchema,
              409: errorResponseSchema,
          },
          },
      },
      async (request, reply) => {
          try {
            const solicitud = await crearSolicitudMaterial(
              BigInt(request.params.id),
              request.body,
              request.authUser!,
              request.ip
          );
            return reply.code(201).send(solicitud);
          } catch (err) {
            if (manejarErrorConocido(err, reply)) return;
            throw err;
          }
      }
    );

    // Crear Incidencia de material mal pigmentado
    app.post(
      "/avances-turno/:id/incidencia-mal-pigmentado",
      {
        schema: {
          params: avanceTurnoParamsSchema,
          body: crearIncidenciaMalPigmentadoBodySchema,
          response: { 201: incidenciaResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const incidencia = await crearIncidenciaMalPigmentado(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.code(201).send(incidencia);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    // registrar nuevo tiempo paro 
    app.post(
      "/avances-turno/:id/tiempos-paro",
      {
        schema: {
          params: avanceTurnoParamsSchema,
          body: crearTiempoParoBodySchema,
          response: {
            201: tiempoParoResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const tiempo = await crearTiempoParo(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.code(201).send(tiempo);
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

    // Confirma las entradas de merma a Molino
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

    // Confirma la entrada de piezas mal pigmentadas (incidencia)
    app.patch(
      "/incidencias-mal-pigmentado/:id/confirmar-molino",
      {
        schema: {
          params: incidenciaParamsSchema,
          body: confirmarIncidenciaMolinoBodySchema,
          response: { 200: incidenciaResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const incidencia = await confirmarIncidenciaMolino(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(incidencia);
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

    // Lista todas las solicitudes de material, sin importar de quienes sean
    app.get(
      "/solicitudes-material",
      {
        schema: {
          querystring: listarSolicitudesMaterialQuerySchema,
          response: { 200: listaSolicitudMaterialResponseSchema },
        },
      },
      async (request, reply) => {
        return reply.send(await listarTodasSolicitudesMaterial(request.query));
      }
    );

    // Confirma los kG sobrantes de un avance
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

    // Confirmar salida de material solicitado
    app.patch(
      "/solicitudes-material/:id/confirmar",
      {
        schema: {
          params: solicitudMaterialParamsSchema,
          response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          await confirmarSolicitudMaterial(BigInt(request.params.id), request.authUser!, request.ip);
          return reply.send({ ok: true });
      } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
        throw err;
    }
    }
    );

    // Resuelve la incidencia de material mal pigmentado
    app.patch(
      "/incidencias-mal-pigmentado/:id/resolver",
      {
        schema: {
          params: incidenciaParamsSchema,
          body: resolverIncidenciaBodySchema,
          response: { 200: incidenciaResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          const incidencia = await resolverIncidencia(
            BigInt(request.params.id),
            request.body,
            request.authUser!,
            request.ip
          );
          return reply.send(incidencia);
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

  });
}