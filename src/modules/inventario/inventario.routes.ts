import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarInventarioMateriaPrima,
  listarInventarioPigmento,
  listarInventarioProducto,
  listarInventarioMolido,
  listarInventarioMaterialPigmentado,
  registrarEntradaProveedor,
  registrarAjusteManual,
  consultarHistorial,
  registrarSalidaProducto,
} from "./inventario.service.js";
import {
  entradaProveedorBodySchema,
  ajusteManualBodySchema,
  historialQuerySchema,
  listaInventarioMateriaPrimaResponseSchema,
  listaInventarioPigmentoResponseSchema,
  listaInventarioProductoResponseSchema,
  listaInventarioMolidoResponseSchema,
  listaInventarioMaterialPigmentadoResponseSchema,
  listaMovimientosResponseSchema,
  okResponseSchema,
  errorResponseSchema,
  salidaProductoBodySchema,
} from "./inventario.schema.js";
import { manejarErrorConocido } from "../../shared/errors/error-map.js";

export default async function inventarioRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  
  // --- LECTURAS: ADMIN, PIGMENTOS y PROGRAMADOR
  app.register(async function lecturaRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN", "PIGMENTOS", "PROGRAMADOR"]));

    // ---------- LISTADOS ----------

    app.get(
      "/inventario/materias-primas",
      { schema: { response: { 200: listaInventarioMateriaPrimaResponseSchema } } },
      async (request, reply) => {
        return reply.send(await listarInventarioMateriaPrima());
      }
    );

    app.get(
      "/inventario/pigmentos",
      { schema: { response: { 200: listaInventarioPigmentoResponseSchema } } },
      async (request, reply) => {
        return reply.send(await listarInventarioPigmento());
      }
    );

    app.get(
      "/inventario/productos",
      { schema: { response: { 200: listaInventarioProductoResponseSchema } } },
      async (request, reply) => {
        return reply.send(await listarInventarioProducto());
      }
    );

    app.get(
      "/inventario/molido",
      { schema: { response: { 200: listaInventarioMolidoResponseSchema } } },
      async (request, reply) => {
        return reply.send(await listarInventarioMolido());
      }
    );

    app.get(
      "/inventario/material-pigmentado",
      { schema: { response: { 200: listaInventarioMaterialPigmentadoResponseSchema } } },
      async (request, reply) => {
        return reply.send(await listarInventarioMaterialPigmentado());
      }
    );
  })

  // --- HISTORIAL, ENTRADA y AJUSTES: ADMIN y PIGMENTOS
  app.register(async function lecturaRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
    app.addHook("preHandler", app.authorize(["ADMIN", "PIGMENTOS"]));

    // ---------- HISTORIAL ----------
    app.get(
      "/inventario/movimientos",
      {
        schema: {
          querystring: historialQuerySchema,
          response: { 200: listaMovimientosResponseSchema },
        },
      },
      async (request, reply) => {
        return reply.send(await consultarHistorial(request.query));
      }
    );

    // ---------- ENTRADA DE PROVEEDOR ----------
    app.post(
      "/inventario/entrada-proveedor",
      {
        schema: {
          body: entradaProveedorBodySchema,
          response: {
            200: okResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          await registrarEntradaProveedor(request.body, request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );

    // ---------- AJUSTE MANUAL ----------
    app.post(
      "/inventario/ajuste-manual",
      {
        schema: {
          body: ajusteManualBodySchema,
          response: {
            200: okResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          await registrarAjusteManual(request.body, request.authUser!, request.ip);
          return reply.send({ ok: true });
        } catch (err) {
          if (manejarErrorConocido(err, reply)) return;
          throw err;
        }
      }
    );
  })
  
  //  --- SALIDA DE PRODUCTOS: ADMIN y PROGRAMADOR
  app.register(async function programadorRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>){
    app.addHook("preHandler", app.authorize(["ADMIN", "PROGRAMADOR"]));
    
    // ---------- SALIDA DE PRODUCTOS ----------
    app.post(
    "/inventario/salida-producto",
    {
      schema: {
        body: salidaProductoBodySchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        await registrarSalidaProducto(request.body, request.authUser!, request.ip);
        return reply.send({ ok: true });
      } catch (err) {
        if (manejarErrorConocido(err, reply)) return;
        throw err;
      }
    }
    );
  })
}