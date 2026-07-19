import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  desactivarUsuario,
  cambiarPassword,
  reactivarUsuario,
} from "./usuario.service.js";
import {
  crearUsuarioBodySchema,
  editarUsuarioBodySchema,
  cambiarPasswordBodySchema,
  usuarioParamsSchema,
  usuarioResponseSchema,
  listaUsuariosResponseSchema,
  okResponseSchema,
  errorResponseSchema,
} from "./usuario.schema.js";

export default async function usuarioRoutes(
  app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>
) {
  // Todas las rutas de este módulo son exclusivas de ADMIN
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  // ---------- Listar ----------
  app.get(
    "/usuarios",
    { schema: { response: { 200: listaUsuariosResponseSchema } } },
    async (request, reply) => {
      const usuarios = await listarUsuarios();
      return reply.send(usuarios);
    }
  );

  // ---------- Crear ----------
  app.post(
    "/usuarios",
    {
      schema: {
        body: crearUsuarioBodySchema,
        response: { 201: usuarioResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const usuario = await crearUsuario(request.body, request.authUser!, request.ip);
        return reply.code(201).send(usuario);
      } catch (err) {
        if (err instanceof Error && err.message === "USUARIO_YA_EXISTE") {
          return reply.code(409).send({ error: "Ese nombre de usuario ya está en uso" });
        }
        throw err; // cualquier otro error, que lo maneje el error handler global
      }
    }
  );

  // ---------- Editar ----------
  app.patch(
    "/usuarios/:id",
    {
      schema: {
        params: usuarioParamsSchema,
        body: editarUsuarioBodySchema,
        response: { 200: usuarioResponseSchema, 404: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const usuario = await editarUsuario(BigInt(request.params.id), request.body, request.authUser!, request.ip);
        return reply.send(usuario);
      } catch (err) {
        if (err instanceof Error && err.message === "USUARIO_NO_ENCONTRADO") {
          return reply.code(404).send({ error: "Usuario no encontrado" });
        }
        throw err;
      }
    }
  );

  // ---------- Desactivar ----------
  app.delete(
    "/usuarios/:id",
    {
      schema: {
        params: usuarioParamsSchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema},
      },
    },
    async (request, reply) => {
      try {
        await desactivarUsuario(BigInt(request.params.id), request.authUser!, request.ip);
        return reply.send({ ok: true });
      } catch (err) {
        if (err instanceof Error && err.message === "USUARIO_NO_ENCONTRADO") {
          return reply.code(404).send({ error: "Usuario no encontrado" });
        }
        if (err instanceof Error && err.message === "USUARIO_YA_INACTIVO") {
          return reply.code(409).send({ error: "El usuario ya está desactivado" });
        }
        throw err;
      }
    }
  );

  // ---------- Reactivar ----------
  app.patch(
    "/usuarios/:id/reactivar",
    {
      schema: {
        params: usuarioParamsSchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        await reactivarUsuario(BigInt(request.params.id), request.authUser!, request.ip);
        return reply.send({ ok: true });
      } catch (err) {
        if (err instanceof Error && err.message === "USUARIO_NO_ENCONTRADO") {
          return reply.code(404).send({ error: "Usuario no encontrado" });
        }
        if (err instanceof Error && err.message === "USUARIO_YA_ACTIVO") {
          return reply.code(409).send({error: "El usuario ya está activo"})
        }
        throw err;
      }
    }
  );

  // ---------- Cambiar contraseña ----------
  app.patch(
    "/usuarios/:id/password",
    {
      schema: {
        params: usuarioParamsSchema,
        body: cambiarPasswordBodySchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        await cambiarPassword(BigInt(request.params.id), request.body.password, request.authUser!, request.ip);
        return reply.send({ ok: true });
      } catch (err) {
        if (err instanceof Error && err.message === "USUARIO_NO_ENCONTRADO") {
          return reply.code(404).send({ error: "Usuario no encontrado" });
        }
        throw err;
      }
    }
  );
}