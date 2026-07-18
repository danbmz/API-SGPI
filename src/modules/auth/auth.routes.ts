import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  verificarCredenciales,
  generarAccessToken,
  generarRefreshToken,
  rotarRefreshToken,
  revocarRefreshToken,
} from "./auth.service.js";
import { loginBodySchema, loginResponseSchema, errorResponseSchema, okResponseSchema } from "./auth.schema.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const ACCESS_COOKIE_NAME = "accessToken";
const esProduccion = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS_BASE = {
  httpOnly: true,
  secure: esProduccion,       // true en producción (HTTPS), false en desarrollo local (HTTP)
  sameSite: esProduccion ? ("none" as const) : ("lax" as const),
  path: "/",
};

export default async function authRoutes(app: FastifyInstance<any, any, any, any, TypeBoxTypeProvider>) {
  // ---------- LOGIN ----------
  app.post(
    "/auth/login",
    {
      schema: {
        body: loginBodySchema,
        response: { 
            200: loginResponseSchema,
            401: errorResponseSchema 
        },
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      // request.body ya viene tipado como LoginBody automáticamente, sin "as"
      const { usuario, password } = request.body;

      const usuarioEncontrado = await verificarCredenciales(usuario, password);

      if (!usuarioEncontrado) {
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }

      const accessToken = generarAccessToken(app, usuarioEncontrado);
      const { token: refreshToken, expiraEn } = await generarRefreshToken(usuarioEncontrado.id, {
        userAgent: request.headers["user-agent"],
        ip: request.ip,
      });

      reply
        .setCookie(ACCESS_COOKIE_NAME, accessToken, {
          ...COOKIE_OPTIONS_BASE,
          maxAge: 15 * 60, // 15 minutos, en segundos
        })
        .setCookie(REFRESH_COOKIE_NAME, refreshToken, {
          ...COOKIE_OPTIONS_BASE,
          expires: expiraEn,
        });

      return reply.send({
        usuario: {
          id: usuarioEncontrado.id.toString(),
          nombre: usuarioEncontrado.nombre,
          role: usuarioEncontrado.role,
        },
      });
    }
  );

  // ---------- REFRESH ----------
  app.post("/auth/refresh", 
    {
      schema: {
        response: { 
            200: okResponseSchema,
            401: errorResponseSchema,
         },
      },
    },
    async (request, reply) => {
        const tokenActual = request.cookies[REFRESH_COOKIE_NAME];

        if (!tokenActual) {
        return reply.code(401).send({ error: "No hay sesión activa" });
        }

        const resultado = await rotarRefreshToken(tokenActual, {
            userAgent: request.headers["user-agent"],
            ip: request.ip,
        });

        if (!resultado) {
            // El refresh token no era válido — limpiamos cookies por seguridad
            reply.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
            reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
            return reply.code(401).send({ error: "Sesión expirada, inicia sesión de nuevo" });
        }

        const { usuario, refreshToken } = resultado;
        const nuevoAccessToken = generarAccessToken(app, usuario);

        reply
        .setCookie(ACCESS_COOKIE_NAME, nuevoAccessToken, {
            ...COOKIE_OPTIONS_BASE,
            maxAge: 15 * 60,
        })
        .setCookie(REFRESH_COOKIE_NAME, refreshToken.token, {
            ...COOKIE_OPTIONS_BASE,
            expires: refreshToken.expiraEn,
        });

        return reply.send({ ok: true });
    });

  // ---------- LOGOUT ----------
  app.post("/auth/logout",
    {
        schema: {
            response: { 200: okResponseSchema },
        }
    }, 
    async (request, reply) => {
        const tokenActual = request.cookies[REFRESH_COOKIE_NAME];

        if (tokenActual) {
            await revocarRefreshToken(tokenActual);
        }

        reply.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
        reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });

        return reply.send({ ok: true });
  });

  app.get(
    "/auth/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id, role } = request.authUser!;
      return reply.send({
        id: id.toString(), // BigInt no serializa directo, recuerda convertir a string
        role,
      });
    }
  );
}